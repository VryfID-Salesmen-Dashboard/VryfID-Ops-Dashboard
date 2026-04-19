import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ClientRow } from "@/types/database";

interface ListClientsFilters {
  salesRepId?: string;
  clientType?: string;
  status?: string;
}

export async function listClients(
  filters?: ListClientsFilters,
): Promise<ClientRow[]> {
  let query = getSupabaseAdmin()
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.salesRepId) query = query.eq("sales_rep_id", filters.salesRepId);
  if (filters?.clientType) query = query.eq("client_type", filters.clientType);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function getClient(id: string): Promise<ClientRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ClientRow | null) ?? null;
}

export async function createClient(
  client: Omit<ClientRow, "id" | "created_at" | "updated_at">,
): Promise<ClientRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("clients")
    .insert(client)
    .select()
    .single();

  if (error) throw error;
  return data as ClientRow;
}

export async function updateClient(
  id: string,
  updates: Partial<ClientRow>,
): Promise<ClientRow> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ClientRow;
}

export async function getClientsByRep(
  salesRepId: string,
): Promise<ClientRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("*")
    .eq("sales_rep_id", salesRepId)
    .order("sign_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClientRow[];
}
