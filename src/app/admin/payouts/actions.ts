"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listReps } from "@/lib/db/reps";
import { getCurrentRole } from "@/lib/auth/roles";
import type { ActionResult } from "@/app/admin/reps/actions";
import type { CommissionEventRow, QuarterlyBonusRow } from "@/types/database";

const GenerateSchema = z.object({
  periodLabel: z.string().min(1, "Period label is required"),
  payoutDate: z.string().min(1, "Payout date is required"),
});

export async function generatePayoutsAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = GenerateSchema.safeParse({
    periodLabel: formData.get("periodLabel"),
    payoutDate: formData.get("payoutDate"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { periodLabel, payoutDate } = parsed.data;

  try {
    const reps = await listReps();
    const db = getSupabaseAdmin();

    const { data: approvedCommissions, error: commErr } = await db
      .from("commission_events")
      .select("*")
      .eq("status", "approved");

    if (commErr) throw commErr;
    const commissions = (approvedCommissions ?? []) as CommissionEventRow[];

    const { data: approvedBonuses, error: bonusErr } = await db
      .from("quarterly_bonuses")
      .select("*")
      .eq("status", "approved");

    if (bonusErr) throw bonusErr;
    const bonuses = (approvedBonuses ?? []) as QuarterlyBonusRow[];

    const payouts = reps
      .filter((r) => r.status === "active")
      .map((rep) => {
        const repCommissions = commissions.filter(
          (c) => c.sales_rep_id === rep.id,
        );
        const repBonuses = bonuses.filter((b) => b.sales_rep_id === rep.id);

        const subTotal = repCommissions
          .filter((c) => c.event_type === "subscription")
          .reduce((s, c) => s + Number(c.commission_amount), 0);

        const verifTotal = repCommissions
          .filter((c) => c.event_type === "verification")
          .reduce((s, c) => s + Number(c.commission_amount), 0);

        const bonusTotal = repBonuses.reduce(
          (s, b) => s + Number(b.total_bonus),
          0,
        );

        const gross = subTotal + verifTotal + bonusTotal;

        return {
          sales_rep_id: rep.id,
          payout_date: payoutDate,
          period_label: periodLabel,
          subscription_total: subTotal.toFixed(2),
          verification_total: verifTotal.toFixed(2),
          bonus_total: bonusTotal.toFixed(2),
          gross_total: gross.toFixed(2),
          status: "pending",
        };
      })
      .filter((p) => Number(p.gross_total) > 0);

    if (payouts.length === 0) {
      return {
        success: false,
        error: "No approved commissions or bonuses to pay out",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (db as any)
      .from("payouts")
      .insert(payouts);
    if (insertErr) throw insertErr;

    // Mark the included commissions as paid
    const paidRepIds = payouts.map((p) => p.sales_rep_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("commission_events")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .in("sales_rep_id", paidRepIds)
      .eq("status", "approved");

    // Mark included bonuses as paid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("quarterly_bonuses")
      .update({ status: "paid" })
      .in("sales_rep_id", paidRepIds)
      .eq("status", "approved");

    revalidatePath("/admin/payouts");
    revalidatePath("/admin/commissions");
    revalidatePath("/admin/bonuses");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate payouts";
    return { success: false, error: msg };
  }
}

export async function markPayoutPaidAction(
  payoutId: string,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("payouts")
    .update({ status: "paid" })
    .eq("id", payoutId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/payouts");
  return { success: true };
}
