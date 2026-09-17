"use server";

import { logError } from "@/lib/errorLog";

/**
 * The one bridge from a Client Component error boundary (which cannot
 * touch the filesystem/DB directly) into the server-side error log —
 * viewable from My Biz Flow Admin (same production database).
 */
export async function reportClientError(input: { message: string; stack?: string; source: string }) {
  await logError({ ...input, severity: "error" });
}
