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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createClientAction } from "./actions";
import type { SalesRepRow } from "@/types/database";

export function AddClientDialog({ reps }: { reps: SalesRepRow[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientType, setClientType] = useState<"landlord_pm" | "brokerage">(
    "landlord_pm",
  );
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createClientAction(formData);
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
        Add client
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add client</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientType">Client type</Label>
              <select
                id="clientType"
                name="clientType"
                value={clientType}
                onChange={(e) =>
                  setClientType(
                    e.target.value as "landlord_pm" | "brokerage",
                  )
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="landlord_pm">Landlord / PM</option>
                <option value="brokerage">Brokerage</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salesRepId">Assigned rep</Label>
              <select
                id="salesRepId"
                name="salesRepId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select a rep</option>
                {reps
                  .filter((r) => r.status === "active")
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.first_name} {r.last_name} ({r.current_tier})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {clientType === "landlord_pm" ? (
              <div className="space-y-1.5">
                <Label htmlFor="unitCount">Unit count</Label>
                <Input
                  id="unitCount"
                  name="unitCount"
                  type="number"
                  min={1}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="agentCount">Agent count</Label>
                <Input
                  id="agentCount"
                  name="agentCount"
                  type="number"
                  min={1}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="dashboardCount">Dashboards</Label>
              <Input
                id="dashboardCount"
                name="dashboardCount"
                type="number"
                min={1}
                defaultValue={1}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="monthlySubscription">Monthly sub ($)</Label>
              <Input
                id="monthlySubscription"
                name="monthlySubscription"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signDate">Sign date</Label>
              <Input id="signDate" name="signDate" type="date" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stripeCustomerId">Stripe customer ID</Label>
            <Input
              id="stripeCustomerId"
              name="stripeCustomerId"
              placeholder="cus_..."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
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
              {pending ? "Creating..." : "Create client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
