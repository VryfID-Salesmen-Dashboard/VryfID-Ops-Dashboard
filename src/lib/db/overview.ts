import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  SalesRepRow,
  ClientRow,
  CommissionEventRow,
  QuarterlyBonusRow,
} from "@/types/database";

export interface AdminKPIs {
  totalMRR: number;
  totalCommissionExpense: number;
  commissionToRevenueRatio: number;
  activeReps: number;
  activeClients: number;
  avgRevenuePerClient: number;
}

export interface MonthlyDataPoint {
  month: string;
  revenue: number;
  subscriptionCommission: number;
  verificationCommission: number;
  bonusExpense: number;
}

export interface RepRevenuePoint {
  name: string;
  revenue: number;
}

export interface AcquisitionPoint {
  month: string;
  newClients: number;
}

export async function getAdminKPIs(): Promise<AdminKPIs> {
  const db = getSupabaseAdmin();

  const [repsResult, clientsResult, commissionsResult] = await Promise.all([
    db.from("sales_reps").select("*"),
    db.from("clients").select("*"),
    db.from("commission_events").select("*").neq("status", "voided"),
  ]);

  const reps = (repsResult.data ?? []) as SalesRepRow[];
  const clients = (clientsResult.data ?? []) as ClientRow[];
  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];

  const activeClients = clients.filter((c) => c.status === "active");
  const activeReps = reps.filter((r) => r.status === "active");

  const totalMRR = activeClients.reduce(
    (sum, c) => sum + Number(c.monthly_subscription),
    0,
  );

  const totalCommissionExpense = commissions
    .filter((c) => c.status !== "voided")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalRevenue = commissions.reduce(
    (sum, c) => sum + Number(c.payment_amount),
    0,
  );

  const commissionToRevenueRatio =
    totalRevenue > 0 ? totalCommissionExpense / totalRevenue : 0;

  const avgRevenuePerClient =
    activeClients.length > 0 ? totalMRR / activeClients.length : 0;

  return {
    totalMRR,
    totalCommissionExpense,
    commissionToRevenueRatio,
    activeReps: activeReps.length,
    activeClients: activeClients.length,
    avgRevenuePerClient,
  };
}

export async function getMonthlyData(months: number = 12): Promise<MonthlyDataPoint[]> {
  const db = getSupabaseAdmin();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const [commissionsResult, bonusesResult] = await Promise.all([
    db
      .from("commission_events")
      .select("*")
      .neq("status", "voided")
      .gte("period_start", cutoffStr),
    db.from("quarterly_bonuses").select("*"),
  ]);

  const commissions = (commissionsResult.data ?? []) as CommissionEventRow[];
  const bonuses = (bonusesResult.data ?? []) as QuarterlyBonusRow[];

  const monthMap = new Map<string, MonthlyDataPoint>();

  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, {
      month: key,
      revenue: 0,
      subscriptionCommission: 0,
      verificationCommission: 0,
      bonusExpense: 0,
    });
  }

  for (const c of commissions) {
    const key = c.period_start.slice(0, 7);
    const point = monthMap.get(key);
    if (!point) continue;
    point.revenue += Number(c.payment_amount);
    if (c.event_type === "subscription") {
      point.subscriptionCommission += Number(c.commission_amount);
    } else {
      point.verificationCommission += Number(c.commission_amount);
    }
  }

  for (const b of bonuses) {
    const [yearStr, qStr] = b.quarter.split("-Q");
    const q = parseInt(qStr, 10);
    const lastMonth = q * 3;
    const key = `${yearStr}-${String(lastMonth).padStart(2, "0")}`;
    const point = monthMap.get(key);
    if (point) {
      point.bonusExpense += Number(b.total_bonus);
    }
  }

  return Array.from(monthMap.values()).reverse();
}

export async function getRevenueByRep(): Promise<RepRevenuePoint[]> {
  const db = getSupabaseAdmin();

  const [repsResult, clientsResult] = await Promise.all([
    db.from("sales_reps").select("*").eq("status", "active"),
    db.from("clients").select("*").eq("status", "active"),
  ]);

  const reps = (repsResult.data ?? []) as SalesRepRow[];
  const clients = (clientsResult.data ?? []) as ClientRow[];

  return reps
    .map((rep) => {
      const repClients = clients.filter((c) => c.sales_rep_id === rep.id);
      const revenue = repClients.reduce(
        (sum, c) => sum + Number(c.monthly_subscription),
        0,
      );
      return {
        name: `${rep.first_name} ${rep.last_name.charAt(0)}.`,
        revenue,
      };
    })
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getAcquisitionTrend(months: number = 12): Promise<AcquisitionPoint[]> {
  const db = getSupabaseAdmin();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data } = await db
    .from("clients")
    .select("sign_date")
    .gte("sign_date", cutoffStr);

  const clients = (data ?? []) as { sign_date: string }[];

  const monthMap = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  for (const c of clients) {
    const key = c.sign_date.slice(0, 7);
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
    }
  }

  return Array.from(monthMap.entries())
    .map(([month, newClients]) => ({ month, newClients }))
    .reverse();
}
