"use client";

import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { reportClientError } from "@/lib/reportClientError";

/**
 * App Router error boundary — required by Next.js to be a Client Component.
 * Without this file, any unhandled render/render-time error falls through
 * to Next's bare default error page instead of the design system. Also
 * reports into the central error log (src/lib/errorLog.ts) via a Server
 * Action, so "this has been logged" below is literally true, not just
 * reassuring copy — visible at /admin/errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
    reportClientError({
      // In production, Next.js redacts Server Component error messages down
      // to a generic string and attaches a `digest` instead — that digest is
      // the only thing that correlates this client-visible report with the
      // real error/stack in the server's own logs (e.g. Vercel function
      // logs). Without it, every production incident logs as the same
      // useless generic text with no way to find the actual cause.
      message: error.digest ? `${error.message} (digest: ${error.digest})` : error.message,
      stack: error.stack,
      source: typeof window !== "undefined" ? window.location.pathname : "unknown",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <BrandLogo height={40} />
      <h1 className="font-display text-2xl font-bold text-text">Something went wrong</h1>
      <p className="max-w-md text-sm text-text-muted">
        An unexpected error occurred. This has been logged; try again, and if
        it keeps happening, note what page you were on when reporting it.
      </p>
      <button type="button" onClick={() => reset()} className="btn-accent mt-2">
        Try again
      </button>
    </div>
  );
}
