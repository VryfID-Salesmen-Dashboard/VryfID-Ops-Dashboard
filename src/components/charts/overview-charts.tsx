"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  MonthlyDataPoint,
  RepRevenuePoint,
  AcquisitionPoint,
} from "@/lib/db/overview";

const GREEN = "#4BAE8A";
const GREEN_LIGHT = "#e6f4ee";
const CHARCOAL = "#1A1A1A";
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

export function RevenueChart({ data }: { data: MonthlyDataPoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
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
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={GREEN}
            fill={GREEN_LIGHT}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CommissionExpenseChart({ data }: { data: MonthlyDataPoint[] }) {
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
            dataKey="subscriptionCommission"
            name="Subscription"
            stackId="a"
            fill={GREEN}
          />
          <Bar
            dataKey="verificationCommission"
            name="Verification"
            stackId="a"
            fill={BLUE}
          />
          <Bar
            dataKey="bonusExpense"
            name="Bonus"
            stackId="a"
            fill={AMBER}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueByRepChart({ data }: { data: RepRevenuePoint[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis type="number" tickFormatter={formatUSD} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip formatter={(v) => formatUSD(Number(v))} />
          <Bar dataKey="revenue" name="MRR" fill={GREEN} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AcquisitionChart({ data }: { data: AcquisitionPoint[] }) {
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
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip labelFormatter={(l) => String(l)} />
          <Bar
            dataKey="newClients"
            name="New clients"
            fill={CHARCOAL}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
