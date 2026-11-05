"use server";

import * as actions from "./actions";
import { runWorkorderAction } from "@/lib/workorderActionServer";

export async function setWorkorderHoldAction(...args: Parameters<typeof actions.setWorkorderHoldAction>) {
  return runWorkorderAction(`setWorkorderHoldAction:${args[0]}`, () => actions.setWorkorderHoldAction(...args));
}

export async function createInvoiceFromWorkorderAction(...args: Parameters<typeof actions.createInvoiceFromWorkorderAction>) {
  return runWorkorderAction(`createInvoiceFromWorkorderAction:${args[0]}`, () => actions.createInvoiceFromWorkorderAction(...args));
}

export async function cancelWorkorderAction(...args: Parameters<typeof actions.cancelWorkorderAction>) {
  return runWorkorderAction(`cancelWorkorderAction:${args[0]}`, () => actions.cancelWorkorderAction(...args));
}

export async function deductInventoryForWorkorderAction(...args: Parameters<typeof actions.deductInventoryForWorkorderAction>) {
  return runWorkorderAction(`deductInventoryForWorkorderAction:${args[0]}`, () => actions.deductInventoryForWorkorderAction(...args));
}

export async function patchServiceCentreWorkorderAction(...args: Parameters<typeof actions.patchServiceCentreWorkorderAction>) {
  return runWorkorderAction(`patchServiceCentreWorkorderAction:${args[0]}`, () => actions.patchServiceCentreWorkorderAction(...args));
}

export async function reopenWorkorderAction(...args: Parameters<typeof actions.reopenWorkorderAction>) {
  return runWorkorderAction(`reopenWorkorderAction:${args[0]}`, () => actions.reopenWorkorderAction(...args));
}

export async function createPnaEntryAction(...args: Parameters<typeof actions.createPnaEntryAction>) {
  return runWorkorderAction(`createPnaEntryAction:${args[0]}`, () => actions.createPnaEntryAction(...args));
}

