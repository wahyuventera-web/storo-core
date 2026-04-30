import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { verifyAutoLoginToken } from "@/lib/auth/auto-login-token";

export const dynamic = "force-dynamic";

// Halaman pasca-pembayaran Xendit. User pasti baru daftar di /onboarding,
// jadi kalau dia kembali tanpa session aktif (mis. bayar via QR di HP),
// kita auto-login berdasarkan HMAC token yang ditandatangani saat checkout.
//
// Flow:
//   1. Cek session — kalau ada, langsung redirect ke /dashboard.
//   2. Validasi token dari ?t=…  → kalau valid, lookup email user dari
//      invoice → generate magic link via admin → verifyOtp(token_hash) di
//      sini (SSR) supaya cookie session di-set di response, lalu redirect.
//   3. Token invalid / lookup gagal → fallback ke /sign-in manual.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoice_id");
  const token = searchParams.get("t");

  // Origin asli (di belakang Apache/Cloudflare, request.url pakai socket lokal).
  const firstValue = (h: string | null) => h?.split(",")[0].trim() || null;
  const forwardedHost = firstValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstValue(request.headers.get("x-forwarded-proto"));
  const host = forwardedHost || request.headers.get("host") || "storo.id";
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // Response default → /dashboard. Kalau verifyOtp jalan, setAll callback
  // di SSR client akan attach Set-Cookie ke object ini sebelum kita return.
  const response = NextResponse.redirect(`${origin}/dashboard`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Sudah login → langsung dashboard.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return response;
  }

  // 2. Belum login. Coba auto-login pakai HMAC token.
  if (invoiceId && verifyAutoLoginToken(invoiceId, token)) {
    const admin = createSupabaseAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: invoiceRow } = await admin
      .from("invoices")
      .select("clients(user_id)")
      .eq("id", invoiceId)
      .single();

    const userId = (invoiceRow as { clients?: { user_id?: string } } | null)?.clients?.user_id;
    if (userId) {
      const { data: userRes } = await admin.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (email) {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        const tokenHash = linkData?.properties?.hashed_token;
        if (tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: tokenHash,
          });
          if (!verifyErr) {
            // Cookie sudah di-set via setAll callback di response.
            return response;
          }
          console.error("[payment/success] verifyOtp failed:", verifyErr);
        }
      }
    }
  }

  // 3. Fallback — token invalid / lookup gagal. Kirim ke sign-in.
  return NextResponse.redirect(`${origin}/sign-in?redirectTo=/dashboard`);
}
