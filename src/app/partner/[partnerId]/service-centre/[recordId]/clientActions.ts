import * as actions from "./safeActions";
import { unwrapWorkorderResult } from "@/lib/workorderActionResult";

export async function setWorkorderHoldAction(...args: Parameters<typeof actions.setWorkorderHoldAction>): Promise<void> {
  unwrapWorkorderResult(await actions.setWorkorderHoldAction(...args));
}

export async function createInvoiceFromWorkorderAction(...args: Parameters<typeof actions.createInvoiceFromWorkorderAction>): Promise<void> {
  unwrapWorkorderResult(await actions.createInvoiceFromWorkorderAction(...args));
}

export async function cancelWorkorderAction(...args: Parameters<typeof actions.cancelWorkorderAction>): Promise<void> {
  unwrapWorkorderResult(await actions.cancelWorkorderAction(...args));
}

export async function deductInventoryForWorkorderAction(...args: Parameters<typeof actions.deductInventoryForWorkorderAction>): Promise<void> {
  unwrapWorkorderResult(await actions.deductInventoryForWorkorderAction(...args));
}

export async function patchServiceCentreWorkorderAction(...args: Parameters<typeof actions.patchServiceCentreWorkorderAction>): Promise<void> {
  unwrapWorkorderResult(await actions.patchServiceCentreWorkorderAction(...args));
}

export async function reopenWorkorderAction(...args: Parameters<typeof actions.reopenWorkorderAction>): Promise<void> {
  unwrapWorkorderResult(await actions.reopenWorkorderAction(...args));
}

export async function createPnaEntryAction(...args: Parameters<typeof actions.createPnaEntryAction>): Promise<void> {
  unwrapWorkorderResult(await actions.createPnaEntryAction(...args));
}

