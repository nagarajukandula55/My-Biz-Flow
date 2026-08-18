"use client";

import { useRouter } from "next/navigation";

export function GeneratePicker({
  periods,
  selectedPeriod,
  selectedReturnType,
}: {
  periods: { value: string; label: string }[];
  selectedPeriod: string;
  selectedReturnType: string;
}) {
  const router = useRouter();

  function navigate(period: string, returnType: string) {
    router.push(`?period=${period}&returnType=${returnType}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={selectedPeriod}
        onChange={(e) => navigate(e.target.value, selectedReturnType)}
        className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-teal"
      >
        {periods.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={selectedReturnType}
        onChange={(e) => navigate(selectedPeriod, e.target.value)}
        className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text outline-none focus:border-teal"
      >
        {["GSTR-1", "GSTR-3B", "GSTR-9"].map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
