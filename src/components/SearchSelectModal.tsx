"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "./Modal";

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Optional secondary line, e.g. a material's rate or a customer's phone. */
  sublabel?: string;
};

type SearchSelectModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SearchSelectOption[];
  onSelect: (option: SearchSelectOption) => void;
  searchPlaceholder?: string;
};

/**
 * Search-and-select picker for lookups that outgrow a plain <select> —
 * customer, material, warehouse, etc. once the underlying list gets long.
 * Filters client-side on label+sublabel; swap in a server search if a
 * real backend list ever gets too large to load in one page.
 */
export function SearchSelectModal({
  open,
  onClose,
  title,
  options,
  onSelect,
  searchPlaceholder = "Search…",
}: SearchSelectModalProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)
    );
  }, [options, query]);

  function handleSelect(option: SearchSelectOption) {
    onSelect(option);
    setQuery("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" strokeWidth={2} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <ul className="mt-3 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-text-muted">No matches.</li>
        ) : (
          filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => handleSelect(o)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm text-text hover:bg-bg-sunken"
              >
                <span className="font-medium">{o.label}</span>
                {o.sublabel && <span className="text-xs text-text-muted">{o.sublabel}</span>}
              </button>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
