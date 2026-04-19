"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listReps } from "@/lib/db/reps";
import { getCurrentRole } from "@/lib/auth/roles";
import {
  acquisitionBonus,
  volumeBonus,
  retentionBonus,
  MAX_QUARTERLY_BONUS,
  quarterDateRange,
} from "@/lib/bonuses";
import type { ActionResult } from "@/app/admin/reps/actions";
import type { ClientRow, CommissionEventRow } from "@/types/database";

const CalculateSchema = z.object({
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Invalid quarter format"),
});

export async function calculateBonusesAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = CalculateSchema.safeParse({
    quarter: formData.get("quarter"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { quarter } = parsed.data;
  const { start, end } = quarterDateRange(quarter);

  try {
    const db = getSupabaseAdmin();
    const reps = await listReps();

    const { data: allClients, error: cErr } = await db
      .from("clients")
      .select("*");
    if (cErr) throw cErr;
    const clients = (allClients ?? []) as ClientRow[];

    const { data: allEvents, error: eErr } = await db
      .from("commission_events")
      .select("*")
      .eq("event_type", "verification")
      .gte("period_start", start)
      .lte("period_end", end);
    if (eErr) throw eErr;
    const verifEvents = (allEvents ?? []) as CommissionEventRow[];

    const bonusRows = reps
      .filter((r) => r.status === "active")
      .map((rep) => {
        const newClients = clients.filter(
          (c) =>
            c.sales_rep_id === rep.id &&
            c.sign_date >= start &&
            c.sign_date <= end,
        ).length;

        const totalVerifications = verifEvents.filter(
          (e) => e.sales_rep_id === rep.id,
        ).length;

        const repClients = clients.filter(
          (c) => c.sales_rep_id === rep.id && c.sign_date < start,
        );
        let retRate: number | null = null;
        if (repClients.length > 0) {
          const active = repClients.filter(
            (c) => c.status === "active" || (c.churned_date && c.churned_date > end),
          ).length;
          retRate = active / repClients.length;
        }

        const acq = acquisitionBonus(newClients);
        const vol = volumeBonus(totalVerifications);
        const ret = retentionBonus(retRate);
        const total = Math.min(acq + vol + ret, MAX_QUARTERLY_BONUS);

        return {
          sales_rep_id: rep.id,
          quarter,
          new_clients_count: newClients,
          acquisition_bonus: acq.toFixed(2),
          total_verifications: totalVerifications,
          volume_bonus: vol.toFixed(2),
          retention_rate: retRate?.toFixed(4) ?? null,
          retention_bonus: ret.toFixed(2),
          total_bonus: total.toFixed(2),
          status: "calculated",
        };
      });

    // Upsert (delete existing then insert)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .from("quarterly_bonuses")
      .delete()
      .eq("quarter", quarter);

    if (bonusRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertErr } = await (db as any)
        .from("quarterly_bonuses")
        .insert(bonusRows);
      if (insertErr) throw insertErr;
    }

    revalidatePath("/admin/bonuses");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to calculate bonuses";
    return { success: false, error: msg };
  }
}

export async function approveBonusesAction(
  quarter: string,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("quarterly_bonuses")
    .update({ status: "approved" })
    .eq("quarter", quarter)
    .eq("status", "calculated");

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/bonuses");
  return { success: true };
}
