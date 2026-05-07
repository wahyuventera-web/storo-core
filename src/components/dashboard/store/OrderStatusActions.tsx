"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";

interface OrderStatusActionsProps {
  storeId: string;
  orderId: string;
  currentStatus: string;
  currentTracking: string | null;
  currentCourier: string | null;
}

export default function OrderStatusActions({
  storeId,
  orderId,
  currentStatus,
  currentTracking,
  currentCourier,
}: OrderStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shipping form state — shown when "Tandai Dikirim" is clicked
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(currentTracking ?? "");
  const [courier, setCourier] = useState(currentCourier ?? "");

  const isTerminal = currentStatus === "delivered" || currentStatus === "cancelled";
  if (isTerminal) return null;

  async function patch(body: Record<string, string>) {
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/store/${storeId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Gagal memperbarui pesanan.");
      }
      setSuccessMsg("Pesanan berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess() {
    await patch({ status: "processing" });
  }

  async function handleShipSubmit() {
    await patch({
      status: "shipped",
      ...(trackingNumber.trim() ? { shipping_tracking_number: trackingNumber.trim() } : {}),
      ...(courier.trim() ? { shipping_courier: courier.trim() } : {}),
    });
    setShowShippingForm(false);
  }

  async function handleDeliver() {
    await patch({ status: "delivered" });
  }

  async function handleCancel() {
    const confirmed = window.confirm("Batalkan pesanan ini?");
    if (!confirmed) return;
    await patch({ status: "cancelled" });
  }

  const btnBase =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const btnPrimary = `${btnBase} bg-[#4169df] text-white hover:bg-[#3558c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4169df]/50`;
  const btnDanger = `${btnBase} bg-white border border-red-400 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50`;
  const btnSecondary = `${btnBase} bg-white border border-[#E5E8EF] text-[#0F172A] hover:bg-[#F1F4FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4169df]/30`;

  return (
    <div className="mt-4 space-y-3">
      {/* Feedback messages */}
      {successMsg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* paid → processing or cancel */}
        {currentStatus === "paid" && (
          <>
            <button
              className={btnPrimary}
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Proses Pesanan
            </button>
            <button
              className={btnDanger}
              onClick={handleCancel}
              disabled={loading}
            >
              Batalkan
            </button>
          </>
        )}

        {/* processing → shipped or cancel */}
        {currentStatus === "processing" && (
          <>
            <button
              className={btnPrimary}
              onClick={() => setShowShippingForm((v) => !v)}
              disabled={loading}
            >
              <Truck className="size-4" />
              Tandai Dikirim
            </button>
            <button
              className={btnDanger}
              onClick={handleCancel}
              disabled={loading}
            >
              Batalkan
            </button>
          </>
        )}

        {/* shipped → delivered */}
        {currentStatus === "shipped" && (
          <button
            className={btnPrimary}
            onClick={handleDeliver}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Tandai Selesai
          </button>
        )}

        {/* awaiting_payment → cancel only */}
        {currentStatus === "awaiting_payment" && (
          <button
            className={btnDanger}
            onClick={handleCancel}
            disabled={loading}
          >
            Batalkan
          </button>
        )}
      </div>

      {/* Inline shipping form (shown when processing → shipped) */}
      {showShippingForm && currentStatus === "processing" && (
        <div className="border border-[#E5E8EF] rounded-xl p-4 bg-[#F8FAFC] space-y-3">
          <p className="text-sm font-medium text-[#0F172A]">
            Info Pengiriman
          </p>
          <div className="space-y-2">
            <div>
              <label
                htmlFor="osa-courier"
                className="block text-xs text-[#64748B] mb-1"
              >
                Kurir
              </label>
              <input
                id="osa-courier"
                type="text"
                placeholder="cth. JNE, J&T, SiCepat"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full rounded-lg border border-[#E5E8EF] px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4169df]/40"
              />
            </div>
            <div>
              <label
                htmlFor="osa-tracking"
                className="block text-xs text-[#64748B] mb-1"
              >
                Nomor Resi
              </label>
              <input
                id="osa-tracking"
                type="text"
                placeholder="cth. JNE1234567890"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full rounded-lg border border-[#E5E8EF] px-3 py-2 text-sm font-mono text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4169df]/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={btnPrimary}
              onClick={handleShipSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Konfirmasi Kirim
            </button>
            <button
              className={btnSecondary}
              onClick={() => setShowShippingForm(false)}
              disabled={loading}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
