import { notFound } from "next/navigation";
import Link from "next/link";
import { getRep } from "@/lib/db/reps";
import { getClientsByRep } from "@/lib/db/clients";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import type { CommissionEventRow } from "@/types/database";

const tierColors: Record<string, string> = {
  starter: "bg-neutral-100 text-neutral-700",
  proven: "bg-blue-100 text-blue-700",
  elite: "bg-amber-100 text-amber-700",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-neutral-100 text-neutral-600",
  terminated: "bg-red-100 text-red-700",
};

const clientStatusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
  paused: "bg-amber-100 text-amber-700",
};

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

function tierProgress(tier: string, count: number): { target: number; label: string } {
  if (tier === "starter") return { target: 20, label: "Proven" };
  if (tier === "proven") return { target: 50, label: "Elite" };
  return { target: count, label: "Max tier" };
}

export default async function RepDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rep = await getRep(id);
  if (!rep) notFound();

  const [clients, commissionResult] = await Promise.all([
    getClientsByRep(id),
    getSupabaseAdmin()
      .from("commission_events")
      .select("*")
      .eq("sales_rep_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const commissions = (commissionResult.data ?? []) as CommissionEventRow[];

  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalApproved = commissions
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const progress = tierProgress(rep.current_tier, rep.lifetime_clients_signed);
  const progressPercent = Math.min(
    100,
    (rep.lifetime_clients_signed / progress.target) * 100,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/reps"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-charcoal"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to reps
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">
            {rep.first_name} {rep.last_name}
          </h2>
          <p className="text-sm text-neutral-500">{rep.email}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className={statusColors[rep.status]}>
            {rep.status}
          </Badge>
          <Badge variant="secondary" className={tierColors[rep.current_tier]}>
            {rep.current_tier}
          </Badge>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Active clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {clients.filter((c) => c.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Paid (all-time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-neutral-500">
            Tier progress — {rep.lifetime_clients_signed} / {progress.target} clients to{" "}
            {progress.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Client roster */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-brand-charcoal">
          Client roster ({clients.length})
        </h3>
        {clients.length === 0 ? (
          <p className="text-sm text-neutral-500">No clients yet.</p>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Monthly sub</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sign date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      {client.company_name}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {client.client_type === "landlord_pm"
                        ? "Landlord / PM"
                        : "Brokerage"}
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
                        className={clientStatusColors[client.status]}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {client.sign_date}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Separator />

      {/* Recent commission events */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-brand-charcoal">
          Recent commissions (last 50)
        </h3>
        {commissions.length === 0 ? (
          <p className="text-sm text-neutral-500">No commission events yet.</p>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Payment</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-neutral-600">
                      {event.period_start}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(event.payment_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(Number(event.commission_rate) * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(event.commission_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
