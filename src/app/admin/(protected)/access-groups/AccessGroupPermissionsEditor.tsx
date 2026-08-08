"use client";

import { useState } from "react";
import { MODULES } from "@/lib/designer/modules";
import { PAGE_ACTIONS, type PageAction, type PagePermission } from "@/lib/designer/accessGroupsData";

const ACTION_LABEL: Record<PageAction, string> = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
  other: "Other",
};

const MODULE_LABEL = new Map(MODULES.map((m) => [m.slug, m.label]));

/**
 * Per-page, per-action permission matrix for an Access Group — pick exactly
 * which pages (not just which modules) are granted, and which actions on
 * each. Local state only (demo stub, no persistence yet — same pattern as
 * every other form in this codebase).
 */
export function AccessGroupPermissionsEditor({
  pagesByModule,
  initialPermissions = [],
}: {
  pagesByModule: { moduleSlug: string; pages: { id: string; title: string }[] }[];
  initialPermissions?: PagePermission[];
}) {
  const initialMap = new Map(initialPermissions.map((p) => [p.pageId, p]));
  const [permissions, setPermissions] = useState<Map<string, PagePermission>>(initialMap);

  function getPerm(pageId: string): PagePermission {
    return permissions.get(pageId) ?? { pageId, view: false, edit: false, delete: false, other: false };
  }

  function toggle(pageId: string, action: PageAction) {
    setPermissions((prev) => {
      const next = new Map(prev);
      const current = next.get(pageId) ?? { pageId, view: false, edit: false, delete: false, other: false };
      next.set(pageId, { ...current, [action]: !current[action] });
      return next;
    });
  }

  function toggleModule(moduleSlug: string, pages: { id: string }[], grant: boolean) {
    setPermissions((prev) => {
      const next = new Map(prev);
      for (const p of pages) {
        next.set(p.id, { pageId: p.id, view: grant, edit: grant, delete: grant, other: grant });
      }
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Page Permissions</h2>
        <p className="text-xs text-text-muted">Pick pages and which actions are allowed on each.</p>
      </div>

      <input type="hidden" name="pagePermissions" value={JSON.stringify(Array.from(permissions.values()))} />

      <div className="mt-4 space-y-6">
        {pagesByModule.map(({ moduleSlug, pages }) => (
          <div key={moduleSlug} className="rounded-md border border-border bg-bg-raised">
            <div className="flex items-center justify-between border-b border-border bg-bg-sunken px-4 py-2.5">
              <span className="text-sm font-semibold text-text">{MODULE_LABEL.get(moduleSlug) ?? moduleSlug}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-accent hover:underline"
                  onClick={() => toggleModule(moduleSlug, pages, true)}
                >
                  Grant all
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-text-muted hover:underline"
                  onClick={() => toggleModule(moduleSlug, pages, false)}
                >
                  Clear all
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2">Page</th>
                  {PAGE_ACTIONS.map((a) => (
                    <th key={a} className="px-3 py-2 text-center">
                      {ACTION_LABEL[a]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => {
                  const perm = getPerm(page.id);
                  return (
                    <tr key={page.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 text-text">{page.title}</td>
                      {PAGE_ACTIONS.map((a) => (
                        <td key={a} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm[a]}
                            onChange={() => toggle(page.id, a)}
                            className="h-4 w-4 accent-accent"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
