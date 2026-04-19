import Link from "next/link";
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
import { AddRepDialog } from "./add-rep-dialog";

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

export default async function RepsPage() {
  const reps = await listReps();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-brand-charcoal">
            Sales reps
          </h2>
          <p className="text-sm text-neutral-500">
            {reps.length} rep{reps.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <AddRepDialog />
      </div>

      {reps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No reps yet. Click &ldquo;Add rep&rdquo; to invite your first sales
          rep.
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">
                  Lifetime clients
                </TableHead>
                <TableHead>Territory</TableHead>
                <TableHead>Start date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((rep) => (
                <TableRow key={rep.id}>
                  <TableCell>
                    <Link
                      href={`/admin/reps/${rep.id}`}
                      className="font-medium text-brand-charcoal hover:text-brand-green"
                    >
                      {rep.first_name} {rep.last_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-neutral-600">{rep.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[rep.status]}
                    >
                      {rep.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={tierColors[rep.current_tier]}
                    >
                      {rep.current_tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {rep.lifetime_clients_signed}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {rep.territory ?? "—"}
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {rep.start_date}
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
