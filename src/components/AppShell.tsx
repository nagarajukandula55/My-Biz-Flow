"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { LogoMark } from "./LogoMark";
import { getIconComponent } from "@/lib/designer/icons";
import { signOutAction } from "@/app/login/actions";
import { ThemeToggle } from "./ThemeToggle";

export type NavDotVariant = "teal" | "amber" | "neutral";

export type NavSubItem = {
  key: string;
  label: string;
  /** Path segment(s) relative to /vendor/[vendorId]/, e.g. "billing/new". */
  href: string;
};

export type NavItem = {
  key: string;
  label: string;
  dot: NavDotVariant;
  /** Super-Admin-set icon override (src/lib/designer/icons.ts key) — falls back to the dot when unset. */
  icon?: string;
  active?: boolean;
  /** Path segment(s) relative to /vendor/[vendorId]/. Defaults to `key`. */
  href?: string;
  subItems?: NavSubItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

const DOT_CLASS: Record<NavDotVariant, string> = {
  teal: "bg-teal",
  amber: "bg-accent",
  neutral: "bg-text-muted",
};

const ICON_CLASS: Record<NavDotVariant, string> = {
  teal: "text-teal",
  amber: "text-accent",
  neutral: "text-text-muted",
};

type AppShellProps = {
  /** Needed to build every nav link's href (/vendor/[vendorId]/...). */
  vendorId: string;
  navGroups: NavGroup[];
  topbarTitle: string;
  topbarActions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ vendorId, navGroups, topbarTitle, topbarActions, children }: AppShellProps) {
  const pathname = usePathname();

  // Groups start expanded; a user can collapse ones they don't need.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // Per-module sub-item lists start expanded only for the active module.
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.subItems && item.active) initial[item.key] = true;
      }
    }
    return initial;
  });

  function toggleGroup(title: string) {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  function toggleItem(key: string) {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function hrefFor(relative: string) {
    return `/vendor/${vendorId}/${relative}`;
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar-bg">
        <div className="flex items-center gap-2 px-4 py-4">
          <LogoMark size={18} />
          <span className="font-display text-sm font-extrabold text-sidebar-text">
            My Biz Flow
          </span>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.title];
            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="flex w-full items-center justify-between rounded-md px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-text-dim hover:text-sidebar-text"
                >
                  {group.title}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                    strokeWidth={2.5}
                  />
                </button>
                {!isCollapsed && (
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = getIconComponent(item.icon);
                      const itemHref = hrefFor(item.href ?? item.key);
                      const hasSubItems = item.subItems && item.subItems.length > 0;
                      const isExpanded = expandedItems[item.key];
                      return (
                        <li key={item.key}>
                          <div
                            className={`group flex items-center gap-1 rounded-md pr-1 text-[13px] font-medium ${
                              item.active
                                ? "bg-sidebar-active text-sidebar-text"
                                : "text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
                            }`}
                          >
                            <Link href={itemHref} className="flex flex-1 items-center gap-2 px-2.5 py-1.5">
                              {Icon ? (
                                <Icon
                                  className={`h-3.5 w-3.5 flex-shrink-0 ${ICON_CLASS[item.dot]}`}
                                  strokeWidth={2.25}
                                />
                              ) : (
                                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_CLASS[item.dot]}`} />
                              )}
                              {item.label}
                            </Link>
                            {hasSubItems && (
                              <button
                                type="button"
                                onClick={() => toggleItem(item.key)}
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                className="rounded p-1 text-sidebar-text-dim hover:text-sidebar-text"
                              >
                                <ChevronDown
                                  className={`h-3 w-3 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                                  strokeWidth={2.5}
                                />
                              </button>
                            )}
                          </div>
                          {hasSubItems && isExpanded && (
                            <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-active/60 pl-3">
                              {item.subItems!.map((sub) => {
                                const subHref = hrefFor(sub.href);
                                const subActive = pathname === subHref;
                                return (
                                  <li key={sub.key}>
                                    <Link
                                      href={subHref}
                                      className={`block rounded-md px-2 py-1 text-[12px] font-medium ${
                                        subActive
                                          ? "text-sidebar-text"
                                          : "text-sidebar-text-dim hover:text-sidebar-text"
                                      }`}
                                    >
                                      {sub.label}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="space-y-0.5 border-t border-sidebar-active/60 px-2.5 py-2.5">
          <ThemeToggle />
          <form action={signOutAction}>
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-3">
          <h1 className="font-display text-base font-bold text-text">{topbarTitle}</h1>
          {topbarActions}
        </header>
        <main className="mbf-page min-w-0 flex-1 bg-bg">{children}</main>
      </div>
    </div>
  );
}
