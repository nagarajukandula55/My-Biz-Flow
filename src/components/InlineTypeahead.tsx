"use client";

import { useEffect, useRef, useState } from "react";

export type InlineTypeaheadOption = { value: string; label: string };

/**
 * Type-straight-into-the-row free-text input with a styled suggestion
 * dropdown — the design-system-correct replacement for a native
 * `<input list="..."> + <datalist>` pair. A native datalist's popup is
 * rendered entirely by the OS/browser, not this app, so it can't be
 * styled (no Tailwind/design tokens reach it) and looks like a stray
 * plain dark box instead of the rest of the UI. This renders its own
 * absolutely-positioned `<ul>` (same bg-bg-raised/border/shadow pattern
 * SearchSelectModal already uses), while staying a plain text input the
 * caller can type anything into — no forced pick, no modal.
 */
export function InlineTypeahead({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled,
  className,
  restrictToOptions,
  invalidMessage = "No match found — pick one from the list.",
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: InlineTypeaheadOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** When true, the committed value must match an existing option's label
   * exactly (case-insensitive) — free text that doesn't match anything is
   * rejected on blur (reverted to empty) instead of being accepted as a new
   * value. Off by default so existing free-text consumers (Stock Take,
   * Return Orders' notes, etc.) are unaffected. */
  restrictToOptions?: boolean;
  /** Shown under the input, restrictToOptions only, while the typed text
   * doesn't match any option. */
  invalidMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const query = value.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query)) : options;
  const visible = filtered.slice(0, 20);

  function pick(option: InlineTypeaheadOption) {
    onChange(option.label);
    setOpen(false);
  }

  const matchesOption =
    !restrictToOptions ||
    !value.trim() ||
    options.some((o) => o.label.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion register before the list closes.
          window.setTimeout(() => setOpen(false), 120);
          if (restrictToOptions && value.trim() && !matchesOption) {
            onChange("");
          }
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (!open || visible.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, visible.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && visible[highlighted]) {
            e.preventDefault();
            pick(visible[highlighted]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {restrictToOptions && value.trim() && !matchesOption && (
        <p className="mt-1 text-[11px] text-danger">{invalidMessage}</p>
      )}
      {open && !disabled && visible.length > 0 && (
        <ul className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full min-w-[14rem] overflow-y-auto rounded-md border border-border bg-bg-raised shadow-lg">
          {visible.map((o, i) => (
            <li key={o.value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === highlighted ? "bg-bg-sunken text-text" : "text-text hover:bg-bg-sunken"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
