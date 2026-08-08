"use server";

import { logError } from "@/lib/errorLog";

/**
 * The one bridge from a Client Component error boundary (which cannot
 * touch the filesystem directly) into the server-side error log.
 */
export async function reportClientError(input: { message: string; stack?: string; source: string }) {
  logError({ ...input, severity: "error" });
}
