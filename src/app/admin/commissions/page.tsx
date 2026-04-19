import { Suspense } from "react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { listReps } from "@/lib/db/reps";
import { listClients } from "@/lib/db/clients";
import { CommissionTable } from "./commission-table";
import { CommissionFilters } from "./commission-filters";
import type { CommissionEventRow } from "@/types/database";

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    rep?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;

  let query = getSupabaseAdmin()
    .from("commission_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.rep) query = query.eq("sales_rep_id", params.rep);
  if (params.type) query = query.eq("event_type", params.type);
  if (params.status) query = query.eq("status", params.status);
  if (params.from) query = query.gte("period_start", params.from);
  if (params.to) query = query.lte("period_end", params.to);

  const [{ data, error }, reps, clients] = await Promise.all([
    query,
    listReps(),
    listClients(),
  ]);

  if (error) throw error;
  const commissions = (data ?? []) as CommissionEventRow[];

  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalApproved = commissions
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">
            Commissions
          </h2>
          <p className="text-sm text-neutral-500">
            {commissions.length} event{commissions.length !== 1 ? "s" : ""}
            {" · "}
            <span className="text-amber-600">
              ${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })} pending
            </span>
            {" · "}
            <span className="text-blue-600">
              ${totalApproved.toLocaleString("en-US", { minimumFractionDigits: 2 })} approved
            </span>
          </p>
        </div>
      </div>

      <Suspense>
        <CommissionFilters reps={reps} />
      </Suspense>

      {commissions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No commission events found.
        </div>
      ) : (
        <CommissionTable
          commissions={commissions}
          reps={reps}
          clients={clients}
        />
      )}
    </div>
  );
}
