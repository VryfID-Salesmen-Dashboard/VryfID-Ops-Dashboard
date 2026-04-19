import { redirect } from "next/navigation";
import { getCurrentSalesRep } from "@/lib/auth/roles";
import { getRepPayouts } from "@/lib/db/rep-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export default async function DashboardPayoutsPage() {
  const rep = await getCurrentSalesRep();
  if (!rep) redirect("/sign-in");

  const payouts = await getRepPayouts(rep.id);
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.gross_total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">Payouts</h2>
        <p className="text-sm text-neutral-500">
          {payouts.length} payout{payouts.length !== 1 ? "s" : ""}
          {" · "}
          {formatCurrency(totalPaid)} paid all-time
        </p>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No payouts yet. Your first payout will appear here once it&rsquo;s
          processed.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Subscription</TableHead>
                <TableHead className="text-right">Verification</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Gross total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.period_label}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {p.payout_date}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.subscription_total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.verification_total)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.bonus_total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(p.gross_total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        p.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
