import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// RLS-respecting server client. Forwards the signed-in Clerk user's session
// token to Supabase so Postgres RLS can read `auth.jwt() ->> 'sub'`.
// Use from Server Components / Route Handlers that should enforce per-user access.

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env var",
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    async accessToken() {
      const { getToken } = await auth();
      return (await getToken()) ?? null;
    },
  });
}
