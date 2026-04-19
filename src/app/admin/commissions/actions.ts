"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/auth/roles";
import type { ActionResult } from "@/app/admin/reps/actions";

const BulkApproveSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Select at least one commission"),
});

const VoidSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Void reason is required"),
});

export async function bulkApproveCommissionsAction(
  ids: string[],
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = BulkApproveSchema.safeParse({ ids });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("commission_events")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .in("id", parsed.data.ids)
    .eq("status", "pending");

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/commissions");
  return { success: true };
}

export async function voidCommissionAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = VoidSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("commission_events")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      void_reason: parsed.data.reason,
    })
    .eq("id", parsed.data.id)
    .neq("status", "voided");

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/commissions");
  return { success: true };
}
