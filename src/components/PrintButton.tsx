"use client";

/** Browser print-to-PDF — deliberately not a PDF-generation dependency; see DESIGN_SYSTEM.md §8. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-accent print:hidden">
      Print / Save as PDF
    </button>
  );
}
