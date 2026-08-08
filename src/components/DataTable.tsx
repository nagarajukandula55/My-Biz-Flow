"use client";

import { StatusChip, type StatusVariant } from "./StatusChip";
import { formatCurrencyINR, formatDate } from "@/lib/format";

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
  | "password";

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
};

export type Row = Record<string, unknown>;

type DataTableProps = {
  columns: Column[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
};

function renderCell(column: Column, row: Row) {
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
    case "text":
    default:
      return <span>{String(value ?? "")}</span>;
  }
}

export function DataTable({ columns, rows, onRowClick }: DataTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-bg-raised">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-sunken">
            {columns.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border last:border-b-0 ${
                onRowClick ? "cursor-pointer hover:bg-bg-sunken" : ""
              }`}
            >
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3">
                  {renderCell(column, row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
