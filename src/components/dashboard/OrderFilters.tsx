"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Store, Filter } from "lucide-react";

const ORDER_STATUSES = [
  { value: "", label: "Semua Status" },
  { value: "pending", label: "Menunggu" },
  { value: "awaiting_payment", label: "Menunggu Pembayaran" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "shipped", label: "Dikirim" },
  { value: "delivered", label: "Terkirim" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Dikembalikan" },
];

interface Props {
  stores: { store_id: string; name: string }[];
  currentStore?: string;
  currentStatus?: string;
}

export default function OrderFilters({ stores, currentStore, currentStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <Store className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={currentStore ?? ""}
          onChange={(e) => setParam("store", e.target.value)}
          className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
        >
          <option value="">Semua Toko</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <select
          value={currentStatus ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
