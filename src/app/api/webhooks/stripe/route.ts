import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import {
  findClientByStripeId,
  createCommissionEvent,
  isWithinCommissionWindow,
  toDateString,
  markClientChurned,
  voidCommissionByStripePayment,
  createOffsetCommission,
} from "@/lib/stripe/commission-engine";
import { VERIFICATION_RATE } from "@/lib/commissions";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("Stripe webhook signature verification failed:", msg);
    console.error("Sig header:", sig?.substring(0, 20) + "...");
    console.error("Body length:", body.length);
    console.error("Secret starts with:", webhookSecret.substring(0, 10) + "...");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: "Internal handler error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) return;

  const client = await findClientByStripeId(customerId);
  if (!client) {
    console.warn(`No VryfID client found for Stripe customer ${customerId}`);
    return;
  }

  if (!isWithinCommissionWindow(client)) return;

  const invoiceId = invoice.id ?? `inv_unknown_${Date.now()}`;
  const periodStart = toDateString(
    invoice.period_start ?? Math.floor(Date.now() / 1000),
  );
  const periodEnd = toDateString(
    invoice.period_end ?? Math.floor(Date.now() / 1000),
  );

  if (!invoice.lines?.data) return;

  for (const lineItem of invoice.lines.data) {
    const amount = (lineItem.amount ?? 0) / 100;
    if (amount <= 0) continue;

    const isSubscription =
      lineItem.parent?.type === "subscription_item_details";

    const eventType = isSubscription ? "subscription" : "verification";
    const commissionRate = isSubscription
      ? Number(client.commission_rate_locked)
      : Number(VERIFICATION_RATE);

    await createCommissionEvent({
      salesRepId: client.sales_rep_id,
      clientId: client.id,
      stripePaymentId: `${invoiceId}_${lineItem.id}`,
      eventType,
      paymentAmount: amount,
      commissionRate,
      periodStart,
      periodEnd,
    });
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  // Subscription invoices fire both invoice.payment_succeeded and charge.succeeded.
  // Skip the charge to avoid double-counting; the invoice handler covers it.
  // The `invoice` field exists on the Stripe API response but was dropped from
  // the SDK's TypeScript types — assert to access it safely.
  const invoiceRef = (
    charge as { invoice?: string | Stripe.Invoice | null }
  ).invoice;
  if (invoiceRef) return;

  const customerId =
    typeof charge.customer === "string"
      ? charge.customer
      : charge.customer?.id;

  if (!customerId) return;

  const client = await findClientByStripeId(customerId);
  if (!client) {
    console.warn(`No VryfID client found for Stripe customer ${customerId}`);
    return;
  }

  if (!isWithinCommissionWindow(client)) return;

  const amount = (charge.amount ?? 0) / 100;
  if (amount <= 0) return;

  const date = toDateString(charge.created);

  await createCommissionEvent({
    salesRepId: client.sales_rep_id,
    clientId: client.id,
    stripePaymentId: charge.id,
    eventType: "verification",
    paymentAmount: amount,
    commissionRate: Number(VERIFICATION_RATE),
    periodStart: date,
    periodEnd: date,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return;

  const client = await findClientByStripeId(customerId);
  if (!client) return;

  await markClientChurned(client.id);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const chargeId = charge.id;
  const amountRefunded = (charge.amount_refunded ?? 0) / 100;
  const amountTotal = (charge.amount ?? 0) / 100;

  if (amountRefunded >= amountTotal) {
    await voidCommissionByStripePayment(chargeId, "Full refund");
  } else {
    await createOffsetCommission(chargeId, amountRefunded);
  }
}
