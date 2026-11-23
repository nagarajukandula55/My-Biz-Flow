"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Eye, SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { StatusChip, type StatusVariant } from "./StatusChip";
import { formatCurrencyINR, formatDate } from "@/lib/format";
import { QuickViewModal } from "./QuickViewModal";

export type ColumnType =
  | "text"
  | "currency"
  | "date"
  | "select-chip"
  | "relation-link"
  | "multi-chip"
  | "email"
  | "phone"
  | "url"
  | "percentage"
  | "color"
  | "rating"
  | "boolean"
  | "time"
  | "datetime"
  | "file"
  | "password"
  | "actions";

export type Column = {
  key: string;
  label: string;
  type: ColumnType;
  /**
   * For select-chip columns: maps a raw value (stringified) to a StatusChip
   * variant. A plain lookup object, not a function — this crosses the
   * server→client boundary as data, so it must stay JSON-serializable.
   */
  chipVariantMap?: Record<string, StatusVariant>;
  /**
   * For `type: "actions"` columns only: a caller-supplied render function
   * producing arbitrary interactive content (buttons, etc.) for a row. This
   * only works when Column travels through a Client Component that builds
   * it directly (e.g. ServiceCentreClientTable) rather than crossing a
   * Server->Client boundary as plain serialized data, since functions can't
   * cross that boundary — every other column type stays plain data. Any
   * click handler inside the rendered node MUST call
   * `event.stopPropagation()` if the table also has `onRowClick`, so a
   * button click doesn't also trigger row navigation.
   */
  render?: (row: Row) => ReactNode;
  /**
   * Caps a "text" column's cell width (in ch units) and truncates overflow
   * with an ellipsis (full value still available via the cell's title
   * attribute, or the row's quick-view). Use on free-text fields (remarks,
   * fault descriptions) that would otherwise force horizontal scrolling on
   * a list with many columns — narrower, fixed-shape columns don't need it.
   */
  maxWidthCh?: number;
};

export type Row = Record<string, unknown>;

