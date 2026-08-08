"use client";

import { useState } from "react";
import { MODULES } from "@/lib/designer/modules";
import { PLAN_TIERS, type PlanTier } from "@/lib/designer/vendorTypesData";

const TIER_LABEL: Record<PlanTier, string> = { basic: "Basic", pro: "Pro", ultimate: "Ultimate" };

/**
 * A Vendor Type's own module set AND its own Basic/Pro/Ultimate page
 * breakdown, edited together — checking a module surfaces its pages for
 * tier assignment; unchecking hides (and clears) them. Deliberately not a
 * shared/global tier list: every Vendor Type proposes its own three tiers
 * from only its own pages (confirmed 2026-08-08).
 */
export function ModulesAndTiersEditor({
  pagesByModule,
  initialModules = [],
  initialPlanTierByPage = {},
}: {
  pagesByModule: { moduleSlug: string; pages: { id: string; title: string }[] }[];
  initialModules?: string[];
  initialPlanTierByPage?: Record<string, PlanTier>;
}) {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set(initialModules));
  const [tiers, setTiers] = useState<Record<string, PlanTier>>(initialPlanTierByPage);

  function toggleModule(slug: string) {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function setTier(pageId: string, tier: PlanTier) {
    setTiers((prev) => ({ ...prev, [pageId]: tier }));
  }

  const pagesByModuleMap = new Map(pagesByModule.map((m) => [m.moduleSlug, m.pages]));
  const activeTierEntries = Object.fromEntries(
    Object.entries(tiers).filter(([pageId]) =>
      pagesByModule.some((m) => selectedModules.has(m.moduleSlug) && m.pages.some((p) => p.id === pageId))
    )
  );

  return (
    <div>
      <input type="hidden" name="defaultModules" value={Array.from(selectedModules).join(",")} />
      <input type="hidden" name="planTierByPage" value={JSON.stringify(activeTierEntries)} />

      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">
        Default Modules &amp; Plan Tiers
      </label>
      <p className="mb-3 text-xs text-text-muted">
        Check a module to include it, then set which plan tier (Basic / Pro / Ultimate) unlocks each of its
        pages for this Vendor Type specifically.
      </p>

      <div className="space-y-4">
        {MODULES.map((m) => {
          const checked = selectedModules.has(m.slug);
          const pages = pagesByModuleMap.get(m.slug) ?? [];
          return (
            <div key={m.slug} className="rounded-md border border-border bg-bg-raised">
              <label className="flex items-center gap-2 border-b border-border bg-bg-sunken px-4 py-2.5 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleModule(m.slug)}
                  className="h-4 w-4 accent-accent"
                />
                {m.label}
              </label>
              {checked && pages.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-2">Page</th>
                      {PLAN_TIERS.map((t) => (
                        <th key={t} className="px-3 py-2 text-center">
                          {TIER_LABEL[t]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr key={page.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2 text-text">{page.title}</td>
                        {PLAN_TIERS.map((t) => (
                          <td key={t} className="px-3 py-2 text-center">
                            <input
                              type="radio"
                              name={`tier-${page.id}`}
                              checked={tiers[page.id] === t}
                              onChange={() => setTier(page.id, t)}
                              className="h-4 w-4 accent-accent"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
