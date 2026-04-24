import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getPlan, formatIDR } from "@/lib/plans";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  try {
    // Verify authenticated user via cookie session
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Anda harus login terlebih dahulu." }, { status: 401 });
    }

    const body = await request.json();
    const { storeName, plan: planId, domainType, subdomain, customDomain, ownDomain } = body;

    if (!storeName?.trim()) {
      return NextResponse.json({ error: "Nama toko wajib diisi." }, { status: 400 });
    }
    if (!planId?.trim()) {
      return NextResponse.json({ error: "Pilih paket terlebih dahulu." }, { status: 400 });
    }

    const plan = getPlan(planId);
    if (!plan || plan.setup === null) {
      return NextResponse.json(
        { error: "Paket tidak valid. Untuk paket Custom, silakan hubungi tim kami." },
        { status: 400 }
      );
    }

    if (!domainType) {
      return NextResponse.json({ error: "Konfigurasi domain wajib diisi." }, { status: 400 });
    }
    if (domainType === "subdomain" && (!subdomain || subdomain.length < 3)) {
      return NextResponse.json({ error: "Subdomain minimal 3 karakter." }, { status: 400 });
    }
    if (domainType === "custom" && !customDomain) {
      return NextResponse.json({ error: "Pilih domain terlebih dahulu." }, { status: 400 });
    }
    if (domainType === "own" && (!ownDomain || !ownDomain.includes("."))) {
      return NextResponse.json({ error: "Masukkan domain yang valid." }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch existing client record for this user
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name")
      .eq("user_id", user.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: "Data profil tidak ditemukan. Silakan lengkapi profil Anda terlebih dahulu." },
        { status: 404 }
      );
    }

    const requestedSlug =
      domainType === "subdomain"
        ? subdomain.trim()
        : slugify(storeName.trim());

    const resolvedCustomDomain =
      domainType === "custom"
        ? customDomain.trim()
        : domainType === "own"
        ? ownDomain.trim()
        : null;

    // Create onboarding request
    const { error: requestError } = await supabase
      .from("onboarding_requests")
      .insert({
        client_id: client.id,
        plan: planId,
        template_name: "modern",
        requested_slug: requestedSlug,
        custom_domain: resolvedCustomDomain,
        status: "pending",
      });

    if (requestError) {
      console.error("[add-store] Onboarding request error:", requestError);
      return NextResponse.json({ error: "Gagal membuat permintaan toko. Coba lagi." }, { status: 500 });
    }

    // Create invoice
    const description = `Setup Webstore Storo.id — Paket ${plan.name}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        client_id: client.id,
        type: "setup",
        description,
        amount: plan.setup,
        status: "unpaid",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        provider: "xendit",
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      console.error("[add-store] Invoice insert error:", invoiceError);
      return NextResponse.json({ error: "Gagal membuat invoice. Coba lagi." }, { status: 500 });
    }

    // Call Xendit via edge function
    const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://storo.id";
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const edgeFnUrl = `${SUPABASE_URL}/functions/v1/storo-billing-invoice`;

    try {
      const edgeFnRes = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          description,
          customer: {
            given_names: client.full_name ?? storeName.trim(),
            email: user.email,
          },
          success_redirect_url: `${APP_URL}/payment/success?invoice_id=${invoice.id}`,
          failure_redirect_url: `${APP_URL}/payment/failed?invoice_id=${invoice.id}`,
        }),
      });

      if (!edgeFnRes.ok) {
        const errBody = await edgeFnRes.text();
        console.error("[add-store] Edge function error:", edgeFnRes.status, errBody);

        await supabase.from("invoices").update({ provider: "manual" }).eq("id", invoice.id);

        return NextResponse.json({
          invoiceId: invoice.id,
          xenditInvoiceUrl: null,
          error: "Pembayaran online gagal diproses. Anda bisa bayar manual dari dashboard.",
        });
      }

      const edgeResult = await edgeFnRes.json();

      return NextResponse.json({
        invoiceId: invoice.id,
        xenditInvoiceUrl: edgeResult.invoice_url,
      });
    } catch (edgeErr) {
      console.error("[add-store] Edge function call failed:", edgeErr);

      await supabase.from("invoices").update({ provider: "manual" }).eq("id", invoice.id);

      return NextResponse.json({
        invoiceId: invoice.id,
        xenditInvoiceUrl: null,
        error: "Pembayaran online gagal diproses. Anda bisa bayar manual dari dashboard.",
      });
    }
  } catch (err) {
    console.error("[add-store] Unexpected error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server. Coba lagi." }, { status: 500 });
  }
}
