"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, ShoppingCart, Check } from "lucide-react";

type StoreNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function NotificationBell({ storeId }: { storeId: string }) {
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/${storeId}/notifications`);
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } catch {
      // silent — bell should not crash sidebar
    }
  }, [storeId]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await fetch(`/api/store/${storeId}/notifications/mark-all`, { method: "POST" });
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await fetch(`/api/store/${storeId}/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
    } catch {
      // optimistic update already applied; refetch on next poll
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifikasi"
        onClick={() => setOpen((v) => !v)}
        className="relative size-9 rounded-full hover:bg-[#EEF2FA] grid place-items-center transition cursor-pointer"
      >
        <Bell className="size-4 text-[#64748B]" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 size-4 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-[#E5E8EF] bg-white shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E8EF] sticky top-0 bg-white">
            <span className="text-sm font-semibold text-[#0F172A]">Notifikasi</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <Check className="size-3" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List */}
          <ul className="flex-1">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                Tidak ada notifikasi
              </li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F8FAFC] transition cursor-pointer border-b border-[#F1F5F9] last:border-0 ${
                      n.is_read ? "opacity-60" : ""
                    }`}
                  >
                    <span className="mt-0.5 size-7 rounded-full bg-[#EEF2FA] grid place-items-center shrink-0">
                      {n.type === "order_paid" ? (
                        <ShoppingCart className="size-3.5 text-primary" />
                      ) : (
                        <Bell className="size-3.5 text-[#64748B]" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-[#0F172A] truncate">
                        {n.title}
                      </span>
                      <span className="block text-xs text-[#64748B] line-clamp-2 mt-0.5">
                        {n.body}
                      </span>
                      <span className="block text-[10px] text-[#94A3B8] mt-1">
                        {relativeTime(n.created_at)}
                      </span>
                    </span>
                    {!n.is_read && (
                      <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
