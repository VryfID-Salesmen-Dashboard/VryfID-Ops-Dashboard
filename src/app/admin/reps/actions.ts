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

    const existingUsers = await clerk.users.getUserList({
      emailAddress: [email],
    });

    let clerkUserId: string;

    if (existingUsers.data.length > 0) {
      const user = existingUsers.data[0];
      clerkUserId = user.id;
      await clerk.users.updateUser(user.id, {
        publicMetadata: {
          ...(user.publicMetadata ?? {}),
          role: "sales_rep",
        },
      });
    } else {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { role: "sales_rep" },
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
      });
      clerkUserId = invitation.id;
    }

    await createRep({
      clerk_user_id: clerkUserId,
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
    console.error("createRepAction failed:", err);
    return { success: false, error: extractErrorMessage(err, "Failed to create rep") };
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
    console.error("updateRepAction failed:", err);
    return { success: false, error: extractErrorMessage(err, "Failed to update rep") };
  }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      errors?: Array<{ message?: string; longMessage?: string; code?: string }>;
    };
    if (Array.isArray(e.errors) && e.errors.length > 0) {
      return e.errors
        .map((x) => x.longMessage || x.message || x.code || "")
        .filter(Boolean)
        .join("; ");
    }
    const parts: string[] = [];
    if (typeof e.message === "string") parts.push(e.message);
    if (typeof e.code === "string") parts.push(`(code: ${e.code})`);
    if (typeof e.details === "string") parts.push(e.details);
    if (typeof e.hint === "string") parts.push(`hint: ${e.hint}`);
    if (parts.length > 0) return parts.join(" ");
  }
  return fallback;
}
