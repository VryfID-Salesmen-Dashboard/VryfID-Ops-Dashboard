import { redirect } from "next/navigation";
import { getCurrentSalesRep } from "@/lib/auth/roles";
import { getRepBonuses, getRepKPIs } from "@/lib/db/rep-dashboard";
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
import {
  acquisitionBonus,
  volumeBonus,
  retentionBonus,
} from "@/lib/bonuses";

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));
}

const ACQ_TIERS = [
  { min: 1, max: 3, bonus: 500 },
  { min: 4, max: 6, bonus: 1500 },
  { min: 7, max: 10, bonus: 3000 },
  { min: 11, max: Infinity, bonus: 5000 },
];

const VOL_TIERS = [
  { min: 1, max: 300, bonus: 500 },
  { min: 301, max: 800, bonus: 1500 },
  { min: 801, max: 2000, bonus: 3500 },
  { min: 2001, max: Infinity, bonus: 5000 },
];

const RET_TIERS = [
  { min: 0.80, max: 0.89, bonus: 500 },
  { min: 0.90, max: 0.94, bonus: 1000 },
  { min: 0.95, max: 1.0, bonus: 2000 },
];

function TierProgress({
  label,
  current,
  tiers,
  format,
}: {
  label: string;
  current: number;
  tiers: { min: number; max: number; bonus: number }[];
  format: (v: number) => string;
}) {
  const currentBonus = tiers.reduce(
    (best, t) => (current >= t.min ? t.bonus : best),
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-neutral-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-lg font-semibold text-brand-charcoal">
          {format(current)}
        </p>
        <div className="space-y-1">
          {tiers.map((tier) => {
            const active = current >= tier.min;
            return (
              <div
                key={tier.min}
                className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                  active
                    ? "bg-brand-green-muted text-brand-charcoal font-medium"
                    : "text-neutral-400"
                }`}
              >
                <span>
                  {format(tier.min)}
                  {tier.max < Infinity ? ` – ${format(tier.max)}` : "+"}
                </span>
                <span>{formatCurrency(tier.bonus)}</span>
              </div>
            );
          })}
        </div>
        <p className="pt-1 text-sm font-medium text-brand-green">
          Current: {formatCurrency(currentBonus)}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardBonusesPage() {
  const rep = await getCurrentSalesRep();
  if (!rep) redirect("/sign-in");

  const [bonuses, kpis] = await Promise.all([
    getRepBonuses(rep.id),
    getRepKPIs(rep),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-charcoal">
          Quarterly bonuses
        </h2>
        <p className="text-sm text-neutral-500">
          Track your progress toward this quarter&rsquo;s performance bonuses
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TierProgress
          label="Acquisition (new clients this Q)"
          current={0}
          tiers={ACQ_TIERS}
          format={(v) => `${v} clients`}
        />
        <TierProgress
          label="Verification volume this Q"
          current={0}
          tiers={VOL_TIERS}
          format={(v) => `${v.toLocaleString()} verifs`}
        />
        <TierProgress
          label="Client retention rate"
          current={0}
          tiers={RET_TIERS}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
      </div>

      <Separator />

      <div>
        <h3 className="mb-3 text-lg font-semibold text-brand-charcoal">
          Bonus history
        </h3>
        {bonuses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            No bonus calculations for you yet.
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quarter</TableHead>
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
                {bonuses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.quarter}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
