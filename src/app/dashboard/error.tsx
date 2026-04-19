"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-brand-charcoal">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-neutral-500">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <Button
        onClick={reset}
        className="bg-brand-green hover:bg-brand-green-hover text-white"
      >
        Try again
      </Button>
    </div>
  );
}
