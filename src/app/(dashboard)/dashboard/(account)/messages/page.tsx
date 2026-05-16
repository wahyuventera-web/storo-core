export const dynamic = "force-dynamic";

import { MessageCircle } from "lucide-react";
import { requireUserAndClient, getUserStores } from "@/lib/store/context";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  StorePageHeader,
  StoreCard,
  EmptyState,
  StatusBadge,
  formatDate,
} from "@/components/dashboard/store/ui";
import StoreBadge from "@/components/dashboard/account/StoreBadge";

export default async function AccountMessagesPage() {
  const { client } = await requireUserAndClient();
  const stores = await getUserStores(client.id);
  const storeIds = stores.map((s) => s.id);
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const supabase = await createSupabaseServiceClient();
  const { data } = storeIds.length
    ? await supabase
        .from("contact_messages")
        .select("id, store_id, name, email, phone, subject, message, status, created_at")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as Array<{ id: string; store_id: string; name: string; email?: string | null; phone?: string | null; subject?: string | null; message: string; status?: string | null; created_at: string }> };

  const items = data ?? [];

  return (
    <div>
      <StorePageHeader
        title="Pesan"
        description={
          items.length > 0
            ? `${items.length} pesan dari ${storeIds.length} toko`
            : "Pesan dari pelanggan via contact form di semua toko Anda."
        }
      />
      {items.length === 0 ? (
        <StoreCard padded={false}>
          <EmptyState
            icon={MessageCircle}
            title="Belum ada pesan"
            description="Pesan akan muncul saat ada yang mengisi contact form di storefront toko Anda."
          />
        </StoreCard>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const store = storeById.get(m.store_id as string);
            return (
              <StoreCard key={m.id as string}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-[#0F172A]">{m.name as string}</p>
                      {store ? (
                        <StoreBadge
                          storeId={store.id}
                          name={store.name}
                          slug={store.slug}
                        />
                      ) : null}
                      {m.status ? (
                        <StatusBadge tone={m.status === "replied" ? "success" : "warning"}>
                          {m.status as string}
                        </StatusBadge>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#64748B]">
                      {[m.email, m.phone].filter(Boolean).join(" • ")} •{" "}
                      {formatDate(m.created_at as string)}
                    </p>
                    {m.subject ? (
                      <p className="text-sm font-medium text-[#0F172A] mt-2">{m.subject as string}</p>
                    ) : null}
                    <p className="text-sm text-[#64748B] mt-1 whitespace-pre-wrap">
                      {m.message as string}
                    </p>
                  </div>
                  <a
                    href={m.email ? `mailto:${m.email}` : "#"}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white border border-[#E5E8EF] text-[#0F172A] hover:bg-[#F8F9FC] transition cursor-pointer"
                  >
                    Balas via Email
                  </a>
                </div>
              </StoreCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
