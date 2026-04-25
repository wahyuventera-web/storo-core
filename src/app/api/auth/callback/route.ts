import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const popup = searchParams.get("popup");

  // Di belakang Apache reverse proxy, request.url pakai socket lokal Next.js
  // (localhost:3000) bukan host asli. Construct origin dari forwarded headers.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost || request.headers.get("host") || "storo.id";
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (popup === "true") {
        // Try postMessage + close; fallback redirect after 500ms
        return new NextResponse(
          `<!DOCTYPE html><html><body><script>
            (function() {
              var sent = false;
              if (window.opener) {
                try {
                  window.opener.postMessage({ type: "AUTH_COMPLETE" }, window.location.origin);
                  sent = true;
                  window.close();
                } catch(e) {}
              }
              // If close didn't work or no opener, redirect back
              setTimeout(function() {
                window.location.href = "/onboarding?step=5";
              }, sent ? 500 : 0);
            })();
          </script><p>Login berhasil. Mengalihkan...</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (popup === "true") {
    return new NextResponse(
      `<!DOCTYPE html><html><body><script>
        if (window.opener) {
          try {
            window.opener.postMessage({ type: "AUTH_FAILED" }, window.location.origin);
            window.close();
          } catch(e) {}
        }
        setTimeout(function() {
          window.location.href = "/onboarding?step=4";
        }, 300);
      </script><p>Login gagal. Mengalihkan...</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Fallback — redirect to sign-in on error
  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
