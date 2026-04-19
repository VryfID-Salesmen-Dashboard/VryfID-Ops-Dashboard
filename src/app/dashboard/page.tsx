import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentSalesRep } from "@/lib/auth/roles";
import { getRepKPIs, getRepMonthlyEarnings } from "@/lib/db/rep-dashboard";
import { RepEarningsChart } from "@/components/charts/rep-charts";
import {
  DollarSign,
  Building2,
  TrendingUp,
  Wallet,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const tierColors: Record<string, string> = {
  starter: "bg-neutral-100 text-neutral-700",
  proven: "bg-blue-100 text-blue-700",
  elite: "bg-amber-100 text-amber-700",
};

export default async function DashboardOverviewPage() {
  const rep = await getCurrentSalesRep();
  if (!rep) redirect("/sign-in");

  const [kpis, monthlyEarnings] = await Promise.all([
    getRepKPIs(rep),
    getRepMonthlyEarnings(rep.id),
  ]);

  const progressPercent = Math.min(
    100,
    (kpis.lifetimeClients / kpis.tierTarget) * 100,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">
            Welcome back, {rep.first_name}
          </h2>
          <p className="text-sm text-neutral-500">
            Here&rsquo;s your performance snapshot
          </p>
        </div>
        <Badge variant="secondary" className={tierColors[rep.current_tier]}>
          {rep.current_tier} tier
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              MTD earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-brand-charcoal">
              {formatCurrency(kpis.mtdTotal)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Sub: {formatCurrency(kpis.mtdSubscription)} · Verif:{" "}
              {formatCurrency(kpis.mtdVerification)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              Active clients
            </CardTitle>
            <Building2 className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-brand-charcoal">
              {kpis.activeClients}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              Tier progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-brand-charcoal">
              {kpis.lifetimeClients} / {kpis.tierTarget} to {kpis.tierLabel}
            </p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand-green transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              Next payout est.
            </CardTitle>
            <Wallet className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-brand-charcoal">
              {formatCurrency(kpis.nextPayoutEstimate)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Pending + approved
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-700">
            Monthly earnings (last 12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RepEarningsChart data={monthlyEarnings} />
        </CardContent>
      </Card>
    </div>
  );
}
