import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { deductOpsFeeForOrder } from "@/lib/wallet/deduct-ops-fee";

export const dynamic = "force-dynamic";

/**
 * Xendit callback for buyer order payments.
 * external_id format: STORO-ORD-{orderId}
 *
 * Token verification (dual-mode):
 *   1. XENDIT_WEBHOOK_TOKEN — VenteraAI platform token (storo_gateway orders)
 *   2. stores.settings.payment.xendit_callback_token — per-store token (own_prepaid orders)
 *
 * Other external_id prefixes are acknowledged without processing:
 *   STORO-INV-*    → handled by storo-payment-confirm edge function
 *   STORO-WALLET-* → handled by /api/webhooks/xendit-wallet
 *
 * Register in Xendit dashboard:
 *   https://www.storo.id/api/webhooks/xendit
 */
export async function POST(request: NextRequest) {
  let body: {
    external_id?: string;
    status?: string;
    amount?: number;
    id?: string;
    paid_at?: string;
    payment_method?: string;
    payment_channel?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { external_id, status, id: invoiceId, paid_at, payment_method } = body;

  // Only handle STORO-ORD-* — pass through everything else silently
  if (!external_id?.startsWith("STORO-ORD-")) {
    return NextResponse.json({ received: true });
  }

  const orderId = external_id.replace("STORO-ORD-", "");
  if (!orderId || orderId.length < 10) {
    console.error("[xendit-order] Invalid external_id:", external_id);
    return NextResponse.json({ received: true });
  }

  const supabase = await createSupabaseServiceClient();

  // Fetch order first — needed for store-specific token fallback
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, store_id, customer_id, total, status, customer_name, customer_email, order_number"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    console.warn("[xendit-order] Order not found:", orderId);
    return NextResponse.json({ received: true });
  }

  // ── Token verification ──────────────────────────────────────────────────────
  const token = request.headers.get("x-callback-token");
  const platformToken = process.env.XENDIT_WEBHOOK_TOKEN;
  let tokenValid = !!platformToken && token === platformToken;

  if (!tokenValid) {
    const { data: storeRow } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", order.store_id)
      .single();

    const paymentSettings = (
      (storeRow?.settings as Record<string, unknown> | null)?.payment as
        | Record<string, unknown>
        | undefined
    );
    const storeToken = paymentSettings?.xendit_callback_token as string | undefined;

    if (storeToken && token === storeToken) tokenValid = true;
  }

  if (!tokenValid) {
    console.warn("[xendit-order] Invalid token for order:", order.order_number);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Idempotency ─────────────────────────────────────────────────────────────
  if (["paid", "shipped", "delivered"].includes(order.status)) {
    return NextResponse.json({ received: true, skipped: "already processed" });
  }

  // ── Handle PAID / SETTLED ───────────────────────────────────────────────────
  if (status === "PAID" || status === "SETTLED") {
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
        payment_method: payment_method ?? null,
        payment_reference: invoiceId ?? null,
        paid_at: paid_at ?? new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateErr) {
      console.error("[xendit-order] Order update failed:", updateErr);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    // Update customer lifetime stats
    if (order.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("total_orders, total_spent")
        .eq("id", order.customer_id)
        .single();

      if (customer) {
        await supabase
          .from("customers")
          .update({
            total_orders: (customer.total_orders ?? 0) + 1,
            total_spent: (customer.total_spent ?? 0) + order.total,
          })
          .eq("id", order.customer_id);
      }
    }

    // Fetch billing_model for ops fee check
    const { data: store } = await supabase
      .from("stores")
      .select("billing_model")
      .eq("id", order.store_id)
      .single();

    // Deduct 1% ops fee from wallet (storo_gateway only)
    if (store?.billing_model === "storo_gateway") {
      try {
        await deductOpsFeeForOrder(order.store_id, order.total, order.id);
      } catch (err) {
        // Non-fatal — ops fee reconciliation cron will catch discrepancies
        console.warn("[xendit-order] Ops fee deduction failed:", err);
      }
    }

    // In-app notification for store dashboard bell
    try {
      const idr = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(order.total);

      await supabase.from("store_notifications").insert({
        store_id: order.store_id,
        type: "order_paid",
        title: `Pesanan baru: ${order.order_number}`,
        body: `${order.customer_name ?? "Pembeli"} — ${idr}`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          total: order.total,
        },
      });
    } catch (err) {
      console.warn("[xendit-order] Notification insert failed:", err);
    }

    console.log("[xendit-order] Order paid:", order.order_number);

  // ── Handle EXPIRED ──────────────────────────────────────────────────────────
  } else if (status === "EXPIRED") {
    await supabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "unpaid",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Restore stock for each item
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, variant_id, quantity")
      .eq("order_id", order.id);

    if (orderItems) {
      for (const item of orderItems) {
        if (item.variant_id) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("id", item.variant_id)
            .single();
          if (variant) {
            await supabase
              .from("product_variants")
              .update({ stock: variant.stock + item.quantity })
              .eq("id", item.variant_id);
          }
        } else if (item.product_id) {
          const { data: product } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();
          if (product) {
            await supabase
              .from("products")
              .update({ stock: product.stock + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }
    }

    console.log("[xendit-order] Order expired:", order.order_number);
  }

  return NextResponse.json({ received: true });
}
