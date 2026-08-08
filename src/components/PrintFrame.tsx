"use client";

import { useState, type ReactNode } from "react";

export type PrintSize = "a4" | "a5" | "thermal";

const SIZE_LABEL: Record<PrintSize, string> = { a4: "A4", a5: "A5", thermal: "Thermal" };
/** Approx CSS px width at 96dpi for each physical page size — screen preview only, print uses @page via browser print dialog. */
const SIZE_WIDTH: Record<PrintSize, string> = { a4: "794px", a5: "559px", thermal: "302px" };

/**
 * Wraps a printable document body with an optional size toggle (screen
 * only, hidden on print). Which sizes are offered is caller-controlled —
 * e.g. Service Centre's Sales Invoice only offers A4/A5, POS additionally
 * offers Thermal.
 */
export function PrintFrame({ sizes, children }: { sizes: PrintSize[]; children: ReactNode }) {
  const [size, setSize] = useState<PrintSize>(sizes[0] ?? "a4");

  return (
    <div className="flex flex-col items-center">
      {sizes.length > 1 && (
        <div className="mb-3 flex items-center gap-1.5 print:hidden">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                size === s ? "bg-accent text-accent-contrast" : "border border-border bg-bg-raised text-text-muted"
              }`}
            >
              {SIZE_LABEL[s]}
            </button>
          ))}
        </div>
      )}
      <div className="w-full print:w-full" style={{ maxWidth: SIZE_WIDTH[size] }}>
        {children}
      </div>
    </div>
  );
}
