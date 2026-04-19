import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listReps } from "@/lib/db/reps";
import { CalculateBonusDialog, BonusesTable } from "./bonuses-client";
import type { QuarterlyBonusRow } from "@/types/database";

export default async function BonusesPage() {
  const [{ data, error }, reps] = await Promise.all([
    getSupabaseAdmin()
      .from("quarterly_bonuses")
      .select("*")
      .order("quarter", { ascending: false }),
    listReps(),
  ]);

  if (error) throw error;
  const bonuses = (data ?? []) as QuarterlyBonusRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">
            Quarterly bonuses
          </h2>
          <p className="text-sm text-neutral-500">
            Calculate, review, and approve quarterly performance bonuses.
          </p>
        </div>
        <CalculateBonusDialog />
      </div>

      {bonuses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No bonus calculations yet. Click &ldquo;Calculate bonuses&rdquo; to
          run the quarterly calculation.
        </div>
      ) : (
        <BonusesTable bonuses={bonuses} reps={reps} />
      )}
    </div>
  );
}