type DataTableProps = {
  columns: Column[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
  /** Adds a per-row "quick view" eye icon that opens a field-grid modal
   * (see QuickViewModal) instead of navigating — an alternative to
   * onRowClick's full detail-page navigation, not a replacement for it. */
  enableQuickView?: boolean;
  /**
   * Adds a text input above the table that filters `rows` purely client-side
   * (no network call, no server round-trip per keystroke) — matches every
   * row whose stringified column values contain the query, case-insensitive.
   * Safe default for any list whose full row set is already fetched (which
   * is every DataTable caller today — none of them paginate server-side).
   * Reuses the exact input styling every other ad-hoc search box in the app
   * already uses (see PnaClientTable/LeadsClient) rather than inventing a
   * new one.
   */
  enableSearch?: boolean;
  /** Placeholder for the search input — defaults to "Search…". Only used when enableSearch is true. */
  searchPlaceholder?: string;
  /**
   * Caps how many rows render into the DOM at once, with a client-side
   * Previous/Next footer — for callers that already need the FULL row set
   * in memory for something else on the page (enableSearch filtering,
   * running totals, CSV export) and can't just swap to a server-paginated
   * query without losing that. Unlike enableSearch (which is safe with any
   * row count), this exists specifically so "fetch everything, search/sum
   * it client-side" callers don't also have to render everything — search
   * still runs across every row; only the post-filter render is capped.
   * Omit for no change (every existing caller's behavior is unaffected).
   */
  pageSize?: number;
  /** Shows the shared per-page Columns selector. Enabled by default for every
   * operational table; document/embedded tables may opt out explicitly. */
  enableColumnSelector?: boolean;
  /** Optional compact default. Users can always add any supplied column back. */
  defaultVisibleColumnKeys?: readonly string[];
  /** Override only when more than one table on the same page needs its own saved view. */
  columnSelectorStorageKey?: string;
};

export function renderCell(column: Column, row: Row) {
  const value = row[column.key];

  switch (column.type) {
    case "currency":
      return (
        <span className="font-mono tabular-nums text-text">
          {formatCurrencyINR(Number(value))}
        </span>
      );
    case "date":
      return <span className="text-text-muted">{formatDate(String(value))}</span>;
    case "select-chip": {
      const variant = column.chipVariantMap?.[String(value)] ?? "neutral";
      return <StatusChip label={String(value)} variant={variant} />;
    }
    case "relation-link":
      return <span className="font-semibold text-teal">{String(value)}</span>;
    case "multi-chip": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      if (items.length === 0) return <span className="text-text-muted">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <StatusChip key={item} label={item} variant={column.chipVariantMap?.[item] ?? "teal"} />
          ))}
        </div>
      );
    }
    case "boolean":
      return <StatusChip label={value ? "Yes" : "No"} variant={value ? "success" : "neutral"} />;
    case "email":
      return value ? (
        <a href={`mailto:${value}`} className="text-teal hover:underline">
          {String(value)}
        </a>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "phone":
      return <span className="font-mono">{String(value ?? "—")}</span>;
    case "url":
      return value ? (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal hover:underline"
        >
          {String(value)}
        </a>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "percentage":
      return <span className="font-mono tabular-nums">{value === "" || value == null ? "—" : `${value}%`}</span>;
    case "color":
      return value ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full border border-border"
            style={{ background: String(value) }}
          />
          <span className="font-mono text-xs text-text-muted">{String(value)}</span>
        </span>
      ) : (
        <span className="text-text-muted">—</span>
      );
    case "rating": {
      const n = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
      return (
        <span aria-label={`${n} out of 5`} className="text-accent">
          {"★".repeat(n)}
          <span className="text-border">{"★".repeat(5 - n)}</span>
        </span>
      );
    }
    case "time":
    case "datetime":
      return <span className="font-mono text-text-muted">{String(value ?? "—")}</span>;
    case "password":
      return <span className="font-mono text-text-muted">••••••••</span>;
    case "file":
      return <span className="text-text-muted">{value ? String(value) : "—"}</span>;
    case "actions":
      return column.render ? column.render(row) : null;
    case "text":
    default: {
      const text = String(value ?? "");
      if (column.maxWidthCh) {
        return (
          <span
            className="block overflow-hidden text-ellipsis"
            style={{ maxWidth: `${column.maxWidthCh}ch` }}
            title={text}
          >
            {text}
          </span>
        );
      }
      return <span>{text}</span>;
    }
  }
}

