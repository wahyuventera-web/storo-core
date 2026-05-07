/**
 * POST /api/store/[storeId]/promos/validate
 *
 * Public endpoint — no auth required (called by buyer during checkout).
 * Validates a promo code against a store and returns discount info.
 */
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

interface ValidateBody {
  code: string;
  subtotal: number;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const body = (await request.json()) as ValidateBody;

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }
    if (typeof body.subtotal !== "number" || body.subtotal < 0) {
      return NextResponse.json(
        { error: "subtotal must be a non-negative number" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServiceClient();

    const { data: promo, error: promoErr } = await supabase
      .from("store_promos")
      .select(
        "id, code, type, value, max_discount, min_purchase, start_date, end_date, usage_limit, used_count, is_active, scope, target_ids"
      )
      .eq("store_id", storeId)
      .eq("code", body.code.trim().toUpperCase())
      .maybeSingle();

    if (promoErr) {
      return NextResponse.json(
        { error: "Failed to validate promo" },
        { status: 500 }
      );
    }

    if (!promo || !promo.is_active) {
      return NextResponse.json(
        { valid: false, message: "Kode promo tidak valid atau tidak aktif" },
        { status: 200 }
      );
    }

    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) {
      return NextResponse.json(
        { valid: false, message: "Kode promo belum aktif" },
        { status: 200 }
      );
    }
    if (promo.end_date && new Date(promo.end_date) < now) {
      return NextResponse.json(
        { valid: false, message: "Kode promo sudah kadaluarsa" },
        { status: 200 }
      );
    }
    if (
      promo.usage_limit !== null &&
      promo.used_count >= promo.usage_limit
    ) {
      return NextResponse.json(
        { valid: false, message: "Kode promo sudah habis digunakan" },
        { status: 200 }
      );
    }
    if (promo.min_purchase !== null && body.subtotal < promo.min_purchase) {
      return NextResponse.json(
        {
          valid: false,
          message: `Minimum pembelian Rp ${Number(promo.min_purchase).toLocaleString("id-ID")} untuk menggunakan kode ini`,
        },
        { status: 200 }
      );
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promo.type === "percentage") {
      discountAmount = (body.subtotal * Number(promo.value)) / 100;
      if (promo.max_discount !== null) {
        discountAmount = Math.min(discountAmount, Number(promo.max_discount));
      }
    } else if (promo.type === "fixed") {
      discountAmount = Number(promo.value);
    }
    // free_shipping type returns discountAmount = 0 (handled at order level)

    return NextResponse.json({
      valid: true,
      promo_id: promo.id,
      code: promo.code,
      type: promo.type,
      value: Number(promo.value),
      max_discount: promo.max_discount ? Number(promo.max_discount) : null,
      discount_amount: Math.round(discountAmount),
      scope: promo.scope ?? "store",
      target_ids: Array.isArray(promo.target_ids) ? promo.target_ids : [],
    });
  } catch (error) {
    console.error("[promos/validate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
