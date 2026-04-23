import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-callback-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify Xendit callback token
    const callbackToken = req.headers.get("x-callback-token");
    const expectedToken = Deno.env.get("XENDIT_CALLBACK_VERIFICATION_TOKEN");

    if (!expectedToken) {
      console.error("XENDIT_CALLBACK_VERIFICATION_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (callbackToken !== expectedToken) {
      console.error("Invalid callback token");
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = await req.json();
    console.log("Xendit webhook:", JSON.stringify(payload));

    const {
      id: xenditInvoiceId,
      external_id: externalId,
      status: xenditStatus,
      paid_at: paidAt,
      payment_method: paymentMethod,
      payment_channel: paymentChannel,
      paid_amount: paidAmount,
    } = payload;

    if (!xenditInvoiceId) {
      return new Response(JSON.stringify({ error: "Missing invoice ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Strategy 1: provider_ref
    let invoice: Record<string, unknown> | null = null;

    const { data: byRef } = await supabase
      .from("invoices").select("*").eq("provider_ref", xenditInvoiceId).maybeSingle();
    if (byRef) { invoice = byRef; console.log("Found via provider_ref"); }

    // Strategy 2: external_id → extract UUID (prefix: storo-)
    if (!invoice && externalId?.startsWith("storo-")) {
      const invoiceId = externalId.replace("storo-", "");
      const { data: byId } = await supabase
        .from("invoices").select("*").eq("id", invoiceId).maybeSingle();
      if (byId) { invoice = byId; console.log("Found via external_id->id"); }
    }

    // Strategy 3: metadata.xendit_invoice_id
    if (!invoice) {
      const { data: byMeta } = await supabase
        .from("invoices").select("*")
        .filter("metadata->>xendit_invoice_id", "eq", xenditInvoiceId).maybeSingle();
      if (byMeta) { invoice = byMeta; console.log("Found via metadata"); }
    }

    if (!invoice) {
      console.error("Invoice not found:", xenditInvoiceId, externalId);
      // Return 200 so Xendit doesn't retry endlessly
      return new Response(JSON.stringify({ error: "Invoice not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map Xendit status → Storo status
    let internalStatus: string;
    switch (xenditStatus) {
      case "PAID":
      case "SETTLED":
        internalStatus = "paid";
        break;
      case "EXPIRED":
        internalStatus = "overdue";
        break;
      case "PENDING":
        internalStatus = "unpaid";
        break;
      default:
        internalStatus = "cancelled";
    }

    // Skip if status unchanged (idempotency)
    if (invoice.status === internalStatus) {
      return new Response(JSON.stringify({ success: true, message: "Status unchanged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const existingMeta = (typeof invoice.metadata === "object" && invoice.metadata !== null)
      ? invoice.metadata as Record<string, unknown>
      : {};

    const updateData: Record<string, unknown> = {
      status: internalStatus,
      provider: "xendit",
      provider_ref: invoice.provider_ref || xenditInvoiceId,
      metadata: {
        ...existingMeta,
        xendit_invoice_id: xenditInvoiceId,
        xendit_external_id: externalId,
        xendit_status: xenditStatus,
        xendit_payment_method: paymentMethod || null,
        xendit_payment_channel: paymentChannel || null,
        xendit_paid_amount: paidAmount || null,
        webhook_received_at: new Date().toISOString(),
      },
    };

    if (internalStatus === "paid" && paidAt) {
      updateData.paid_at = paidAt;
    }

    const { error: updateError } = await supabase
      .from("invoices").update(updateData).eq("id", invoice.id);

    if (updateError) throw new Error(`Failed to update invoice: ${updateError.message}`);

    console.log("Invoice updated:", invoice.id, "->", internalStatus);

    // If paid: create a notification for the client
    if (internalStatus === "paid" && invoice.client_id) {
      await supabase.from("client_notifications").insert({
        client_id: invoice.client_id,
        title: "Pembayaran Diterima ✅",
        message: `Pembayaran Anda via ${paymentMethod || "Xendit"} telah dikonfirmasi. Tim kami akan segera memproses.`,
        type: "success",
        link: `/dashboard/billing/${invoice.id}`,
      }).catch((e: unknown) => console.warn("Notification insert failed:", e));
    }

    return new Response(
      JSON.stringify({ success: true, invoice_id: invoice.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } } // 200 so Xendit doesn't retry
    );
  }
});
