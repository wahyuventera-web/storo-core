import { LogIn } from "lucide-react";

type Props = {
  next?: string;
  draft?: string;
  label?: string;
  className?: string;
};

export function SsoLoginButton({ next, draft, label, className }: Props) {
  const href = new URL("/auth/sso/login", "http://placeholder");
  if (next) href.searchParams.set("next", next);
  if (draft) href.searchParams.set("draft", draft);
  const hrefStr = `/auth/sso/login${href.search}`;

  // Plain anchor (not next/link) so the browser does a top-level navigation.
  // next/link triggers an RSC fetch which then follows the 302 to
  // sso.ventera.ai as a CORS request and is blocked by the IdP.
  return (
    <a
      href={hrefStr}
      className={
        className ??
        "w-full inline-flex items-center justify-center gap-3 rounded-lg h-11 bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer"
      }
    >
      <LogIn className="w-4 h-4" />
      {label ?? "Lanjutkan dengan Ventera SSO"}
    </a>
  );
}
