"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { RepMonthlyEarning } from "@/lib/db/rep-dashboard";

const GREEN = "#4BAE8A";
const BLUE = "#5b8def";
const AMBER = "#f59e0b";

function formatUSD(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function formatMonth(month: string): string {
  const [, m] = month.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(m, 10) - 1] ?? m;
}

export function RepEarningsChart({ data }: { data: RepMonthlyEarning[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 12 }}
          />
          <YAxis tickFormatter={formatUSD} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v) => formatUSD(Number(v))}
            labelFormatter={(l) => String(l)}
          />
          <Legend />
          <Bar
            dataKey="subscription"
            name="Subscription"
            stackId="a"
            fill={GREEN}
          />
          <Bar
            dataKey="verification"
            name="Verification"
            stackId="a"
            fill={BLUE}
          />
          <Bar
            dataKey="bonus"
            name="Bonus"
            stackId="a"
            fill={AMBER}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
