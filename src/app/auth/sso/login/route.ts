import { type NextRequest, NextResponse } from "next/server";
import * as client from "openid-client";
import {
  APP_ORIGIN,
  getOidcConfig,
  SSO_REDIRECT_URI,
  SSO_SCOPES,
  isSsoConfigured,
} from "@/lib/sso/config";
import { signStateCookie, SSO_STATE_COOKIE } from "@/lib/sso/state-cookie";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function GET(req: NextRequest) {
  // Defense-in-depth: refuse to start the OAuth dance for non-top-level
  // navigations. If a <Link> (or browser/extension speculation) prefetches
  // this route, the resulting 302 to sso.ventera.ai/oidc/auth is followed by
  // the browser as a fetch — triggering a CORS preflight that the IdP can't
  // (and by OIDC spec shouldn't) answer. Returning 204 here keeps the
  // preflight from ever happening. Real login clicks use plain anchors which
  // do a top-level navigation and never set these signals.
  const isRscPrefetch =
    req.headers.get("rsc") === "1" ||
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("sec-purpose")?.includes("prefetch") ||
    req.nextUrl.searchParams.has("_rsc");
  if (isRscPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isSsoConfigured()) {
    const url = new URL("/sign-in", APP_ORIGIN);
    url.searchParams.set("error", "sso_not_configured");
    return NextResponse.redirect(url);
  }

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const draftId = req.nextUrl.searchParams.get("draft") ?? undefined;

  let config;
  try {
    config = await getOidcConfig();
  } catch (e) {
    const url = new URL("/sign-in", APP_ORIGIN);
    url.searchParams.set("error", "sso_discovery_failed");
    url.searchParams.set("reason", String(e).slice(0, 200));
    return NextResponse.redirect(url);
  }

  const state = client.randomState();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);

  const authUrl = client.buildAuthorizationUrl(config, {
    redirect_uri: SSO_REDIRECT_URI,
    scope: SSO_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const res = NextResponse.redirect(authUrl.href);
  res.cookies.set(
    SSO_STATE_COOKIE,
    signStateCookie({ state, codeVerifier, next, draftId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    },
  );
  return res;
}
