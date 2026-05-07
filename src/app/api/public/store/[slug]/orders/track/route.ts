import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  let body: { order_number?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orderNumber = body.order_number?.trim();
  const email = body.email?.trim();

  if (!orderNumber || !email) {
    return NextResponse.json(
      { error: "order_number dan email wajib diisi" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServiceClient();

  // Resolve slug → store_id
  const { data: store, error: storeErr } = await supabase
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (storeErr || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, subtotal, discount_amount, shipping_cost, total, shipping_method, shipping_tracking_number, paid_at, shipped_at, delivered_at, cancelled_at, created_at"
    )
    .eq("store_id", store.id)
    .eq("order_number", orderNumber.toUpperCase())
    .ilike("customer_email", email)
    .maybeSingle();

  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 400 });
  }
  if (!order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan" },
      { status: 404 }
    );
  }

  const { data: orderItems } = await supabase
    .from("order_items")
    .select("id, name, price, quantity, subtotal, image_url")
    .eq("order_id", order.id);

  return NextResponse.json({ data: { ...order, items: orderItems ?? [] } });
}
