import type { ReactNode } from "react";
import { LogoMark } from "./LogoMark";

export type NavDotVariant = "teal" | "amber" | "neutral";

export type NavItem = {
  key: string;
  label: string;
  dot: NavDotVariant;
  active?: boolean;
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

type AppShellProps = {
  navGroups: NavGroup[];
  topbarTitle: string;
  topbarActions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ navGroups, topbarTitle, topbarActions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-64 flex-shrink-0 flex-col bg-sidebar-bg">
        <div className="flex items-center gap-2 px-5 py-5">
          <LogoMark size={20} />
          <span className="font-display text-base font-extrabold text-sidebar-text">
            My Biz Flow
          </span>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-sidebar-text-dim">
                {group.title}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.key}>
                    <div
                      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium ${
                        item.active
                          ? "bg-sidebar-active text-sidebar-text"
                          : "text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOT_CLASS[item.dot]}`} />
                      {item.label}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">{topbarTitle}</h1>
          {topbarActions}
        </header>
        <main className="mbf-page flex-1 bg-bg">{children}</main>
      </div>
    </div>
  );
}
