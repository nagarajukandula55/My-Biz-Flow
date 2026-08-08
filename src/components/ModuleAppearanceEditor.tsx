"use client";

import { useState, useTransition } from "react";
import { ICON_NAMES, getIconComponent } from "@/lib/designer/icons";
import { setModuleAppearanceAction } from "@/lib/designer/actions";

export function ModuleAppearanceEditor({
  slug,
  defaultLabel,
  initialLabel,
  initialIcon,
}: {
  slug: string;
  defaultLabel: string;
  initialLabel?: string;
  initialIcon?: string;
}) {
  const [label, setLabel] = useState(initialLabel ?? defaultLabel);
  const [icon, setIcon] = useState(initialIcon ?? "");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const filteredIcons = query
    ? ICON_NAMES.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : ICON_NAMES;

  function handleSave() {
    startTransition(async () => {
      await setModuleAppearanceAction(slug, { label: label.trim(), icon: icon || undefined });
      setSaved(true);
    });
  }

  const SelectedIcon = getIconComponent(icon);

  return (
    <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-text">Module appearance</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs font-semibold text-success">Saved</span>}
          <button type="button" onClick={handleSave} disabled={isPending} className="btn-accent px-3 py-1.5 text-xs">
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <p className="mt-1 max-w-[65ch] text-xs text-text-muted">
        Applies everywhere this module&apos;s name and sidebar entry appear — topbar title, nav,
        and page headings — not just this one page.
      </p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Label
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setSaved(false);
              }}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          </label>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-bg">
              {SelectedIcon ? (
                <SelectedIcon className="h-5 w-5 text-teal" strokeWidth={2} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              )}
            </div>
            <span className="text-xs text-text-muted">
              {icon || "No icon set — sidebar dot is used"}
            </span>
            {icon && (
              <button
                type="button"
                onClick={() => {
                  setIcon("");
                  setSaved(false);
                }}
                className="text-xs font-semibold text-danger hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-[2]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons…"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <div className="mt-2 grid max-h-56 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border border-border bg-bg p-2 sm:grid-cols-10">
            {filteredIcons.map((name) => {
              const Icon = getIconComponent(name);
              if (!Icon) return null;
              const isSelected = icon === name;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    setIcon(name);
                    setSaved(false);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : "border-transparent hover:border-border hover:bg-bg-sunken"
                  }`}
                >
                  <Icon className="h-4 w-4 text-text" strokeWidth={2} />
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-text-muted">{filteredIcons.length} icons</p>
        </div>
      </div>
    </div>
  );
}
