import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function fingerprintSecret(value: string | undefined) {
  if (!value) return { set: false as const };
  return {
    set: true as const,
    length: value.length,
    prefix: value.slice(0, 10),
    suffix: value.slice(-4),
    starts_with_whsec: value.startsWith("whsec_"),
    has_leading_whitespace: value !== value.trimStart(),
    has_trailing_whitespace: value !== value.trimEnd(),
    has_surrounding_quotes:
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")),
  };
}

function fingerprintStripeKey(value: string | undefined) {
  if (!value) return { set: false as const };
  const mode = value.startsWith("sk_live_")
    ? "live"
    : value.startsWith("sk_test_")
      ? "test"
      : "unknown";
  return {
    set: true as const,
    length: value.length,
    mode,
    prefix: value.slice(0, 8),
    has_whitespace: value !== value.trim(),
  };
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    deployment: {
      vercel_env: process.env.VERCEL_ENV ?? "local",
      vercel_url: process.env.VERCEL_URL ?? null,
      node_env: process.env.NODE_ENV,
    },
    stripe_webhook_secret: fingerprintSecret(process.env.STRIPE_WEBHOOK_SECRET),
    stripe_secret_key: fingerprintStripeKey(process.env.STRIPE_SECRET_KEY),
  });
}
