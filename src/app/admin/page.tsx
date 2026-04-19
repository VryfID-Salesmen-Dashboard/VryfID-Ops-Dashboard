import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminKPIs,
  getMonthlyData,
  getRevenueByRep,
  getAcquisitionTrend,
} from "@/lib/db/overview";
import {
  RevenueChart,
  CommissionExpenseChart,
  RevenueByRepChart,
  AcquisitionChart,
} from "@/components/charts/overview-charts";
import {
  DollarSign,
  TrendingDown,
  Percent,
  Users,
  Building2,
  BarChart3,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminOverviewPage() {
  const [kpis, monthlyData, revenueByRep, acquisitionTrend] =
    await Promise.all([
      getAdminKPIs(),
      getMonthlyData(),
      getRevenueByRep(),
      getAcquisitionTrend(),
    ]);

  const kpiCards = [
    {
      title: "Total MRR",
      value: formatCurrency(kpis.totalMRR),
      icon: DollarSign,
    },
    {
      title: "Commission expense",
      value: formatCurrency(kpis.totalCommissionExpense),
      icon: TrendingDown,
    },
    {
      title: "Commission-to-revenue",
      value: `${(kpis.commissionToRevenueRatio * 100).toFixed(1)}%`,
      icon: Percent,
    },
    {
      title: "Active reps",
      value: kpis.activeReps.toString(),
      icon: Users,
    },
    {
      title: "Active clients",
      value: kpis.activeClients.toString(),
      icon: Building2,
    },
    {
      title: "Avg revenue / client",
      value: formatCurrency(kpis.avgRevenuePerClient),
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">Overview</h2>
        <p className="text-sm text-neutral-500">
          Company-wide financial snapshot
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-neutral-500">
                  {kpi.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-neutral-400" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-brand-charcoal">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-700">
              Revenue over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-700">
              Commission expense over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CommissionExpenseChart data={monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-700">
              Revenue by rep (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByRep.length > 0 ? (
              <RevenueByRepChart data={revenueByRep} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">
                No active clients yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-700">
              Client acquisition trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AcquisitionChart data={acquisitionTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
