import { StatusChip, type StatusVariant } from "./StatusChip";
import { formatCurrencyINR, formatDate } from "@/lib/format";

export type ColumnType = "text" | "currency" | "date" | "select-chip" | "relation-link";

export type Column = {
  key: string;
  label: string;
  type: ColumnType;
  /** For select-chip columns: maps a raw value to a StatusChip variant. */
  chipVariant?: (value: unknown) => StatusVariant;
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
      const variant = column.chipVariant ? column.chipVariant(value) : "neutral";
      return <StatusChip label={String(value)} variant={variant} />;
    }
    case "relation-link":
      return <span className="font-semibold text-teal">{String(value)}</span>;
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
