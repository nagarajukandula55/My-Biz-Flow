import { randomUUID } from "node:crypto";
import { logError } from "@/lib/errorLog";
import { PartnerAuthorizationError } from "@/lib/requirePartnerSession";
import { WorkorderValidationError, type WorkorderActionResult } from "@/lib/workorderActionResult";

/** Keep expected failures readable; record unexpected details only on the server. */
export async function runWorkorderAction(source: string, work: () => Promise<void>): Promise<WorkorderActionResult> {
  try {
    await work();
    return { ok: true };
  } catch (error) {
    if (error instanceof WorkorderValidationError) return { ok: false, error: error.message };
    if (error instanceof PartnerAuthorizationError) {
      return { ok: false, error: "Your session is no longer valid for this business. Sign in again before saving." };
    }
    const reference = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    // Console survives a database outage that also prevents the central log write.
    console.error(`[workorder:${reference}] ${source}`, error);
    try {
      await logError({ source: `${source}:${reference}`, message, stack: error instanceof Error ? error.stack : undefined });
    } catch { /* Logging must never replace the original failure. */ }
    return { ok: false, reference, error: `The work-order action could not be completed. Refresh to check its latest status before retrying. Reference: ${reference}` };
  }
}
