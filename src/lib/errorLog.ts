/**
 * Centralized error registry — any error caught anywhere in the app gets
 * recorded here so it's visible to a Super Admin instead of only ever
 * reaching a browser console or a serverless function's ephemeral logs.
 *
 * Same honest JSON-file-store pattern as src/lib/designer/customizations.ts:
 * atomic writes (temp file + rename), works for local dev, does NOT
 * survive Vercel's read-only/ephemeral runtime filesystem — see that
 * file's header for the full explanation, which applies identically here.
 * Migrate to a Prisma `ErrorLog` table with the same function signatures
 * once a database exists; nothing that calls logError() needs to change.
 */

import fs from "node:fs";
import path from "node:path";

export type LoggedError = {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  /** Where it happened — a route path, a Server Action name, etc. */
  source: string;
  severity: "error" | "warning";
};

const DATA_FILE = path.join(process.cwd(), "data", "error-log.json");
const MAX_ENTRIES = 200; // bounded so the file can't grow without limit

function readLog(): LoggedError[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries: LoggedError[]) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(entries, null, 2) + "\n", "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Read-only filesystem (Vercel runtime) — documented tradeoff above.
  }
}

/**
 * Call this from any catch block, Server Action failure, or error
 * boundary. Safe to call liberally — failures inside logging itself are
 * swallowed (a broken logger must never be the thing that crashes a
 * request that was already failing).
 */
export function logError(input: {
  message: string;
  stack?: string;
  source: string;
  severity?: "error" | "warning";
}): void {
  try {
    const entries = readLog();
    entries.unshift({
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      message: input.message,
      stack: input.stack,
      source: input.source,
      severity: input.severity ?? "error",
    });
    writeLog(entries.slice(0, MAX_ENTRIES));
  } catch {
    // Never let logging itself throw.
  }
}

export function getLoggedErrors(): LoggedError[] {
  return readLog();
}
