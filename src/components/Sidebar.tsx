"use client";

import { useState } from "react";
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

/**
 * The vendor sidebar — lives in src/app/vendor/[vendorId]/layout.tsx (a
 * shared layout), NOT inside AppShell/each page, so it persists across
 * client-side navigations instead of unmounting and remounting on every
 * click (which reset collapse state and caused a visible full-shell
 * flash — see AppShell.tsx's history). Active-state highlighting is
 * computed here from the current pathname rather than passed down as a
 * static server-computed flag, since one Sidebar instance now serves
 * every page in the vendor section.
 */
export function Sidebar({ vendorId, navGroups }: { vendorId: string; navGroups: NavGroup[] }) {
  const pathname = usePathname();

  function hrefFor(relative: string) {
    return `/vendor/${vendorId}/${relative}`;
  }

  function isActive(relative: string) {
    const href = hrefFor(relative);
    return pathname === href || pathname === `${href}/`;
  }

  // Groups start expanded; a user can collapse ones they don't need.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // Per-module sub-item lists start expanded only when a sub-item under
  // them is the current page.
  const [manuallyToggled, setManuallyToggled] = useState<Record<string, boolean>>({});

  function toggleGroup(title: string) {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  }

  function toggleItem(key: string) {
    setManuallyToggled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar-bg print:hidden">
      <div className="flex items-center gap-2 px-4 py-4">
        <LogoMark size={18} />
        <span className="font-display text-sm font-extrabold text-sidebar-text">My Biz Flow</span>
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
                    const itemRelative = item.href ?? item.key;
                    const itemHref = hrefFor(itemRelative);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const subActive = hasSubItems && item.subItems!.some((s) => isActive(s.href));
                    const active = isActive(itemRelative) || subActive;
                    const isExpanded = manuallyToggled[item.key] ?? subActive;
                    return (
                      <li key={item.key}>
                        <div
                          className={`group flex items-center gap-1 rounded-md pr-1 text-[13px] font-medium ${
                            active
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
                              const active2 = isActive(sub.href);
                              return (
                                <li key={sub.key}>
                                  <Link
                                    href={subHref}
                                    className={`block rounded-md px-2 py-1 text-[12px] font-medium ${
                                      active2 ? "text-sidebar-text" : "text-sidebar-text-dim hover:text-sidebar-text"
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
  );
}
