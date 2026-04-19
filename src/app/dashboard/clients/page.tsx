import { redirect } from "next/navigation";
import { getCurrentSalesRep } from "@/lib/auth/roles";
import { getRepClientSummaries } from "@/lib/db/rep-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
  paused: "bg-amber-100 text-amber-700",
};

const typeLabels: Record<string, string> = {
  landlord_pm: "Landlord / PM",
  brokerage: "Brokerage",
};

export default async function DashboardClientsPage() {
  const rep = await getCurrentSalesRep();
  if (!rep) redirect("/sign-in");

  const summaries = await getRepClientSummaries(rep.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">
          My clients
        </h2>
        <p className="text-sm text-neutral-500">
          {summaries.length} client{summaries.length !== 1 ? "s" : ""} in your
          portfolio
        </p>
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No clients assigned to you yet.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Monthly sub</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead className="text-right">Verifications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ client, thisMonthCommission, thisMonthVerifications, daysRemaining }) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.company_name}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {typeLabels[client.client_type] ?? client.client_type}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(client.monthly_subscription))}
                  </TableCell>
                  <TableCell className="text-right">
                    {(Number(client.commission_rate_locked) * 100).toFixed(0)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(thisMonthCommission)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {thisMonthVerifications}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[client.status]}
                    >
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {daysRemaining > 0 ? daysRemaining : "Expired"}
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
