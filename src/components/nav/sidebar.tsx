"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BadgeDollarSign,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/reps", label: "Sales reps", icon: Users },
  { href: "/admin/clients", label: "Clients", icon: Building2 },
  { href: "/admin/commissions", label: "Commissions", icon: CircleDollarSign },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet },
  { href: "/admin/bonuses", label: "Bonuses", icon: Trophy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export const REP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/clients", label: "My clients", icon: Building2 },
  { href: "/dashboard/earnings", label: "Earnings", icon: BadgeDollarSign },
  { href: "/dashboard/payouts", label: "Payouts", icon: Receipt },
  { href: "/dashboard/bonuses", label: "Bonuses", icon: Trophy },
];

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/admin" &&
            item.href !== "/dashboard" &&
            pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-green-muted text-brand-charcoal"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-brand-charcoal",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarBrand({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-5">
      <div className="h-7 w-7 rounded-md bg-brand-green" aria-hidden />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-brand-charcoal">
          VryfID Ops
        </span>
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

export function Sidebar({
  items,
  roleLabel,
}: {
  items: NavItem[];
  roleLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <SidebarBrand roleLabel={roleLabel} />
        <nav className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} pathname={pathname} />
        </nav>
      </aside>

      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-md border border-neutral-200 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-brand-charcoal" />
      </button>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand roleLabel={roleLabel} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 hover:bg-neutral-100"
              >
                <X className="h-5 w-5 text-neutral-600" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <NavLinks
                items={items}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
