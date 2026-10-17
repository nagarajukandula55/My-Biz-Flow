"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Inline navigation disclosure: no overlay, focus trap, or duplicate sidebar. */
export function ResponsivePartnerShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const id = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const open = openPath === pathname;
  return (
    <div className="mbf-responsive-workspace flex min-h-screen w-full min-w-0 flex-col lg:flex-row">
      <div className="border-b border-border bg-bg-raised p-3 lg:hidden print:hidden">
        <button ref={menuButton} type="button" className="btn-outline min-h-11" aria-expanded={open} aria-controls={id}
          onClick={() => setOpenPath(open ? null : pathname)}>
          {open ? "Close business menu" : "Open business menu"}
        </button>
      </div>
      <div id={id} className={`${open ? "block" : "hidden"} mbf-workspace-navigation shrink-0 lg:block print:hidden`}
        onKeyDown={event => { if (event.key === "Escape") { setOpenPath(null); menuButton.current?.focus(); } }}>
        {sidebar}
      </div>
      <div className="mbf-workspace-content flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
