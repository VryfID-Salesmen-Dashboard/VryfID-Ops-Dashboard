"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, Check } from "lucide-react";
import { generatePayoutsAction, markPayoutPaidAction } from "./actions";
import type { PayoutRow, SalesRepRow } from "@/types/database";

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function GeneratePayoutDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await generatePayoutsAction(formData);
      if (result.success) {
        setOpen(false);
        formRef.current?.reset();
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-brand-green hover:bg-brand-green-hover text-white" />
        }
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Generate payouts
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Generate monthly payouts</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="periodLabel">Period label</Label>
            <Input
              id="periodLabel"
              name="periodLabel"
              placeholder="e.g. April 2026"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payoutDate">Payout date</Label>
            <Input id="payoutDate" name="payoutDate" type="date" required />
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
              className="bg-brand-green hover:bg-brand-green-hover text-white"
            >
              {pending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PayoutsTable({
  payouts,
  reps,
}: {
  payouts: PayoutRow[];
  reps: SalesRepRow[];
}) {
  const repMap = new Map(reps.map((r) => [r.id, r]));

  function exportCsv() {
    const header = [
      "Rep",
      "Email",
      "Period",
      "Payout Date",
      "Subscription",
      "Verification",
      "Bonus",
      "Gross Total",
      "Status",
    ].join(",");

    const rows = payouts.map((p) => {
      const rep = repMap.get(p.sales_rep_id);
      return [
        rep ? `${rep.first_name} ${rep.last_name}` : "Unknown",
        rep?.email ?? "",
        p.period_label,
        p.payout_date,
        p.subscription_total,
        p.verification_total,
        p.bonus_total,
        p.gross_total,
        p.status,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rep</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Payout date</TableHead>
              <TableHead className="text-right">Subscription</TableHead>
              <TableHead className="text-right">Verification</TableHead>
              <TableHead className="text-right">Bonus</TableHead>
              <TableHead className="text-right">Gross total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payouts.map((p) => {
              const rep = repMap.get(p.sales_rep_id);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {rep ? `${rep.first_name} ${rep.last_name}` : "—"}
                  </TableCell>
                  <TableCell>{p.period_label}</TableCell>
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
                  <TableCell>
                    {p.status === "pending" && (
                      <MarkPaidButton payoutId={p.id} />
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

function MarkPaidButton({ payoutId }: { payoutId: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markPayoutPaidAction(payoutId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      onClick={handleClick}
      disabled={pending}
    >
      <Check className="h-3.5 w-3.5" />
    </Button>
  );
}
