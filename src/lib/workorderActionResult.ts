export class WorkorderValidationError extends Error {}

export type WorkorderActionResult = { ok: true } | { ok: false; error: string; reference?: string };

export function unwrapWorkorderResult(result: WorkorderActionResult): void {
  if (!result.ok) throw new Error(result.error);
}
