"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { SalesRepRow } from "@/types/database";

export function CommissionFilters({ reps }: { reps: SalesRepRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/admin/commissions?${params.toString()}`);
    },
    [router, searchParams],
  );

  const selectClass =
    "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className={selectClass}
        value={searchParams.get("rep") ?? ""}
        onChange={(e) => setFilter("rep", e.target.value)}
      >
        <option value="">All reps</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.first_name} {r.last_name}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={searchParams.get("type") ?? ""}
        onChange={(e) => setFilter("type", e.target.value)}
      >
        <option value="">All types</option>
        <option value="subscription">Subscription</option>
        <option value="verification">Verification</option>
      </select>
      <select
        className={selectClass}
        value={searchParams.get("status") ?? ""}
        onChange={(e) => setFilter("status", e.target.value)}
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="paid">Paid</option>
        <option value="voided">Voided</option>
      </select>
      <input
        type="date"
        className={selectClass}
        value={searchParams.get("from") ?? ""}
        onChange={(e) => setFilter("from", e.target.value)}
        placeholder="From date"
      />
      <input
        type="date"
        className={selectClass}
        value={searchParams.get("to") ?? ""}
        onChange={(e) => setFilter("to", e.target.value)}
        placeholder="To date"
      />
    </div>
  );
}
