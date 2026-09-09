"use client";

const SLOTS = ["Morning (9 AM – 12 PM)", "Afternoon (12 PM – 4 PM)", "Evening (4 PM – 8 PM)"];

export function EditBookingForm({
  scheduledDate,
  slotLabel,
  notes,
  action,
}: {
  scheduledDate: string;
  slotLabel: string;
  notes: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="max-w-xl space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Date</label>
          <input name="scheduledDate" type="date" defaultValue={scheduledDate} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Time Slot</label>
          <select name="slotLabel" defaultValue={slotLabel} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Notes</label>
        <textarea name="notes" rows={3} defaultValue={notes} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
      </div>
      <button type="submit" className="btn-accent">
        Save Changes
      </button>
    </form>
  );
}
