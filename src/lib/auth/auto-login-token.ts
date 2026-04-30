import crypto from "node:crypto";

// Secret yang dipakai untuk sign HMAC. Pakai SUPABASE_SERVICE_ROLE_KEY karena
// pasti tersedia di server, sensitif (tidak pernah di-expose ke client), dan
// stabil — kalau di-rotate, token-token lama otomatis invalid (expected).
function getSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return s;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari — Xendit invoice expiry biasanya 24 jam, kasih buffer.

export function signAutoLoginToken(invoiceId: string, now: number = Date.now()): string {
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(`${invoiceId}.${now}`)
    .digest("hex");
  return `${now}.${sig}`;
}

export function verifyAutoLoginToken(invoiceId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const tsStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  if (Date.now() - ts > TTL_MS) return false;

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(`${invoiceId}.${ts}`)
    .digest("hex");

  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
