import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SalesRepRow } from "@/types/database";

export async function listReps(): Promise<SalesRepRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SalesRepRow[];
}

export async function getRep(id: string): Promise<SalesRepRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as SalesRepRow | null) ?? null;
}

export async function getRepByClerkId(
  clerkUserId: string,
): Promise<SalesRepRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return (data as SalesRepRow | null) ?? null;
}

export async function getRepByEmail(
  email: string,
): Promise<SalesRepRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return (data as SalesRepRow | null) ?? null;
}

export async function createRep(
  rep: Omit<SalesRepRow, "id" | "created_at" | "updated_at">,
): Promise<SalesRepRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("sales_reps")
    .insert(rep)
    .select()
    .single();

  if (error) throw error;
  return data as SalesRepRow;
}

export async function updateRep(
  id: string,
  updates: Partial<SalesRepRow>,
): Promise<SalesRepRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("sales_reps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as SalesRepRow;
}
