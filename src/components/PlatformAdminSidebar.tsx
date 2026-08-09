"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import {
  LayoutGrid,
  Hash,
  Settings as SettingsIcon,
  AlertTriangle,
  CreditCard,
  Users,
  ShieldCheck,
  KeyRound,
  Building2,
  UserCheck,
  Percent,
} from "lucide-react";
import { LogoMark } from "./LogoMark";
import { signOutAdminAction } from "@/app/admin/login/actions";
import { ThemeToggle } from "./ThemeToggle";

type PlatformNavItem = {
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutGrid;
};

const NAV_ITEMS: PlatformNavItem[] = [
  { key: "designer", label: "Designer", href: "/admin/designer", icon: LayoutGrid },
  { key: "numbering", label: "Numbering", href: "/admin/numbering", icon: Hash },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: SettingsIcon },
  { key: "errors", label: "Error Log", href: "/admin/errors", icon: AlertTriangle },
  { key: "plans", label: "Plans", href: "/admin/plans", icon: CreditCard },
  { key: "offers", label: "Offers", href: "/admin/offers", icon: Percent },
  { key: "subscribers", label: "Subscribers", href: "/admin/subscribers", icon: Users },
  { key: "vendor-types", label: "Vendor Types", href: "/admin/vendor-types", icon: Building2 },
  { key: "vendor-signups", label: "Signup Requests", href: "/admin/vendor-signups", icon: UserCheck },
  { key: "access-groups", label: "Access Groups", href: "/admin/access-groups", icon: KeyRound },
  { key: "roles", label: "Roles", href: "/admin/roles", icon: ShieldCheck },
];

/**
 * The Super Admin sidebar — same collapsible/persistent pattern as the
 * vendor Sidebar.tsx (see that file's header): rendered once from
 * src/app/admin/(protected)/layout.tsx so it survives client-side
 * navigation between platform admin sections instead of remounting.
 */
export function PlatformAdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar-bg print:hidden">
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark size={18} />
        <span className="font-display text-sm font-extrabold text-sidebar-text">My Biz Flow</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
        <div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-between rounded-md px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-text-dim hover:text-sidebar-text"
          >
            Platform Admin
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
              strokeWidth={2.5}
            />
          </button>
          {!collapsed && (
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${
                        active
                          ? "bg-sidebar-active text-sidebar-text"
                          : "text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-accent" strokeWidth={2.25} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-text-dim">
            Vendor View
          </div>
          <Link
            href="/vendor/demo/dashboard"
            className="block rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
          >
            ← Back to demo vendor
          </Link>
        </div>
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-active/60 px-2.5 py-2.5">
        <ThemeToggle />
        <form action={signOutAdminAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.25} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
