"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type Row, type Column } from "@/components/DataTable";
import { BOM_DEFAULT_LIST_COLUMN_KEYS, bomColumns } from "@/lib/sample-data/bom";

export function BomClientTable({ partnerId, columns, rows }: { partnerId: string; columns?: Column[]; rows: Row[] }) {
  const router = useRouter();
  const availableColumns = columns ?? bomColumns;
  const storageKey = `mbf:bom-columns:${partnerId}`;
  const defaultKeys = useMemo(
    () => availableColumns.filter((column) => BOM_DEFAULT_LIST_COLUMN_KEYS.includes(column.key as typeof BOM_DEFAULT_LIST_COLUMN_KEYS[number])).map((column) => column.key),
    [availableColumns]
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>(defaultKeys);
  const [isChooserOpen, setChooserOpen] = useState(false);

  // Column choices are per business and browser, so a store operator can
  // keep their preferred operational view without changing another user's.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as unknown;
      if (Array.isArray(saved)) {
        const valid = saved.filter((key): key is string => typeof key === "string" && availableColumns.some((column) => column.key === key));
        if (valid.length) setSelectedKeys(valid);
      }
    } catch {
      // A malformed old browser preference simply falls back to the safe default.
    }
  }, [availableColumns, storageKey]);

  const visibleColumns = availableColumns.filter((column) => selectedKeys.includes(column.key));
  const toggleColumn = (key: string) => {
    setSelectedKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      // Keep at least one column visible; a table with no identifying data is
      // not a useful saved preference.
      if (!next.length) return current;
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };
  const resetColumns = () => {
    window.localStorage.removeItem(storageKey);
    setSelectedKeys(defaultKeys);
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="relative">
          <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setChooserOpen((open) => !open)} aria-expanded={isChooserOpen}>
            <SlidersHorizontal className="h-4 w-4" /> Columns
          </button>
          {isChooserOpen && (
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-border bg-bg-raised p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-text">Show columns</p>
                <button type="button" className="text-xs font-medium text-teal hover:underline" onClick={resetColumns}>Reset</button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {availableColumns.map((column) => (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2 text-sm text-text">
                    <input type="checkbox" checked={selectedKeys.includes(column.key)} onChange={() => toggleColumn(column.key)} />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <DataTable
        columns={visibleColumns}
        rows={rows}
        onRowClick={(row: Row) => router.push(`/partner/${partnerId}/inventory/bom/${row["id"]}`)}
        enableQuickView
      />
    </div>
  );
}
