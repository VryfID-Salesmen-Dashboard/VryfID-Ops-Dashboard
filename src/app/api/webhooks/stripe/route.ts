import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
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
