"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { createRep, updateRep } from "@/lib/db/reps";
import { getCurrentRole } from "@/lib/auth/roles";

const CreateRepSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  territory: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
});

const UpdateRepSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  territory: z.string().optional(),
  status: z.enum(["active", "inactive", "terminated"]).optional(),
});

export type ActionResult = {
  success: boolean;
  error?: string;
};

export async function createRepAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = CreateRepSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    territory: formData.get("territory") || undefined,
    startDate: formData.get("startDate"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { firstName, lastName, email, phone, territory, startDate } =
    parsed.data;

  try {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: "sales_rep" },
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
    });

    await createRep({
      clerk_user_id: invitation.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone ?? null,
      role: "sales_rep",
      status: "active",
      lifetime_clients_signed: 0,
      current_tier: "starter",
      start_date: startDate,
      territory: territory ?? null,
    });

    revalidatePath("/admin/reps");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create rep";
    return { success: false, error: message };
  }
}

export async function updateRepAction(
  formData: FormData,
): Promise<ActionResult> {
  const role = await getCurrentRole();
  if (role !== "admin") return { success: false, error: "Unauthorized" };

  const parsed = UpdateRepSchema.safeParse({
    id: formData.get("id"),
    firstName: formData.get("firstName") || undefined,
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone") || undefined,
    territory: formData.get("territory") || undefined,
    status: formData.get("status") || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const { id, firstName, lastName, phone, territory, status } = parsed.data;

  try {
    const updates: Record<string, unknown> = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone !== undefined) updates.phone = phone || null;
    if (territory !== undefined) updates.territory = territory || null;
    if (status) updates.status = status;

    await updateRep(id, updates);
    revalidatePath("/admin/reps");
    revalidatePath(`/admin/reps/${id}`);
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update rep";
    return { success: false, error: message };
  }
}
