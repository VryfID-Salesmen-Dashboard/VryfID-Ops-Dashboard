"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft } from "lucide-react";
import { reassignClientAction } from "./actions";
import type { SalesRepRow } from "@/types/database";

export function ReassignDialog({
  clientId,
  currentRepId,
  reps,
}: {
  clientId: string;
  currentRepId: string;
  reps: SalesRepRow[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await reassignClientAction(formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="h-7 px-2" />}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign client</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <div className="space-y-1.5">
            <Label htmlFor="newSalesRepId">New sales rep</Label>
            <select
              id="newSalesRepId"
              name="newSalesRepId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="">Select a rep</option>
              {reps
                .filter((r) => r.id !== currentRepId && r.status === "active")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.first_name} {r.last_name}
                  </option>
                ))}
            </select>
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
              {pending ? "Reassigning..." : "Reassign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
