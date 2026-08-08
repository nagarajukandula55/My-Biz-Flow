import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { LogoMark } from "@/components/LogoMark";
import { getLoggedErrors } from "@/lib/errorLog";
import { formatDate } from "@/lib/format";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.errors",
  moduleSlug: "platform",
  title: "Error Log",
  path: "/admin/errors",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Every error caught by the global error boundary (src/app/error.tsx) is reported here via a Server Action into src/lib/errorLog.ts (same JSON-file store pattern as the Designer's customization store, same Vercel-runtime caveat). Currently wired at the root error boundary; per-route error boundaries and Server Action catch blocks are not yet instrumented individually — this covers unhandled render errors app-wide, not every possible failure path.",
  sourceFile: "src/app/admin/errors/page.tsx",
});

export default function ErrorsPage() {
  const errors = getLoggedErrors();

  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-extrabold text-text">
              My Biz Flow — Error Log
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {errors.length} error{errors.length === 1 ? "" : "s"} recorded. Reported from the
            global error boundary — see this page&apos;s Designer entry for what is and isn&apos;t
            covered yet.
          </p>
        </header>

        <div className="p-6">
          {errors.length === 0 ? (
            <div className="rounded-lg border border-border bg-bg-raised p-6 text-sm text-text-muted">
              No errors recorded yet — this is a good sign, not a broken page.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {errors.map((err) => (
                <li key={err.id} className="rounded-lg border border-border bg-bg-raised p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip
                      variant={err.severity === "error" ? "danger" : "warning"}
                      label={err.severity}
                    />
                    <span className="font-mono text-xs text-text-muted">{err.source}</span>
                    <span className="ml-auto font-mono text-xs text-text-muted tabular-nums">
                      {formatDate(err.timestamp)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-text">{err.message}</div>
                  {err.stack && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-bg-sunken p-3 font-mono text-[11px] leading-relaxed text-text-muted">
                      {err.stack}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SuperAdminGate>
  );
}
