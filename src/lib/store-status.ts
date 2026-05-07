import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from "lucide-react";

export type StatusKey = "pending" | "reviewing" | "in_progress" | "live" | "rejected";

export type StatusConfig = {
  label: string;
  color: string;
  icon: LucideIcon;
  spin: boolean;
  description: string;
  eta: string;
};

export const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  pending: {
    label: "Menunggu Konfirmasi",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
    spin: false,
    description: "Data onboarding Anda sudah kami terima. Tim kami akan segera menghubungi Anda.",
    eta: "Estimasi review: 1-2 jam kerja",
  },
  reviewing: {
    label: "Sedang Direview",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Loader2,
    spin: true,
    description: "Tim VenteraAI sedang memeriksa data toko & produk Anda dari Shopee.",
    eta: "Estimasi: 1-2 hari kerja",
  },
  in_progress: {
    label: "Dalam Proses Setup",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Loader2,
    spin: true,
    description: "Engineer kami sedang menyiapkan toko, template, & import produk Anda.",
    eta: "Estimasi: 2-3 hari kerja",
  },
  live: {
    label: "Toko Aktif",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    spin: false,
    description: "Toko Anda sudah aktif & siap menerima pesanan!",
    eta: "",
  },
  rejected: {
    label: "Perlu Perbaikan Data",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertCircle,
    spin: false,
    description: "Ada data yang perlu diperbaiki. Silakan hubungi tim kami.",
    eta: "",
  },
};

export const PROGRESS_STEPS = ["pending", "reviewing", "in_progress", "live"] as const;

export function getStepIndex(status: string): number {
  if (status === "rejected") return 1;
  const idx = PROGRESS_STEPS.indexOf(status as (typeof PROGRESS_STEPS)[number]);
  return idx === -1 ? 0 : idx;
}
