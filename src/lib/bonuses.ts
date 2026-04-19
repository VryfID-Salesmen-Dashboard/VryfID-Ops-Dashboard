export function acquisitionBonus(newClients: number): number {
  if (newClients >= 11) return 5000;
  if (newClients >= 7) return 3000;
  if (newClients >= 4) return 1500;
  if (newClients >= 1) return 500;
  return 0;
}

export function volumeBonus(totalVerifications: number): number {
  if (totalVerifications >= 2001) return 5000;
  if (totalVerifications >= 801) return 3500;
  if (totalVerifications >= 301) return 1500;
  if (totalVerifications >= 1) return 500;
  return 0;
}

export function retentionBonus(retentionRate: number | null): number {
  if (retentionRate === null) return 0;
  if (retentionRate >= 0.95) return 2000;
  if (retentionRate >= 0.90) return 1000;
  if (retentionRate >= 0.80) return 500;
  return 0;
}

export const MAX_QUARTERLY_BONUS = 12000;

export function currentQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${q}`;
}

export function quarterDateRange(quarter: string): {
  start: string;
  end: string;
} {
  const [yearStr, qStr] = quarter.split("-Q");
  const year = parseInt(yearStr, 10);
  const q = parseInt(qStr, 10);
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}
