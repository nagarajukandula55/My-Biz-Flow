"use client";

/**
 * Dedicated add-row line editor for a JournalEntry's lines — built fresh
 * rather than adapting MaterialLineItemsTable.tsx, since a journal line's
 * shape (account select + EITHER a debit OR a credit amount) is different
 * enough from a material line (material + qty + price) that reusing it
 * would mean fighting its serial/return-type/condition-specific columns
 * for no benefit. Amounts here are typed in rupees; the server action
 * converts to paise before persisting (this repo's usual Int-paise money
 * convention).
 */

export type JournalLineRow = { accountId: string; debit: number; credit: number };
export type JournalAccountOption = { id: string; accountCode: string; accountName: string };

export function JournalLinesEditor({
  lines,
  onChange,
  accountOptions,
}: {
  lines: JournalLineRow[];
  onChange: (lines: JournalLineRow[]) => void;
  accountOptions: JournalAccountOption[];
}) {
  function addRow() {
    onChange([...lines, { accountId: "", debit: 0, credit: 0 }]);
  }

  function updateRow(idx: number, patch: Partial<JournalLineRow>) {
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeRow(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = lines.length > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Journal Lines</span>
        <button type="button" onClick={addRow} className="btn-accent px-3 py-1.5 text-xs">
          + Add line
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-bg-raised p-4 text-center text-xs text-text-muted">
          No lines yet — add at least two lines (one debit, one credit) before saving.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-bg-raised">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2.5">Account</th>
                <th className="w-32 px-3 py-2.5 text-right">Debit (₹)</th>
                <th className="w-32 px-3 py-2.5 text-right">Credit (₹)</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateRow(i, { accountId: e.target.value })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
                    >
                      <option value="">Select account…</option>
                      {accountOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountCode} — {a.accountName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.debit || ""}
                      onChange={(e) => updateRow(i, { debit: Number(e.target.value) || 0, credit: 0 })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.credit || ""}
                      onChange={(e) => updateRow(i, { credit: Number(e.target.value) || 0, debit: 0 })}
                      className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text tabular-nums outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => removeRow(i)} aria-label="Remove line" className="text-text-muted hover:text-danger">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-2 text-right text-xs uppercase tracking-wide text-text-muted">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">₹{totalDebit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">₹{totalCredit.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {lines.length > 0 && (
        <p className={`mt-2 text-xs font-semibold ${balanced ? "text-success" : "text-danger"}`}>
          {balanced ? "Balanced." : `Not balanced — debit and credit totals must match before saving.`}
        </p>
      )}
    </div>
  );
}
