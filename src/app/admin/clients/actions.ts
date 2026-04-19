"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, updateClient } from "@/lib/db/clients";
import { getRep, updateRep } from "@/lib/db/reps";
import { getCurrentRole } from "@/lib/auth/roles";
import {
  tierForClientCount,
  rateForTier,
  shouldUpgradeTier,
  commissionEndDate,
} from "@/lib/commissions";
import type { ActionResult } from "@/app/admin/reps/actions";

const CreateClientSchema = z.object({
  salesRepId: z.string().uuid("Sales rep is required"),
  stripeCustomerId: z.string().min(1, "Stripe customer ID is required"),
  companyName: z.string().min(1, "Company name is required"),
  clientType: z.enum(["landlord_pm", "brokerage"]),
  unitCount: z.coerce.number().int().positive().optional(),
  agentCount: z.coerce.number().int().positive().optional(),
  dashboardCount: z.coerce.number().int().positive().default(1),
  monthlySubscription: z.string().min(1, "Subscription amount is required"),
  signDate: z.string().min(1, "Sign date is required"),
  notes: z.string().optional(),
});

const UpdateClientSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1).optional(),
  unitCount: z.coerce.number().int().positive().optional(),
  agentCount: z.coerce.number().int().positive().optional(),
  dashboardCount: z.coerce.number().int().positive().optional(),
  monthlySubscription: z.string().optional(),
  status: z.enum(["active", "churned", "paused"]).optional(),
  notes: z.string().optional(),
});

const ReassignClientSchema = z.object({
  clientId: z.string().uuid(),
  newSalesRepId: z.string().uuid(),
});

export async function createClientAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = CreateClientSchema.safeParse({
    salesRepId: formData.get("salesRepId"),
    stripeCustomerId: formData.get("stripeCustomerId"),
    companyName: formData.get("companyName"),
    clientType: formData.get("clientType"),
    unitCount: formData.get("unitCount") || undefined,
    agentCount: formData.get("agentCount") || undefined,
    dashboardCount: formData.get("dashboardCount") || 1,
    monthlySubscription: formData.get("monthlySubscription"),
    signDate: formData.get("signDate"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const d = parsed.data;

  try {
    const rep = await getRep(d.salesRepId);
    if (!rep) return { success: false, error: "Sales rep not found" };

    // Increment lifetime clients and check for tier upgrade
    const newCount = rep.lifetime_clients_signed + 1;
    const potentialTier = tierForClientCount(newCount);
    const newTier = shouldUpgradeTier(rep.current_tier, potentialTier)
      ? potentialTier
      : rep.current_tier;
    const lockedRate = rateForTier(newTier);

    await updateRep(rep.id, {
      lifetime_clients_signed: newCount,
      current_tier: newTier,
    } as Record<string, unknown>);

    await createClient({
      sales_rep_id: d.salesRepId,
      stripe_customer_id: d.stripeCustomerId,
      company_name: d.companyName,
      client_type: d.clientType,
      unit_count: d.unitCount ?? null,
      agent_count: d.agentCount ?? null,
      dashboard_count: d.dashboardCount,
      monthly_subscription: d.monthlySubscription,
      sign_date: d.signDate,
      commission_end_date: commissionEndDate(d.signDate),
      commission_rate_locked: lockedRate,
      status: "active",
      churned_date: null,
      notes: d.notes ?? null,
    });

    revalidatePath("/admin/clients");
    revalidatePath("/admin/reps");
    revalidatePath(`/admin/reps/${rep.id}`);
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create client";
    return { success: false, error: message };
  }
}

export async function updateClientAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = UpdateClientSchema.safeParse({
    id: formData.get("id"),
    companyName: formData.get("companyName") || undefined,
    unitCount: formData.get("unitCount") || undefined,
    agentCount: formData.get("agentCount") || undefined,
    dashboardCount: formData.get("dashboardCount") || undefined,
    monthlySubscription: formData.get("monthlySubscription") || undefined,
    status: formData.get("status") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, ...rest } = parsed.data;

  try {
    const updates: Record<string, unknown> = {};
    if (rest.companyName) updates.company_name = rest.companyName;
    if (rest.unitCount !== undefined) updates.unit_count = rest.unitCount;
    if (rest.agentCount !== undefined) updates.agent_count = rest.agentCount;
    if (rest.dashboardCount !== undefined)
      updates.dashboard_count = rest.dashboardCount;
    if (rest.monthlySubscription)
      updates.monthly_subscription = rest.monthlySubscription;
    if (rest.status) {
      updates.status = rest.status;
      if (rest.status === "churned") {
        updates.churned_date = new Date().toISOString().split("T")[0];
      }
    }
    if (rest.notes !== undefined) updates.notes = rest.notes || null;

    await updateClient(id, updates);
    revalidatePath("/admin/clients");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update client";
    return { success: false, error: message };
  }
}

export async function reassignClientAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = ReassignClientSchema.safeParse({
    clientId: formData.get("clientId"),
    newSalesRepId: formData.get("newSalesRepId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  try {
    const newRep = await getRep(parsed.data.newSalesRepId);
    if (!newRep) return { success: false, error: "Target rep not found" };

    await updateClient(parsed.data.clientId, {
      sales_rep_id: parsed.data.newSalesRepId,
    });

    revalidatePath("/admin/clients");
    revalidatePath("/admin/reps");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reassign client";
    return { success: false, error: message };
  }
}
