/**
 * POST /api/store/[storeId]/checkout
 *
 * Public endpoint — no session needed (guest checkout supported).
 * MVP scope: buyer info, shipping, promo code, order creation, Xendit payment.
 * Skipped for MVP: loyalty points, membership tiers, FOV (first order voucher).
 *
 * Billing model:
 *  - storo_gateway  → call Supabase Edge Function storo-billing-invoice
 *  - own_prepaid    → call Xendit API directly using stores.settings.payment.xendit_secret_key
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CartItem {
  product_id: string;
  variant_id?: string;
  quantity: number;
}

interface ShippingInput {
  courier_code: string;
  courier_service: string;
  courier_service_code?: string;
  cost: number;
}

interface AddressInput {
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  [key: string]: unknown;
}

interface CheckoutBody {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: AddressInput;
  };
  shipping?: ShippingInput;
  promo_code?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `STO-${date}-${suffix}`;
}

function authHeaderXendit(secretKey: string): string {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const body = (await request.json()) as CheckoutBody;
    const { items, customer, shipping, promo_code } = body;

    // ── Input validation ───────────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 }
      );
    }
    if (!customer?.email) {
      return NextResponse.json(
        { error: "customer.email is required" },
        { status: 400 }
      );
    }
    if (!customer?.name) {
      return NextResponse.json(
        { error: "customer.name is required" },
        { status: 400 }
      );
    }

    // Normalize email
    customer.email = customer.email.toLowerCase().trim();

    const supabase = await createSupabaseServiceClient();

    // ── Verify store exists and is active ──────────────────────────────────────
    const { data: storeRow, error: storeErr } = await supabase
      .from("stores")
      .select("id, billing_model, settings, is_active")
      .eq("id", storeId)
      .eq("is_active", true)
      .single();

    if (storeErr || !storeRow) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // ── Validate products & stock ──────────────────────────────────────────────
    const productIds = items.map((i) => i.product_id);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock, status, images, sku")
      .in("id", productIds)
      .eq("store_id", storeId)
      .eq("status", "active");

    if (productsError) {
      console.error("[checkout] Failed to fetch products:", productsError);
      return NextResponse.json(
        { error: "Failed to validate products" },
        { status: 400 }
      );
    }

    const productMap = new Map(
      (products ?? []).map((p) => [p.id, p])
    );

    interface ValidatedItem {
      product_id: string;
      variant_id: string | null;
      quantity: number;
      price: number;
      name: string;
      image_url: string | null;
      sku: string | null;
    }

    const validatedItems: ValidatedItem[] = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          { error: `Produk ${item.product_id} tidak ditemukan atau tidak tersedia` },
          { status: 400 }
        );
      }

      let price: number = product.price;
      let variantName: string | null = null;
      let itemSku: string | null = product.sku ?? null;

      if (item.variant_id) {
        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .select("id, name, price, stock, is_active, sku")
          .eq("id", item.variant_id)
          .eq("product_id", item.product_id)
          .single();

        if (variantError || !variant || !variant.is_active) {
          return NextResponse.json(
            { error: `Varian ${item.variant_id} tidak ditemukan atau tidak tersedia` },
            { status: 400 }
          );
        }
        if (variant.stock < item.quantity) {
          return NextResponse.json(
            { error: `Stok tidak cukup untuk varian "${variant.name}"` },
            { status: 400 }
          );
        }
        price = variant.price;
        variantName = variant.name;
        if (variant.sku) itemSku = variant.sku;
      } else {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Stok tidak cukup untuk "${product.name}"` },
            { status: 400 }
          );
        }
      }

      validatedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        price,
        name: variantName ? `${product.name} - ${variantName}` : product.name,
        image_url:
          Array.isArray(product.images) && product.images.length > 0
            ? (product.images[0] as string)
            : null,
        sku: itemSku,
      });
    }

    // ── Calculate subtotal ─────────────────────────────────────────────────────
    const subtotal = validatedItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const shippingCost = shipping?.cost ?? 0;
    let discountAmount = 0;
    let appliedPromoId: string | null = null;

    // ── Promo code ─────────────────────────────────────────────────────────────
    if (promo_code) {
      const { data: promo } = await supabase
        .from("store_promos")
        .select(
          "id, type, value, max_discount, min_purchase, start_date, end_date, usage_limit, used_count, is_active"
        )
        .eq("store_id", storeId)
        .eq("code", promo_code.trim().toUpperCase())
        .maybeSingle();

      if (promo && promo.is_active) {
        const now = new Date();
        const withinDates =
          (!promo.start_date || new Date(promo.start_date) <= now) &&
          (!promo.end_date || new Date(promo.end_date) >= now);
        const withinUsage =
          promo.usage_limit === null || promo.used_count < promo.usage_limit;
        const meetsMin =
          promo.min_purchase === null || subtotal >= promo.min_purchase;

        if (withinDates && withinUsage && meetsMin) {
          let promoDiscount = 0;
          if (promo.type === "percentage") {
            promoDiscount = (subtotal * Number(promo.value)) / 100;
            if (
              promo.max_discount !== null &&
              promoDiscount > promo.max_discount
            ) {
              promoDiscount = Number(promo.max_discount);
            }
          } else if (promo.type === "fixed") {
            promoDiscount = Number(promo.value);
          }
          discountAmount += promoDiscount;
          appliedPromoId = promo.id;
        }
      }
    }

    // Cap discount at subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    const total = Math.max(0, subtotal + shippingCost - discountAmount);

    // ── Find or create customer ────────────────────────────────────────────────
    let customerId: string | null = null;

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .ilike("email", customer.email)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/phone if provided (upsert-style)
      await supabase
        .from("customers")
        .update({
          name: customer.name ?? undefined,
          phone: customer.phone ?? undefined,
          address: customer.address ?? undefined,
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          store_id: storeId,
          email: customer.email,
          name: customer.name ?? null,
          phone: customer.phone ?? null,
          address: customer.address ?? {},
          metadata: {},
        })
        .select("id")
        .single();

      if (!customerError && newCustomer) {
        customerId = newCustomer.id;
      }
    }

    // ── Create order ───────────────────────────────────────────────────────────
    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        store_id: storeId,
        customer_id: customerId,
        order_number: orderNumber,
        status: "awaiting_payment",
        payment_status: "unpaid",
        subtotal,
        discount_amount: discountAmount,
        shipping_cost: shippingCost,
        tax_amount: 0,
        total,
        currency: "IDR",
        customer_name: customer.name ?? null,
        customer_email: customer.email,
        customer_phone: customer.phone ?? null,
        shipping_address: customer.address ?? {},
        billing_address: {},
        shipping_method: shipping
          ? `${shipping.courier_code} - ${shipping.courier_service}`
          : null,
        notes: null,
        metadata: {
          ...(shipping?.courier_service_code
            ? { courier_type: shipping.courier_service_code }
            : {}),
        },
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("[checkout] Failed to create order:", orderError);
      return NextResponse.json(
        { error: "Gagal membuat pesanan" },
        { status: 500 }
      );
    }

    // ── Create order items ─────────────────────────────────────────────────────
    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      image_url: item.image_url,
      sku: item.sku,
      metadata: {},
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("[checkout] Failed to create order items:", itemsError);
      await supabase
        .from("orders")
        .update({ status: "cancelled", notes: "Failed to create order items" })
        .eq("id", order.id);
      return NextResponse.json(
        { error: "Gagal menyimpan item pesanan" },
        { status: 500 }
      );
    }

    // ── Increment promo used_count ─────────────────────────────────────────────
    if (appliedPromoId) {
      try {
        const rpcResult = await supabase.rpc("increment_promo_used_count", {
          promo_id: appliedPromoId,
        });
        if (rpcResult.error) {
          // Fallback: manual increment
          const { data: promoRow } = await supabase
            .from("store_promos")
            .select("used_count")
            .eq("id", appliedPromoId)
            .single();
          if (promoRow) {
            await supabase
              .from("store_promos")
              .update({ used_count: (promoRow.used_count ?? 0) + 1 })
              .eq("id", appliedPromoId);
          }
        }
      } catch (promoErr) {
        console.error("[checkout] promo used_count increment failed:", promoErr);
        // Non-fatal
      }
    }

    // ── Deduct stock ───────────────────────────────────────────────────────────
    for (const item of validatedItems) {
      if (item.variant_id) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("stock")
          .eq("id", item.variant_id)
          .single();
        if (variant) {
          await supabase
            .from("product_variants")
            .update({ stock: Math.max(0, variant.stock - item.quantity) })
            .eq("id", item.variant_id);
        }
      } else {
        const product = productMap.get(item.product_id);
        if (product) {
          await supabase
            .from("products")
            .update({
              stock: Math.max(0, product.stock - item.quantity),
            })
            .eq("id", item.product_id);
        }
      }
    }

    // ── Resolve payment mode ───────────────────────────────────────────────────
    const billingModel =
      (storeRow.billing_model as "storo_gateway" | "own_prepaid") ??
      "storo_gateway";
    const storeSettings =
      typeof storeRow.settings === "object" && storeRow.settings !== null
        ? (storeRow.settings as Record<string, unknown>)
        : {};
    const paymentSettings =
      typeof storeSettings.payment === "object" &&
      storeSettings.payment !== null
        ? (storeSettings.payment as Record<string, unknown>)
        : {};

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.storo.id";

    let paymentUrl: string;
    let paymentReference: string;
    let paymentProvider: "xendit" | "midtrans" = "xendit";

    try {
      if (billingModel === "storo_gateway") {
        // Platform default: Xendit VenteraAI via storo-billing-invoice Edge Function
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const invoiceRes = await fetch(
          `${supabaseUrl}/functions/v1/storo-billing-invoice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              order_id: order.id,
              description: `Pembayaran Pesanan ${orderNumber}`,
              customer: {
                given_names: customer.name ?? "Customer",
                email: customer.email,
                mobile_number: customer.phone ?? undefined,
              },
              items: validatedItems.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
              })),
              success_redirect_url: `${siteUrl}/api/store/${storeId}/checkout/redirect?order=${orderNumber}&status=success`,
              failure_redirect_url: `${siteUrl}/api/store/${storeId}/checkout/redirect?order=${orderNumber}&status=failed`,
            }),
          }
        );

        const invoiceData = await invoiceRes.json();
        if (!invoiceRes.ok) {
          throw new Error(
            invoiceData?.error ??
              `Invoice function error ${invoiceRes.status}`
          );
        }

        paymentUrl = invoiceData.invoice_url;
        paymentReference = invoiceData.xendit_invoice_id;
      } else {
        // own_prepaid: use store's own Xendit key
        const xenditSecretKey =
          typeof paymentSettings.xendit_secret_key === "string"
            ? paymentSettings.xendit_secret_key
            : null;

        if (!xenditSecretKey) {
          throw new Error(
            "Store payment not configured. Contact store owner."
          );
        }

        // Call Xendit API directly with store's key
        const xenditRes = await fetch(
          "https://api.xendit.co/v2/invoices",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeaderXendit(xenditSecretKey),
            },
            body: JSON.stringify({
              external_id: `STORO-ORD-${order.id}`,
              amount: total,
              payer_email: customer.email,
              description: `Pembayaran Pesanan ${orderNumber}`,
              customer: {
                given_names: customer.name ?? "Customer",
                email: customer.email,
              },
              items: validatedItems.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
              })),
              success_redirect_url: `${siteUrl}/api/store/${storeId}/checkout/redirect?order=${orderNumber}&status=success`,
              failure_redirect_url: `${siteUrl}/api/store/${storeId}/checkout/redirect?order=${orderNumber}&status=failed`,
              currency: "IDR",
            }),
          }
        );

        const xenditData = await xenditRes.json();
        if (!xenditRes.ok) {
          throw new Error(
            `Xendit error ${xenditRes.status}: ${JSON.stringify(xenditData)}`
          );
        }

        paymentUrl = xenditData.invoice_url;
        paymentReference = xenditData.id;
        paymentProvider = "xendit";
      }

      // Store payment reference on order
      await supabase
        .from("orders")
        .update({
          payment_provider: paymentProvider,
          payment_reference: paymentReference,
        })
        .eq("id", order.id);
    } catch (paymentError) {
      console.error("[checkout] Payment gateway failed:", paymentError);

      // Cancel order and restore stock
      await supabase
        .from("orders")
        .update({ status: "cancelled", notes: "Payment gateway error" })
        .eq("id", order.id);

      for (const item of validatedItems) {
        if (item.variant_id) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("stock")
            .eq("id", item.variant_id)
            .single();
          if (variant) {
            await supabase
              .from("product_variants")
              .update({ stock: variant.stock + item.quantity })
              .eq("id", item.variant_id);
          }
        } else {
          const product = productMap.get(item.product_id);
          if (product) {
            await supabase
              .from("products")
              .update({ stock: product.stock + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      return NextResponse.json(
        {
          error:
            "Gagal membuat invoice pembayaran. Silakan coba lagi atau hubungi toko.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        order_id: order.id,
        order_number: orderNumber,
        payment_url: paymentUrl,
        payment_reference: paymentReference,
        provider: paymentProvider,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[checkout] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
