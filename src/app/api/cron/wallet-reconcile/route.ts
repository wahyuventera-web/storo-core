import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron: nightly wallet reconciliation (runs at 01:00 WIB = 18:00 UTC).
 * Schedule defined in vercel.json.
 *
 * For each store_wallet:
 * 1. Compare cached balance vs SUM(wallet_transactions.amount)
 * 2. Log discrepancies → wallet_reconciliation_log
 * 3. Auto-fix: correct balance + recalculate status
 * 4. Auto-fix: if status=suspended but balance > threshold → set active
 */
export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServiceClient();

  // Fetch all wallets
  const { data: wallets, error: walletsErr } = await supabase
    .from("store_wallets")
    .select("id, store_id, balance, low_balance_threshold, status");

  if (walletsErr) {
    console.error("[wallet-reconcile] Failed to fetch wallets:", walletsErr.message);
    return NextResponse.json({ error: walletsErr.message }, { status: 500 });
  }

  type DiscrepancyDetail = {
    store_id: string;
    cached: number;
    computed: number;
    diff: number;
    auto_fixed: boolean;
    status_fixed: boolean;
  };

  let discrepancies = 0;
  let autoFixed = 0;
  const details: DiscrepancyDetail[] = [];

  for (const wallet of wallets ?? []) {
    // Compute true balance from ledger
    const { data: aggData } = await supabase
      .from("wallet_transactions")
      .select("amount.sum()")
      .eq("store_id", wallet.store_id)
      .single();

    const computed: number = (aggData as { sum: number } | null)?.sum ?? 0;
    const cached: number = wallet.balance;
    const diff = cached - computed;

    let fixed = false;
    let statusFixed = false;

    if (diff !== 0) {
      discrepancies++;

      // Auto-fix: overwrite cached balance with ledger truth
      const correctStatus = computeStatus(computed, wallet.low_balance_threshold);
      await supabase
        .from("store_wallets")
        .update({ balance: computed, status: correctStatus, updated_at: new Date().toISOString() })
        .eq("store_id", wallet.store_id);

      fixed = true;
      autoFixed++;
      if (correctStatus !== wallet.status) statusFixed = true;

      details.push({
        store_id: wallet.store_id,
        cached,
        computed,
        diff,
        auto_fixed: fixed,
        status_fixed: statusFixed,
      });

      console.warn(
        `[wallet-reconcile] Discrepancy store=${wallet.store_id} cached=${cached} computed=${computed} diff=${diff} → fixed`
      );
    } else {
      // No balance discrepancy — still check if status is wrong
      const correctStatus = computeStatus(cached, wallet.low_balance_threshold);
      if (correctStatus !== wallet.status) {
        await supabase
          .from("store_wallets")
          .update({ status: correctStatus, updated_at: new Date().toISOString() })
          .eq("store_id", wallet.store_id);

        autoFixed++;
        statusFixed = true;
        details.push({
          store_id: wallet.store_id,
          cached,
          computed,
          diff: 0,
          auto_fixed: false,
          status_fixed: true,
        });
      }
    }
  }

  // Log run result
  await supabase.from("wallet_reconciliation_log").insert({
    total_stores: wallets?.length ?? 0,
    discrepancies,
    auto_fixed: autoFixed,
    details,
  });

  console.log(
    `[wallet-reconcile] Done. stores=${wallets?.length} discrepancies=${discrepancies} fixed=${autoFixed}`
  );

  return NextResponse.json({
    ok: true,
    total_stores: wallets?.length ?? 0,
    discrepancies,
    auto_fixed: autoFixed,
  });
}

function computeStatus(
  balance: number,
  threshold: number
): "active" | "warning" | "suspended" {
  if (balance <= 0) return "suspended";
  if (balance < threshold) return "warning";
  return "active";
}
