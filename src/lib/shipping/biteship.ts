const BITESHIP_BASE_URL = "https://api.biteship.com";

// ---------- Request / Response types ----------

export interface BiteshipRateItem {
  name: string;
  weight: number; // grams
  quantity: number;
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
  value: number; // price in IDR (for insurance)
}

export interface BiteshipRateRequest {
  origin_postal_code: string | number;
  destination_postal_code: string | number;
  couriers: string; // comma-separated, e.g. "jne,sicepat,anteraja"
  items: BiteshipRateItem[];
}

export interface BiteshipCourierRate {
  courier_name: string;
  courier_code: string; // mapped from API field "company"
  courier_service_name: string;
  courier_service_code: string;
  description: string;
  duration: string; // e.g. "2 - 3 days"
  price: number;
  type: string;
}

// Raw shape returned by Biteship API (field names differ from our interface)
interface BiteshipRawPricing {
  company: string; // = courier_code
  courier_name: string;
  courier_service_name: string;
  courier_service_code: string;
  duration: string;
  price: number;
  shipping_fee?: number;
  type?: string;
  available_for_cash_on_delivery?: boolean;
  available_for_insurance?: boolean;
}

interface BiteshipRateApiResponse {
  success: boolean;
  pricing?: BiteshipRawPricing[];
  error?: string;
  code?: number;
}

// ---------- Order types ----------

export interface BiteshipOrderItem {
  name: string;
  value: number; // price in IDR
  quantity: number;
  weight: number; // grams
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
}

export interface BiteshipCreateOrderRequest {
  // Origin (pickup)
  origin_contact_name: string;
  origin_contact_phone: string;
  origin_address: string;
  origin_postal_code: string | number;
  // Destination
  destination_contact_name: string;
  destination_contact_phone: string;
  destination_address: string;
  destination_postal_code: string | number;
  // Courier & delivery
  courier_company: string; // e.g. "jne"
  courier_type: string; // e.g. "reg" — the service code
  delivery_type: "now" | "scheduled";
  delivery_date?: string; // YYYY-MM-DD (for scheduled)
  delivery_time?: string; // HH:mm (for scheduled)
  // Items
  items: BiteshipOrderItem[];
  // Optional
  order_note?: string;
  reference_id?: string; // our order_number for cross-reference
  metadata?: Record<string, unknown>;
}

export interface BiteshipCreateOrderResponse {
  success: boolean;
  id: string; // Biteship order ID
  status: string;
  courier: {
    waybill_id: string;
    tracking_id: string;
    company: string;
    type: string;
  };
  price: number;
  error?: string;
  code?: number;
}

export interface BiteshipTrackingHistory {
  status: string;
  note: string;
  updated_at: string;
}

export interface BiteshipTrackingResponse {
  success: boolean;
  waybill_id: string;
  status: string;
  history: BiteshipTrackingHistory[];
  link?: string;
}

// ---------- API helpers ----------

function biteshipHeaders(apiKey: string): HeadersInit {
  return {
    // Biteship uses the API key directly — no "Bearer" prefix
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

function mapPricing(raw: BiteshipRawPricing): BiteshipCourierRate {
  return {
    courier_name: raw.courier_name,
    courier_code: raw.company, // API returns "company", we use "courier_code"
    courier_service_name: raw.courier_service_name,
    courier_service_code: raw.courier_service_code,
    description: raw.courier_service_name, // Biteship doesn't return a separate description
    duration: raw.duration,
    price: raw.price ?? raw.shipping_fee ?? 0,
    type: raw.type ?? "regular",
  };
}

function getMockRates(): BiteshipCourierRate[] {
  return [
    {
      courier_name: "JNE",
      courier_code: "jne",
      courier_service_name: "REG",
      courier_service_code: "reg",
      description: "Reguler",
      duration: "2 - 3 hari",
      price: 15000,
      type: "regular",
    },
    {
      courier_name: "SiCepat",
      courier_code: "sicepat",
      courier_service_name: "REG",
      courier_service_code: "reg",
      description: "Reguler",
      duration: "2 - 3 hari",
      price: 12000,
      type: "regular",
    },
    {
      courier_name: "AnterAja",
      courier_code: "anteraja",
      courier_service_name: "REG",
      courier_service_code: "reg",
      description: "Reguler",
      duration: "3 - 4 hari",
      price: 10000,
      type: "regular",
    },
  ];
}

/**
 * Fetch shipping rates from Biteship.
 * Falls back to mock rates when apiKey is not provided.
 */
export async function getRates(
  request: BiteshipRateRequest,
  apiKey?: string
): Promise<BiteshipCourierRate[]> {
  const key = apiKey ?? process.env.BITESHIP_API_KEY;
  if (!key) {
    console.warn("[biteship] BITESHIP_API_KEY not set, returning mock rates");
    return getMockRates();
  }

  try {
    const response = await fetch(`${BITESHIP_BASE_URL}/v1/rates/couriers`, {
      method: "POST",
      headers: biteshipHeaders(key),
      body: JSON.stringify(request),
    });

    const data: BiteshipRateApiResponse = await response.json();

    if (!data.success) {
      console.error(`[biteship] getRates error [${data.code}]: ${data.error}`);
      return getMockRates();
    }

    return (data.pricing ?? []).map(mapPricing);
  } catch (error) {
    console.error("[biteship] getRates unexpected error:", error);
    return getMockRates();
  }
}

export type CreateOrderResult =
  | { ok: true; data: BiteshipCreateOrderResponse }
  | { ok: false; error: string; code?: number };

/**
 * Create a shipping order on Biteship.
 */
export async function createOrder(
  request: BiteshipCreateOrderRequest,
  apiKey?: string
): Promise<CreateOrderResult> {
  const key = apiKey ?? process.env.BITESHIP_API_KEY;
  if (!key) {
    console.warn("[biteship] BITESHIP_API_KEY not set, returning mock order");
    return {
      ok: true,
      data: {
        success: true,
        id: `mock-${Date.now()}`,
        status: "confirmed",
        courier: {
          waybill_id: `MOCK-AWB-${Date.now()}`,
          tracking_id: `mock-track-${Date.now()}`,
          company: request.courier_company,
          type: request.courier_type,
        },
        price: 0,
      },
    };
  }

  try {
    const response = await fetch(`${BITESHIP_BASE_URL}/v1/orders`, {
      method: "POST",
      headers: biteshipHeaders(key),
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!data.success) {
      const errorMsg = data.error ?? `HTTP ${response.status}`;
      console.error(
        `[biteship] createOrder error [${data.code}]: ${errorMsg}`
      );
      return { ok: false, error: errorMsg, code: data.code };
    }

    return { ok: true, data: data as BiteshipCreateOrderResponse };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[biteship] createOrder unexpected error:", errorMsg);
    return { ok: false, error: errorMsg };
  }
}

/**
 * Track a shipment by Biteship tracking_id.
 */
export async function trackShipment(
  trackingId: string,
  apiKey?: string
): Promise<BiteshipTrackingResponse | null> {
  const key = apiKey ?? process.env.BITESHIP_API_KEY;
  if (!key) return null;

  try {
    const response = await fetch(
      `${BITESHIP_BASE_URL}/v1/trackings/${trackingId}`,
      { method: "GET", headers: biteshipHeaders(key) }
    );

    const data: BiteshipTrackingResponse & {
      success: boolean;
      error?: string;
    } = await response.json();

    if (!data.success) {
      console.error(`[biteship] trackShipment error: ${data.error}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[biteship] trackShipment unexpected error:", error);
    return null;
  }
}
