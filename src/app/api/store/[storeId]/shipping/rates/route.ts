/**
 * POST /api/store/[storeId]/shipping/rates
 *
 * Public endpoint — no auth required (called by buyer during checkout).
 * Fetches shipping rates from Biteship for the given store and destination.
 * Origin postal code is read from stores.settings.shipping.origin_postal_code.
 */
import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getRates } from "@/lib/shipping/biteship";
import type { BiteshipRateItem } from "@/lib/shipping/biteship";

interface ShippingRatesBody {
  destination_postal_code: string | number;
  items: BiteshipRateItem[];
  couriers?: string; // comma-separated, defaults to common Indonesian couriers
}

export async function POST(
  request: Request,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const body = (await request.json()) as ShippingRatesBody;

    if (!body.destination_postal_code) {
      return NextResponse.json(
        { error: "destination_postal_code is required" },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }

    // Fetch store settings to get origin postal code (server-side, not trusting client)
    const supabase = await createSupabaseServiceClient();
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, settings, is_active")
      .eq("id", storeId)
      .eq("is_active", true)
      .single();

    if (storeErr || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const settings =
      typeof store.settings === "object" && store.settings !== null
        ? (store.settings as Record<string, unknown>)
        : {};
    const shippingOrigin =
      typeof settings.shipping === "object" && settings.shipping !== null
        ? (settings.shipping as Record<string, unknown>)
        : {};

    const originPostalCode =
      typeof shippingOrigin.origin_postal_code === "string"
        ? shippingOrigin.origin_postal_code
        : typeof shippingOrigin.origin_postal_code === "number"
        ? String(shippingOrigin.origin_postal_code)
        : null;

    if (!originPostalCode) {
      // If no origin configured, return mock rates (store not fully set up)
      console.warn(
        `[shipping/rates] store ${storeId} has no origin_postal_code configured`
      );
      const mockRates = await getRates({
        origin_postal_code: "10110",
        destination_postal_code: body.destination_postal_code,
        couriers:
          body.couriers ??
          "jne,sicepat,anteraja,jnt,pos,tiki,wahana,lion,ninja,idexpress",
        items: body.items,
      });
      return NextResponse.json({ data: mockRates });
    }

    // Determine couriers: use store's allowed_couriers config, or client-supplied, or default
    const allowedCouriers = Array.isArray(shippingOrigin.allowed_couriers)
      ? (shippingOrigin.allowed_couriers as string[]).join(",")
      : null;

    const couriers =
      body.couriers ??
      allowedCouriers ??
      "jne,sicepat,anteraja,jnt,pos,tiki,wahana,lion,ninja,idexpress";

    const rates = await getRates({
      origin_postal_code: originPostalCode,
      destination_postal_code: body.destination_postal_code,
      couriers,
      items: body.items,
    });

    return NextResponse.json({ data: rates });
  } catch (error) {
    console.error("[shipping/rates] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
