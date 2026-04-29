import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { getRepByEmail, updateRep } from "@/lib/db/reps";

export const runtime = "nodejs";

type ClerkEmailAddress = { id: string; email_address: string };
type ClerkUserCreatedData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id?: string | null;
};
type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserCreatedData;
};

export async function POST(req: Request) {
  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SIGNING_SECRET not configured" },
      { status: 500 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(signingSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Clerk webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  try {
    const user = event.data;
    const primary = user.email_addresses.find(
      (e) => e.id === user.primary_email_address_id,
    );
    const email = (primary ?? user.email_addresses[0])?.email_address;

    if (!email) {
      console.warn("Clerk user.created event without an email", user.id);
      return NextResponse.json({ received: true, linked: false });
    }

    const rep = await getRepByEmail(email);
    if (!rep) {
      return NextResponse.json({ received: true, linked: false });
    }

    if (rep.clerk_user_id === user.id) {
      return NextResponse.json({ received: true, linked: true, alreadyLinked: true });
    }

    await updateRep(rep.id, { clerk_user_id: user.id });
    return NextResponse.json({ received: true, linked: true, repId: rep.id });
  } catch (err) {
    console.error("Clerk webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
