export const dynamic = "force-dynamic";

import { Mail } from "lucide-react";
import { requireUserAndClient, getUserStores } from "@/lib/store/context";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  StorePageHeader,
  StoreCard,
  EmptyState,
  formatDate,
} from "@/components/dashboard/store/ui";
import StoreBadge from "@/components/dashboard/account/StoreBadge";

export default async function AccountLeadsPage() {
  const { client } = await requireUserAndClient();
  const stores = await getUserStores(client.id);
  const storeIds = stores.map((s) => s.id);
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const supabase = await createSupabaseServiceClient();
  const { data } = storeIds.length
    ? await supabase
        .from("leads")
        .select("id, store_id, email, name, phone, source, metadata, created_at")
        .in("store_id", storeIds)
        .order("created_at", { ascending: false })
        .limit(300)
    : { data: [] as Array<{ id: string; store_id: string; email: string; name?: string | null; phone?: string | null; source?: string | null; metadata?: unknown; created_at: string }> };

  const items = data ?? [];

  return (
    <div>
      <StorePageHeader
        title="Leads"
        description={
          items.length > 0
            ? `${items.length} leads dari ${storeIds.length} toko`
            : "Daftar lead dari berbagai sumber, semua toko Anda."
        }
      />
      {items.length === 0 ? (
        <StoreCard padded={false}>
          <EmptyState
            icon={Mail}
            title="Belum ada lead"
            description="Lead akan muncul saat ada yang berlangganan newsletter atau mengisi form lead di toko Anda."
          />
        </StoreCard>
      ) : (
        <StoreCard padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FC] border-b border-[#F1F4FA]">
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Telepon</th>
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Toko</th>
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Sumber</th>
                  <th className="px-4 py-3 text-left font-medium text-[#64748B]">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((l) => {
                  const store = storeById.get(l.store_id as string);
                  return (
                    <tr
                      key={l.id as string}
                      className="border-b border-[#F1F4FA] hover:bg-[#F8F9FC] transition"
                    >
                      <td className="px-4 py-3 text-[#0F172A] font-medium">{l.email as string}</td>
                      <td className="px-4 py-3 text-[#64748B]">{l.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B]">{l.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        {store ? (
                          <StoreBadge
                            storeId={store.id}
                            name={store.name}
                            slug={store.slug}
                          />
                        ) : (
                          <span className="text-[#94A3B8] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#64748B] text-xs">{l.source ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B] text-xs">
                        {formatDate(l.created_at as string)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </StoreCard>
      )}
    </div>
  );
}
