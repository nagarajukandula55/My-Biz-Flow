import Link from "next/link";

/**
 * Shared GET-form pagination footer for server-rendered list pages — same
 * prev/next + "Showing X–Y of Z" shape billing/page.tsx and
 * service-centre/page.tsx each used to hand-roll independently. Pure link
 * navigation (no client JS), consistent with those pages' plain-GET-form
 * filtering convention.
 */
export function PaginationControls({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Given a target page number, returns the full href (including any active filters) for that page. */
  buildHref: (page: number) => string;
}) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
      <span>{total === 0 ? "No records match these filters." : `Showing ${rangeStart}–${rangeEnd} of ${total}`}</span>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-md border border-border px-3 py-1.5 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-bg-sunken"}`}
        >
          Previous
        </Link>
        <span>
          Page {page} of {totalPages}
        </span>
        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`rounded-md border border-border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-bg-sunken"}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

/** Builds a page's query string from the current searchParams plus overrides — same convention every paginated list page needs for its "page N" links. */
export function buildPageQueryString(searchParams: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged: Record<string, string | undefined> = { ...searchParams, ...overrides };
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}
