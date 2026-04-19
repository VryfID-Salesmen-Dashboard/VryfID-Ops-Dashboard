import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listReps } from "@/lib/db/reps";
import { GeneratePayoutDialog, PayoutsTable } from "./payouts-client";
import type { PayoutRow } from "@/types/database";

export default async function PayoutsPage() {
  const [{ data, error }, reps] = await Promise.all([
    getSupabaseAdmin()
      .from("payouts")
      .select("*")
      .order("payout_date", { ascending: false })
      .limit(100),
    listReps(),
  ]);

  if (error) throw error;
  const payouts = (data ?? []) as PayoutRow[];

  const totalGross = payouts.reduce((s, p) => s + Number(p.gross_total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">Payouts</h2>
          <p className="text-sm text-neutral-500">
            {payouts.length} payout{payouts.length !== 1 ? "s" : ""}
            {" · "}
            ${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2 })} total
          </p>
        </div>
        <GeneratePayoutDialog />
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No payouts yet. Approve commissions first, then generate a payout.
        </div>
      ) : (
        <PayoutsTable payouts={payouts} reps={reps} />
      )}
    </div>
  );
}
