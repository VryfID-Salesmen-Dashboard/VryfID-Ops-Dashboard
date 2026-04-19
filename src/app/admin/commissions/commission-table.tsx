"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Ban } from "lucide-react";
import { bulkApproveCommissionsAction, voidCommissionAction } from "./actions";
import type { CommissionEventRow, SalesRepRow, ClientRow } from "@/types/database";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  voided: "bg-red-100 text-red-700",
};

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function CommissionTable({
  commissions,
  reps,
  clients,
}: {
  commissions: CommissionEventRow[];
  reps: SalesRepRow[];
  clients: ClientRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const repMap = new Map(reps.map((r) => [r.id, r]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const pendingCommissions = commissions.filter((c) => c.status === "pending");
  const allPendingSelected =
    pendingCommissions.length > 0 &&
    pendingCommissions.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allPendingSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingCommissions.map((c) => c.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkApprove() {
    setError(null);
    startTransition(async () => {
      const result = await bulkApproveCommissionsAction(
        Array.from(selected),
      );
      if (result.success) {
        setSelected(new Set());
      } else {
        setError(result.error ?? "Failed to approve");
      }
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBulkApprove}
            disabled={pending}
            className="bg-brand-green hover:bg-brand-green-hover text-white"
            size="sm"
          >
            <Check className="mr-1 h-4 w-4" />
            {pending
              ? "Approving..."
              : `Approve ${selected.size} selected`}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allPendingSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Rep</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Payment</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((event) => {
              const rep = repMap.get(event.sales_rep_id);
              const client = clientMap.get(event.client_id);
              return (
                <TableRow key={event.id}>
                  <TableCell>
                    {event.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.has(event.id)}
                        onChange={() => toggle(event.id)}
                        className="h-4 w-4 rounded border-neutral-300"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {event.period_start}
                  </TableCell>
                  <TableCell>
                    {rep ? `${rep.first_name} ${rep.last_name}` : "—"}
                  </TableCell>
                  <TableCell>
                    {client?.company_name ?? "—"}
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
                    <Badge
                      variant="secondary"
                      className={statusColors[event.status]}
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.status !== "voided" && (
                      <VoidDialog commissionId={event.id} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function VoidDialog({ commissionId }: { commissionId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await voidCommissionAction(formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? "Failed to void");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="h-7 px-2" />}
      >
        <Ban className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Void commission</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={commissionId} />
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              name="reason"
              required
              placeholder="e.g. Duplicate entry, client dispute"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              variant="destructive"
            >
              {pending ? "Voiding..." : "Void"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
