"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  deleted: "Record deleted.",
  saved: "Saved.",
};

/**
 * Module-agnostic success acknowledgment for `deleted` — rendered once
 * from AppShell (every partner page renders inside it), so
 * deleteBusinessRecordAction's ?deleted=1 redirect to the module's LIST
 * page gets a real on-screen confirmation with no per-module list-page
 * changes needed.
 *
 * Deliberately does NOT also handle `created`/`updated` — those redirect to
 * the record's own detail page, which renders the richer, record-labeled
 * SuccessBanner via RecordDetail; handling them here too would double up
 * both banners on the same page.
 *
 * Wrapped in Suspense because useSearchParams() requires it in the App
 * Router; the fallback renders nothing so it never causes a visible flash.
 */
export function GlobalActionBanner() {
  return (
    <Suspense fallback={null}>
      <GlobalActionBannerInner />
    </Suspense>
  );
}

function GlobalActionBannerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const key = (["deleted", "saved"] as const).find((k) => searchParams.get(k));
  const [visible, setVisible] = useState(Boolean(key));

  useEffect(() => {
    if (!key) return;
    setVisible(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key || !visible) return null;

  return (
    <div className="border-b border-success-soft bg-success-soft px-6 py-2">
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-success">
        <span>{MESSAGES[key]}</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="text-success/70 hover:text-success"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
