import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { SalesRepRole, SalesRepRow } from "@/types/database";

// Clerk stores role in publicMetadata.role once the admin provisions the rep.
// Falls back to reading from the sales_reps table if Clerk metadata is missing.

export async function getCurrentRole(): Promise<SalesRepRole | null> {
  const { sessionClaims, userId } = await auth();
  if (!userId) return null;

  const metaRole = (sessionClaims?.metadata as { role?: SalesRepRole } | undefined)?.role;
  if (metaRole === "admin" || metaRole === "sales_rep") {
    return metaRole;
  }

  const { data } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("role")
    .eq("clerk_user_id", userId)
    .maybeSingle<Pick<SalesRepRow, "role">>();

  return data?.role ?? null;
}

export async function getCurrentSalesRep(): Promise<SalesRepRow | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data } = await getSupabaseAdmin()
    .from("sales_reps")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle<SalesRepRow>();

  return data ?? null;
}
