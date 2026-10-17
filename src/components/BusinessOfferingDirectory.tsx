"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { PublicBusinessCard } from "@/lib/publicBusinessCatalog";

/** Shared public module discovery, including packages awaiting publication. */
export function BusinessOfferingDirectory({ offerings, referral }: { offerings: PublicBusinessCard[]; referral?: string }) {
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const id = useId();
  const suffix = referral ? `?ref=${encodeURIComponent(referral)}` : "";
  const visible = offerings.filter(item => (!availableOnly || item.signupOptions.length > 0) &&
    [item.title, item.summary, ...item.features].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="min-w-0 space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full sm:max-w-md"><label htmlFor={id} className="text-sm font-semibold text-text">Find your business or a tool</label>
        <input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try hotel, rentals, attendance or billing" className="mt-2 min-h-11 w-full rounded-md border border-border bg-bg-raised px-3 py-2 text-text" />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-text"><input type="checkbox" checked={availableOnly} onChange={event => setAvailableOnly(event.target.checked)} /> Open for signup only</label>
    </div>
    <p role="status" className="text-sm text-text-muted">{visible.length} of {offerings.length} business packages</p>
    <ul className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visible.map(item => <li key={item.slug} data-business={item.slug} className="mbf-glass-card flex min-w-0 flex-col gap-4 p-5">
        <div><p className="text-xs font-semibold text-teal">{item.signupOptions.length ? "Registration open" : "Explore features · registration coming soon"}</p>
          <h3 className="mt-2 break-words font-display text-xl font-bold text-text">{item.title}</h3>
          <p className="mt-2 break-words text-sm leading-relaxed text-text-muted">{item.summary}</p></div>
        <ul className="flex-1 list-disc space-y-2 pl-5 text-sm text-text-muted">{item.features.slice(0, 3).map(feature => <li key={feature}>{feature}</li>)}</ul>
        <div className="flex flex-col gap-2">
          <Link href={`/business-types/${item.slug}${suffix}`} className="btn-outline min-h-11 justify-center text-center">Explore {item.title}</Link>
          {item.signupOptions.map(option => <Link key={option.id} href={`/signup/${encodeURIComponent(option.id)}${suffix}`} className="btn-accent min-h-11 justify-center whitespace-normal text-center">{item.signupOptions.length > 1 ? `Register: ${option.label}` : `Register ${item.title}`}</Link>)}
          {!item.signupOptions.length && <Link href="/contact" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-teal underline">Ask about this package</Link>}
        </div>
      </li>)}
    </ul>
    {!visible.length && <p className="py-6 text-text-muted">No matching packages. Try another search or show all packages.</p>}
  </div>;
}
