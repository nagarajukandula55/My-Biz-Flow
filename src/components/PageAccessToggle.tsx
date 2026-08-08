"use client";

import { useState, useTransition } from "react";
import { setPagePublicAction } from "@/app/admin/(protected)/settings/actions";

export function PageAccessToggle({
  pageId,
  initialPublic,
  isRealGate,
}: {
  pageId: string;
  initialPublic: boolean;
  /** True only for pages middleware actually gates (superAdminOnly admin routes). */
  isRealGate: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isPublic;
    setIsPublic(next);
    startTransition(() => setPagePublicAction(pageId, next));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        onClick={toggle}
        disabled={isPending}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          isPublic ? "bg-accent" : "bg-bg-sunken"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-bg-raised shadow transition-transform ${
            isPublic ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-semibold text-text-muted">
        {isPublic ? "Public" : "Gated"}
      </span>
      {!isRealGate && (
        <span
          title="This page has no access gate to begin with — the toggle is stored for completeness but has nothing to lift."
          className="rounded-full border border-border bg-bg px-2 py-0.5 text-[10px] font-medium text-text-muted"
        >
          not currently gated
        </span>
      )}
    </div>
  );
}
