"use client";

import { useRouter } from "next/navigation";

export function PeriodPicker({ periods, selected }: { periods: { value: string; label: string }[]; selected: string }) {
  const router = useRouter();
  return (
    <select
      value={selected}
      onChange={(e) => router.push(`?period=${e.target.value}`)}
      className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-teal"
    >
      {periods.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
