import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  SalesRepRow,
  ClientRow,
  CommissionEventRow,
  PayoutRow,
  QuarterlyBonusRow,
} from "@/types/database";

export interface RepKPIs {
  mtdSubscription: number;
  mtdVerification: number;
  mtdBonus: number;
  mtdTotal: number;
  activeClients: number;
  tierTarget: number;
  tierLabel: string;
  lifetimeClients: number;
  nextPayoutEstimate: number;
}

export interface RepMonthlyEarning {
  month: string;
  subscription: number;
  verification: number;
  bonus: number;
}

export interface RepClientSummary {
  client: ClientRow;
  thisMonthCommission: number;
  thisMonthVerifications: number;
  daysRemaining: number;
}

export interface RepEarningsByClient {
  clientName: string;
  subscription: number;
  verification: number;
  total: number;
}

function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export async function getRepKPIs(rep: SalesRepRow): Promise<RepKPIs> {
  const db = getSupabaseAdmin();
  const { start, end } = currentMonthRange();

  const [clientsResult, commissionsResult, bonusesResult, pendingResult] =
    await Promise.all([
      db.from("clients").select("*").eq("sales_rep_id", rep.id).eq("status", "active"),
      db
        .from("commission_events")
        .select("*")
        .eq("sales_rep_id", rep.id)
        .neq("status", "voided")
        .gte("period_start", start)
        .lte("period_start", end),
      db.from("quarterly_bonuses").select("*").eq("sales_rep_id", rep.id),
      db
        .from("commission_events")
        .select("*")
        .eq("sales_rep_id", rep.id)
        .in("status", ["pending", "approved"]),
    ]);

  const clients = (clientsResult.data ?? []) as ClientRow[];
  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];
  const bonuses = (bonusesResult.data ?? []) as QuarterlyBonusRow[];
  const pendingCommissions = (pendingResult.data ?? []) as CommissionEventRow[];

  const mtdSub = commissions
    .filter((c) => c.event_type === "subscription")
    .reduce((s, c) => s + Number(c.commission_amount), 0);

  const mtdVerif = commissions
    .filter((c) => c.event_type === "verification")
    .reduce((s, c) => s + Number(c.commission_amount), 0);

  const currentQ = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const mtdBonus = bonuses
    .filter((b) => b.quarter === currentQ && b.status !== "calculated")
    .reduce((s, b) => s + Number(b.total_bonus), 0);

  const nextPayoutEstimate = pendingCommissions.reduce(
    (s, c) => s + Number(c.commission_amount),
    0,
  );

  let tierTarget: number;
  let tierLabel: string;
  if (rep.current_tier === "starter") {
    tierTarget = 20;
    tierLabel = "Proven";
  } else if (rep.current_tier === "proven") {
    tierTarget = 50;
    tierLabel = "Elite";
  } else {
    tierTarget = rep.lifetime_clients_signed;
    tierLabel = "Max tier";
  }

  return {
    mtdSubscription: mtdSub,
    mtdVerification: mtdVerif,
    mtdBonus: mtdBonus,
    mtdTotal: mtdSub + mtdVerif + mtdBonus,
    activeClients: clients.length,
    tierTarget,
    tierLabel,
    lifetimeClients: rep.lifetime_clients_signed,
    nextPayoutEstimate,
  };
}

export async function getRepMonthlyEarnings(
  repId: string,
  months: number = 12,
): Promise<RepMonthlyEarning[]> {
  const db = getSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const [commissionsResult, bonusesResult] = await Promise.all([
    db
      .from("commission_events")
      .select("*")
      .eq("sales_rep_id", repId)
      .neq("status", "voided")
      .gte("period_start", cutoffStr),
    db.from("quarterly_bonuses").select("*").eq("sales_rep_id", repId),
  ]);

  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];
  const bonuses = (bonusesResult.data ?? []) as QuarterlyBonusRow[];

  const map = new Map<string, RepMonthlyEarning>();
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = monthKey(d);
    map.set(key, { month: key, subscription: 0, verification: 0, bonus: 0 });
  }

  for (const c of commissions) {
    const key = c.period_start.slice(0, 7);
    const point = map.get(key);
    if (!point) continue;
    if (c.event_type === "subscription") {
      point.subscription += Number(c.commission_amount);
    } else {
      point.verification += Number(c.commission_amount);
    }
  }

  for (const b of bonuses) {
    const [yearStr, qStr] = b.quarter.split("-Q");
    const q = parseInt(qStr, 10);
    const lastMonth = q * 3;
    const key = `${yearStr}-${String(lastMonth).padStart(2, "0")}`;
    const point = map.get(key);
    if (point) point.bonus += Number(b.total_bonus);
  }

  return Array.from(map.values()).reverse();
}

export async function getRepClientSummaries(
  repId: string,
): Promise<RepClientSummary[]> {
  const db = getSupabaseAdmin();
  const { start, end } = currentMonthRange();

  const [clientsResult, commissionsResult] = await Promise.all([
    db
      .from("clients")
      .select("*")
      .eq("sales_rep_id", repId)
      .order("sign_date", { ascending: false }),
    db
      .from("commission_events")
      .select("*")
      .eq("sales_rep_id", repId)
      .neq("status", "voided")
      .gte("period_start", start)
      .lte("period_start", end),
  ]);

  const clients = (clientsResult.data ?? []) as ClientRow[];
  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];

  return clients.map((client) => {
    const clientCommissions = commissions.filter(
      (c) => c.client_id === client.id,
    );
    const thisMonthCommission = clientCommissions.reduce(
      (s, c) => s + Number(c.commission_amount),
      0,
    );
    const thisMonthVerifications = clientCommissions.filter(
      (c) => c.event_type === "verification",
    ).length;
    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(client.commission_end_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return { client, thisMonthCommission, thisMonthVerifications, daysRemaining };
  });
}

export async function getRepEarningsByClient(
  repId: string,
): Promise<RepEarningsByClient[]> {
  const db = getSupabaseAdmin();

  const [clientsResult, commissionsResult] = await Promise.all([
    db.from("clients").select("*").eq("sales_rep_id", repId),
    db
      .from("commission_events")
      .select("*")
      .eq("sales_rep_id", repId)
      .neq("status", "voided"),
  ]);

  const clients = (clientsResult.data ?? []) as ClientRow[];
  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const grouped = new Map<string, RepEarningsByClient>();
  for (const c of commissions) {
    const client = clientMap.get(c.client_id);
    const name = client?.company_name ?? "Unknown";
    if (!grouped.has(c.client_id)) {
      grouped.set(c.client_id, { clientName: name, subscription: 0, verification: 0, total: 0 });
    }
    const entry = grouped.get(c.client_id)!;
    const amount = Number(c.commission_amount);
    if (c.event_type === "subscription") entry.subscription += amount;
    else entry.verification += amount;
    entry.total += amount;
  }

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
}

export async function getRepPayouts(repId: string): Promise<PayoutRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("payouts")
    .select("*")
    .eq("sales_rep_id", repId)
    .order("payout_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PayoutRow[];
}

export async function getRepBonuses(repId: string): Promise<QuarterlyBonusRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("quarterly_bonuses")
    .select("*")
    .eq("sales_rep_id", repId)
    .order("quarter", { ascending: false });

  if (error) throw error;
  return (data ?? []) as QuarterlyBonusRow[];
}
