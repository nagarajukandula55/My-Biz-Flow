"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SuccessBannerProps = {
  /** The searchParam key that, when present, means "show this banner" (e.g. "created", "updated", "deleted"). */
  searchParamKey: string;
  /** The current value of that searchParam (pass `searchParams?.[key]` straight through from the page). */
  value: string | undefined;
  /** The message to render, e.g. "Workorder WO-2526-0001 created." */
  message: string;
  /** Auto-fade after this many ms. Defaults to 4000. Pass 0 to disable auto-fade (dismiss-by-click only). */
  autoFadeMs?: number;
};

/**
 * Dismissible success acknowledgment for the standard
 * create/redirect(?created=1)/render-on-arrival pattern already used by
 * /login?reset=success and /change-password?welcome=1 — extended app-wide
 * so every meaningful action gets a real on-screen confirmation instead of
 * a silent redirect.
 *
 * Strips its own searchParam from the URL on mount (router.replace, no
 * scroll reset) so a refresh or back-navigation never re-shows it.
 */
export function SuccessBanner({ searchParamKey, value, message, autoFadeMs = 4000 }: SuccessBannerProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(Boolean(value));

  useEffect(() => {
    if (!value) return;
    // Strip the param immediately so a later refresh/back-nav doesn't re-show this.
    const url = new URL(window.location.href);
    url.searchParams.delete(searchParamKey);
    router.replace(url.pathname + (url.search ? url.search : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!visible || autoFadeMs <= 0) return;
    const timer = setTimeout(() => setVisible(false), autoFadeMs);
    return () => clearTimeout(timer);
  }, [visible, autoFadeMs]);

  if (!value || !visible) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-success-soft bg-success-soft px-3 py-2 text-sm font-semibold text-success">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="text-success/70 hover:text-success"
      >
        &times;
      </button>
    </div>
  );
}