export function DataTable({ columns, rows, onRowClick, enableQuickView, enableSearch, searchPlaceholder, pageSize, enableColumnSelector = true, defaultVisibleColumnKeys, columnSelectorStorageKey }: DataTableProps) {
  const pathname = usePathname();
  const [quickViewRow, setQuickViewRow] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isColumnChooserOpen, setColumnChooserOpen] = useState(false);
  const defaultKeys = (defaultVisibleColumnKeys?.filter((key) => columns.some((column) => column.key === key)) ?? columns.map((column) => column.key));
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(defaultKeys.length ? defaultKeys : columns.map((column) => column.key));
  const columnSignature = columns.map((column) => column.key).join("|");
  const savedColumnsKey = columnSelectorStorageKey ?? `mbf:table-columns:${pathname}`;

  // Preferences are intentionally local to the signed-in operator's browser
  // and current page. One user can use a compact operations view without
  // changing what another staff member sees.
  useEffect(() => {
    const fallback = defaultKeys.length ? defaultKeys : columns.map((column) => column.key);
    try {
      const stored = JSON.parse(window.localStorage.getItem(savedColumnsKey) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        const valid = stored.filter((key): key is string => typeof key === "string" && columns.some((column) => column.key === key));
        setSelectedColumnKeys(valid.length ? valid : fallback);
        return;
      }
    } catch {
      // Ignore malformed legacy browser data and restore the safe default.
    }
    setSelectedColumnKeys(fallback);
  // columnSignature is deliberate: `columns` is often reconstructed on a
  // parent render, which must not reset a user's selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedColumnsKey, columnSignature]);

  const visibleColumns = columns.filter((column) => selectedColumnKeys.includes(column.key));
  const displayColumns = visibleColumns.length ? visibleColumns : columns.slice(0, 1);
  const toggleColumn = (key: string) => {
    setSelectedColumnKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      if (!next.length) return current;
      window.localStorage.setItem(savedColumnsKey, JSON.stringify(next));
      return next;
    });
  };
  const resetColumns = () => {
    window.localStorage.removeItem(savedColumnsKey);
    setSelectedColumnKeys(defaultKeys.length ? defaultKeys : columns.map((column) => column.key));
  };

  const q = search.trim().toLowerCase();
  const searchedRows = !enableSearch || !q
    ? rows
    : rows.filter((row) =>
        columns.some((column) => {
          const value = row[column.key];
          if (value == null) return false;
          const text = Array.isArray(value) ? value.join(" ") : String(value);
          return text.toLowerCase().includes(q);
        })
      );

  // A changed search query can leave `page` pointing past the new result
  // set's last page — clamp rather than let it render an empty table with
  // "Next" still somehow reachable.
  const totalPages = pageSize ? Math.max(1, Math.ceil(searchedRows.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visibleRows = !pageSize ? searchedRows : searchedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full">
      {(enableSearch || (enableColumnSelector && columns.length > 1)) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {enableSearch ? (
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder ?? "Search…"}
            className="w-full max-w-xs rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-accent sm:w-72"
          />
          ) : <span />}
          {enableColumnSelector && columns.length > 1 && (
            <div className="relative">
              <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setColumnChooserOpen((open) => !open)} aria-expanded={isColumnChooserOpen}>
                <SlidersHorizontal className="h-4 w-4" /> Columns
              </button>
              {isColumnChooserOpen && (
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-bg-raised p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-text">Show columns</p>
                    <button type="button" className="text-xs font-medium text-teal hover:underline" onClick={resetColumns}>Reset</button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {columns.map((column) => (
                      <label key={column.key} className="flex cursor-pointer items-center gap-2 text-sm text-text">
                        <input type="checkbox" checked={selectedColumnKeys.includes(column.key)} onChange={() => toggleColumn(column.key)} />
                        {column.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-bg-raised">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-sunken">
            {displayColumns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {column.label}
              </th>
            ))}
            {enableQuickView && <th className="w-10 px-2 py-3" />}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border last:border-b-0 ${
                onRowClick ? "cursor-pointer hover:bg-bg-sunken" : ""
              }`}
            >
              {displayColumns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3">
                  {renderCell(column, row)}
                </td>
              ))}
              {enableQuickView && (
                <td className="px-2 py-3 text-center">
                  <button
                    type="button"
                    aria-label="Quick view"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickViewRow(row);
                    }}
                    className="rounded p-1 text-text-muted hover:bg-bg-sunken hover:text-text"
                  >
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {enableQuickView && (
        <QuickViewModal
          open={quickViewRow !== null}
          onClose={() => setQuickViewRow(null)}
          columns={displayColumns}
          row={quickViewRow}
          title={quickViewRow ? String(quickViewRow[displayColumns[0]?.key] ?? "Quick view") : "Quick view"}
        />
      )}
      </div>
      {pageSize && searchedRows.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-text-muted">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(searchedRows.length, currentPage * pageSize)} of {searchedRows.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className={`rounded-md border border-border px-3 py-1.5 ${currentPage <= 1 ? "opacity-40" : "hover:bg-bg-sunken"}`}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className={`rounded-md border border-border px-3 py-1.5 ${currentPage >= totalPages ? "opacity-40" : "hover:bg-bg-sunken"}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
