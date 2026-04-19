import type { SalesRepTier } from "@/types/database";

const TIER_THRESHOLDS: { tier: SalesRepTier; minClients: number }[] = [
  { tier: "elite", minClients: 50 },
  { tier: "proven", minClients: 20 },
  { tier: "starter", minClients: 1 },
];

const TIER_RATES: Record<SalesRepTier, string> = {
  starter: "0.2500",
  proven: "0.3000",
  elite: "0.3500",
};

const TIER_RANK: Record<SalesRepTier, number> = {
  starter: 0,
  proven: 1,
  elite: 2,
};

export function tierForClientCount(count: number): SalesRepTier {
  for (const { tier, minClients } of TIER_THRESHOLDS) {
    if (count >= minClients) return tier;
  }
  return "starter";
}

export function rateForTier(tier: SalesRepTier): string {
  return TIER_RATES[tier];
}

export function shouldUpgradeTier(
  currentTier: SalesRepTier,
  newTier: SalesRepTier,
): boolean {
  return TIER_RANK[newTier] > TIER_RANK[currentTier];
}

export function commissionEndDate(signDate: string): string {
  const d = new Date(signDate);
  d.setMonth(d.getMonth() + 12);
  return d.toISOString().split("T")[0];
}

export const VERIFICATION_RATE = "0.1200";
