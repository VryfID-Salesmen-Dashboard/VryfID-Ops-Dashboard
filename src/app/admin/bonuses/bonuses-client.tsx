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
import { Calculator, Check } from "lucide-react";
import { calculateBonusesAction, approveBonusesAction } from "./actions";
import type { QuarterlyBonusRow, SalesRepRow } from "@/types/database";

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

export function CalculateBonusDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await calculateBonusesAction(formData);
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
        <Calculator className="mr-1.5 h-4 w-4" />
        Calculate bonuses
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Calculate quarterly bonuses</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quarter">Quarter</Label>
            <Input
              id="quarter"
              name="quarter"
              placeholder="e.g. 2026-Q2"
              required
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
              className="bg-brand-green hover:bg-brand-green-hover text-white"
            >
              {pending ? "Calculating..." : "Calculate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BonusesTable({
  bonuses,
  reps,
}: {
  bonuses: QuarterlyBonusRow[];
  reps: SalesRepRow[];
}) {
  const repMap = new Map(reps.map((r) => [r.id, r]));
  const quarters = [...new Set(bonuses.map((b) => b.quarter))].sort().reverse();

  return (
    <div className="space-y-6">
      {quarters.map((quarter) => {
        const qBonuses = bonuses.filter((b) => b.quarter === quarter);
        const anyCalculated = qBonuses.some((b) => b.status === "calculated");
        return (
          <div key={quarter} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-charcoal">
                {quarter}
              </h3>
              {anyCalculated && (
                <ApproveQuarterButton quarter={quarter} />
              )}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">New clients</TableHead>
                    <TableHead className="text-right">Acq. bonus</TableHead>
                    <TableHead className="text-right">Verifications</TableHead>
                    <TableHead className="text-right">Vol. bonus</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    <TableHead className="text-right">Ret. bonus</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qBonuses.map((b) => {
                    const rep = repMap.get(b.sales_rep_id);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          {rep
                            ? `${rep.first_name} ${rep.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.new_clients_count}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(b.acquisition_bonus)}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.total_verifications}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(b.volume_bonus)}
                        </TableCell>
                        <TableCell className="text-right">
                          {b.retention_rate !== null
                            ? `${(Number(b.retention_rate) * 100).toFixed(0)}%`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(b.retention_bonus)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(b.total_bonus)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              b.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : b.status === "approved"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                            }
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApproveQuarterButton({ quarter }: { quarter: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await approveBonusesAction(quarter);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <Check className="mr-1 h-4 w-4" />
      {pending ? "Approving..." : "Approve all"}
    </Button>
  );
}
