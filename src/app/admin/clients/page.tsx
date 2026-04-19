import { Suspense } from "react";
import { listClients } from "@/lib/db/clients";
import { listReps } from "@/lib/db/reps";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddClientDialog } from "./add-client-dialog";
import { ClientFilters } from "./client-filters";
import { ReassignDialog } from "./reassign-dialog";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
  paused: "bg-amber-100 text-amber-700",
};

const typeLabels: Record<string, string> = {
  landlord_pm: "Landlord / PM",
  brokerage: "Brokerage",
};

function formatCurrency(amount: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function daysRemaining(endDate: string): number {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ rep?: string; type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [clients, reps] = await Promise.all([
    listClients({
      salesRepId: params.rep,
      clientType: params.type,
      status: params.status,
    }),
    listReps(),
  ]);

  const repMap = new Map(reps.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">Clients</h2>
          <p className="text-sm text-neutral-500">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
            {(params.rep || params.type || params.status) && " (filtered)"}
          </p>
        </div>
        <AddClientDialog reps={reps} />
      </div>

      <Suspense>
        <ClientFilters reps={reps} />
      </Suspense>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No clients found.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead className="text-right">Monthly sub</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days left</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const rep = repMap.get(client.sales_rep_id);
                const days = daysRemaining(client.commission_end_date);
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.company_name}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {typeLabels[client.client_type] ?? client.client_type}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {rep
                        ? `${rep.first_name} ${rep.last_name}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(client.monthly_subscription)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(Number(client.commission_rate_locked) * 100).toFixed(0)}%
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
                      {days > 0 ? days : "Expired"}
                    </TableCell>
                    <TableCell>
                      <ReassignDialog
                        clientId={client.id}
                        currentRepId={client.sales_rep_id}
                        reps={reps}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
