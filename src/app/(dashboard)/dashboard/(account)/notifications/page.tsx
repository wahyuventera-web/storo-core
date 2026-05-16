export const dynamic = "force-dynamic";

import { Bell } from "lucide-react";
import { requireUserAndClient, getUserStores } from "@/lib/store/context";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  StorePageHeader,
  StoreCard,
  EmptyState,
  StatusBadge,
  formatDate,
} from "@/components/dashboard/store/ui";
import NotificationActions from "@/components/dashboard/store/notifications/NotificationActions";
import StoreBadge from "@/components/dashboard/account/StoreBadge";

export default async function AccountNotificationsPage() {
  const { client } = await requireUserAndClient();
  const stores = await getUserStores(client.id);
  const storeIds = stores.map((s) => s.id);
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const supabase = await createSupabaseServiceClient();
  const { data } = storeIds.length
    ? await supabase
        .from("notifications")
        .select("id, store_id, type, title, message, link, is_read, created_at")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as Array<{ id: string; store_id: string; type?: string | null; title: string; message?: string | null; link?: string | null; is_read: boolean; created_at: string }> };

  const items = data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div>
      <StorePageHeader
        title="Notifikasi"
        description={
          items.length > 0
            ? `${unread} belum dibaca dari ${items.length} (semua toko)`
            : "Notifikasi sistem & event dari semua toko Anda."
        }
      />
      {items.length === 0 ? (
        <StoreCard padded={false}>
          <EmptyState
            icon={Bell}
            title="Belum ada notifikasi"
            description="Notifikasi akan muncul saat ada event baru di toko Anda."
          />
        </StoreCard>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const store = storeById.get(n.store_id as string);
            return (
              <StoreCard
                key={n.id as string}
                className={n.is_read ? "" : "border-primary/40 bg-primary/5"}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`size-9 rounded-xl grid place-items-center shrink-0 ${
                      n.is_read ? "bg-slate-100 text-slate-500" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Bell className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#0F172A]">{n.title as string}</p>
                      {store ? (
                        <StoreBadge
                          storeId={store.id}
                          name={store.name}
                          slug={store.slug}
                        />
                      ) : null}
                      {!n.is_read ? <StatusBadge tone="info">Baru</StatusBadge> : null}
                    </div>
                    {n.message ? (
                      <p className="text-sm text-[#64748B] mt-1">{n.message as string}</p>
                    ) : null}
                    <p className="text-[11px] text-[#94A3B8] mt-1.5">
                      {formatDate(n.created_at as string)}
                    </p>
                  </div>
                  {!n.is_read && store ? (
                    <NotificationActions
                      storeId={store.id}
                      mode="single"
                      id={n.id as string}
                    />
                  ) : null}
                </div>
              </StoreCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
