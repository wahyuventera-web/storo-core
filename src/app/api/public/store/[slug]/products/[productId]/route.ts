import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; productId: string }> }
) {
  const { slug, productId } = await context.params;
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

  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, price, compare_at_price, stock, sku, weight, weight_unit, status, category_id, created_at, product_images(*), product_variants(*)"
    )
    .eq("id", productId)
    .eq("store_id", store.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ data: product }, { headers: CACHE_HEADERS });
}
