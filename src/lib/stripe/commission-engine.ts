import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ClientRow, CommissionEventRow } from "@/types/database";
import { VERIFICATION_RATE } from "@/lib/commissions";

export async function findClientByStripeId(
  stripeCustomerId: string,
): Promise<ClientRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("clients")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<ClientRow>();

  if (error) throw error;
  return data ?? null;
}

export async function createCommissionEvent(event: {
  salesRepId: string;
  clientId: string;
  stripePaymentId: string;
  eventType: "subscription" | "verification";
  paymentAmount: number;
  commissionRate: number;
  periodStart: string;
  periodEnd: string;
}): Promise<CommissionEventRow> {
  const commissionAmount = Number(
    (event.paymentAmount * event.commissionRate).toFixed(2),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabaseAdmin() as any)
    .from("commission_events")
    .insert({
      sales_rep_id: event.salesRepId,
      client_id: event.clientId,
      stripe_payment_id: event.stripePaymentId,
      event_type: event.eventType,
      payment_amount: event.paymentAmount.toFixed(2),
      commission_rate: event.commissionRate.toFixed(4),
      commission_amount: commissionAmount.toFixed(2),
      period_start: event.periodStart,
      period_end: event.periodEnd,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as CommissionEventRow;
}

export function isWithinCommissionWindow(client: ClientRow): boolean {
  return new Date() <= new Date(client.commission_end_date);
}

export function toDateString(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split("T")[0];
}

export async function markClientChurned(clientId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("clients")
    .update({
      status: "churned",
      churned_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", clientId);

  if (error) throw error;
}

export async function voidCommissionByStripePayment(
  stripePaymentId: string,
  reason: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (getSupabaseAdmin() as any)
    .from("commission_events")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      void_reason: reason,
    })
    .eq("stripe_payment_id", stripePaymentId)
    .neq("status", "voided");

  if (error) throw error;
}

export async function createOffsetCommission(
  stripePaymentId: string,
  refundAmount: number,
): Promise<void> {
  const { data: originals, error: fetchErr } = await getSupabaseAdmin()
    .from("commission_events")
    .select("*")
    .eq("stripe_payment_id", stripePaymentId)
    .neq("status", "voided");

  if (fetchErr) throw fetchErr;
  if (!originals || originals.length === 0) return;

  for (const orig of originals as CommissionEventRow[]) {
    const rate = Number(orig.commission_rate);
    const offsetAmount = Number((refundAmount * rate).toFixed(2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (getSupabaseAdmin() as any)
      .from("commission_events")
      .insert({
        sales_rep_id: orig.sales_rep_id,
        client_id: orig.client_id,
        stripe_payment_id: `${stripePaymentId}_refund`,
        event_type: orig.event_type,
        payment_amount: (-refundAmount).toFixed(2),
        commission_rate: orig.commission_rate,
        commission_amount: (-offsetAmount).toFixed(2),
        period_start: orig.period_start,
        period_end: orig.period_end,
        status: "pending",
      });

    if (error) throw error;
  }
}
