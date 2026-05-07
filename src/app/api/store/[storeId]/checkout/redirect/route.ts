/**
 * GET /api/store/[storeId]/checkout/redirect
 *
 * Intermediate redirect handler after Xendit payment.
 * Xendit sends the buyer here (success or failure).
 * We look up the store slug and redirect to the storefront success/pending page.
 *
 * Query params:
 *  - order  : order_number (e.g. STO-20260507-ABC12)
 *  - status : "success" | "failed"
 */
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const STOREFRONT_BASE =
  process.env.NEXT_PUBLIC_STOREFRONT_BASE_URL ?? "https://storefront.storo.id";

export async function GET(
  request: Request,
  context: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await context.params;
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("order") ?? "";
  const status = url.searchParams.get("status") ?? "success";
  const paymentUrl = url.searchParams.get("payment_url") ?? "";

  const supabase = await createSupabaseServiceClient();
  const { data: store } = await supabase
    .from("stores")
    .select("slug")
    .eq("id", storeId)
    .single();

  const slug = store?.slug ?? storeId;

  if (status === "success") {
    const redirectUrl = `${STOREFRONT_BASE}/store/${slug}/checkout/success?order=${encodeURIComponent(orderNumber)}`;
    return NextResponse.redirect(redirectUrl);
  }

  // failed / pending
  const pendingParams = new URLSearchParams({ order: orderNumber });
  if (paymentUrl) pendingParams.set("payment_url", paymentUrl);
  const redirectUrl = `${STOREFRONT_BASE}/store/${slug}/checkout/pending?${pendingParams.toString()}`;
  return NextResponse.redirect(redirectUrl);
}
