"use client";

export function SharedDocumentPrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded bg-slate-900 px-3 py-2 text-sm text-white print:hidden">Print / Save PDF</button>;
}
