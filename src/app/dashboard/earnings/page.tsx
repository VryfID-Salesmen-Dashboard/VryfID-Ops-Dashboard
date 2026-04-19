import { redirect } from "next/navigation";
import { getCurrentSalesRep } from "@/lib/auth/roles";
import {
  getRepEarningsByClient,
  getRepMonthlyEarnings,
} from "@/lib/db/rep-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { RepEarningsChart } from "@/components/charts/rep-charts";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function DashboardEarningsPage() {
  const rep = await getCurrentSalesRep();
  if (!rep) redirect("/sign-in");

  const [byClient, monthly] = await Promise.all([
    getRepEarningsByClient(rep.id),
    getRepMonthlyEarnings(rep.id),
  ]);

  const totalSub = byClient.reduce((s, c) => s + c.subscription, 0);
  const totalVerif = byClient.reduce((s, c) => s + c.verification, 0);
  const grandTotal = totalSub + totalVerif;

  const thisMonth = monthly[monthly.length - 1];
  const lastMonth = monthly.length >= 2 ? monthly[monthly.length - 2] : null;
  const thisMonthTotal = thisMonth
    ? thisMonth.subscription + thisMonth.verification + thisMonth.bonus
    : 0;
  const lastMonthTotal = lastMonth
    ? lastMonth.subscription + lastMonth.verification + lastMonth.bonus
    : 0;
  const changePercent =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">Earnings</h2>
        <p className="text-sm text-neutral-500">
          Detailed breakdown of your commission earnings
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              All-time subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalSub)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              All-time verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalVerif)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-neutral-500">
              Month-over-month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(1)}%
            </p>
            <p className="text-xs text-neutral-500">
              vs prior month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-700">
            Monthly trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RepEarningsChart data={monthly} />
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-brand-charcoal">
          Earnings by client
        </h3>
        {byClient.length === 0 ? (
          <p className="text-sm text-neutral-500">No earnings yet.</p>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Subscription</TableHead>
                  <TableHead className="text-right">Verification</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byClient.map((row) => (
                  <TableRow key={row.clientName}>
                    <TableCell className="font-medium">
                      {row.clientName}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.subscription)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.verification)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-neutral-50 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalSub)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totalVerif)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
