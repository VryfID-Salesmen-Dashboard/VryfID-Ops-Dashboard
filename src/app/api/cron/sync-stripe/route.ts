import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const fortyEightHoursAgo = now - 48 * 60 * 60;

    const stripe = getStripe();
    const transactions: string[] = [];

    for await (const txn of stripe.balanceTransactions.list({
      created: { gte: fortyEightHoursAgo },
      limit: 100,
    })) {
      if (txn.type === "charge" || txn.type === "payment") {
        const sourceId =
          typeof txn.source === "string" ? txn.source : txn.source?.id;
        if (sourceId) transactions.push(sourceId);
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json({ synced: 0, discrepancies: 0 });
    }

    const { data: existingEvents, error: queryErr } = await getSupabaseAdmin()
      .from("commission_events")
      .select("stripe_payment_id")
      .in("stripe_payment_id", transactions);

    if (queryErr) throw queryErr;

    const knownPaymentIds = new Set(
      ((existingEvents ?? []) as { stripe_payment_id: string }[]).map(
        (e) => e.stripe_payment_id,
      ),
    );

    const missing = transactions.filter((id) => {
      return !knownPaymentIds.has(id) &&
        !Array.from(knownPaymentIds).some((k) => k.startsWith(id));
    });

    const today = new Date().toISOString().split("T")[0];

    if (missing.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertErr } = await (getSupabaseAdmin() as any)
        .from("sync_log")
        .insert(
          missing.map((txnId) => ({
            sync_date: today,
            stripe_txn_id: txnId,
            discrepancy: "Stripe transaction has no matching commission_event",
          })),
        );

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      synced: transactions.length,
      discrepancies: missing.length,
    });
  } catch (err) {
    console.error("Stripe sync cron error:", err);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 },
    );
  }
}
