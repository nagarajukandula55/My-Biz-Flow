"use server";

/**
 * Server Actions wrapping the JSON-file-backed customization store (see
 * customizations.ts for the persistence tradeoff). Each action revalidates
 * both the Designer page itself and the live app pages for the module so
 * an edit shows up immediately, without a manual refresh cycle.
 */

import { revalidatePath } from "next/cache";
import {
  addField as addFieldStore,
  deleteField as deleteFieldStore,
  setDropdownOptions as setDropdownOptionsStore,
  setFieldHidden as setFieldHiddenStore,
  setFieldLabel as setFieldLabelStore,
  type DropdownOption,
  type FieldSpec,
} from "./customizations";
import { getPage } from "./registry";
import { saveDocumentTemplate as saveDocumentTemplateStore } from "./documentTemplates";
import { setModuleAppearance as setModuleAppearanceStore, type ModuleAppearance } from "./moduleAppearance";

function revalidateForPage(pageId: string) {
  revalidatePath(`/admin/designer/${pageId}`);
  const def = getPage(pageId);
  if (def) {
    // Revalidate the whole module's vendor tree (list/create/detail/edit
    // all live under the same [vendorId]/<slug> segment).
    const moduleBase = def.path.split("/").slice(0, 4).join("/"); // /vendor/[vendorId]/<slug>
    revalidatePath(moduleBase, "layout");
  }
}

export async function setFieldLabelAction(pageId: string, fieldKey: string, label: string) {
  await setFieldLabelStore(pageId, fieldKey, label);
  revalidateForPage(pageId);
}

export async function setFieldHiddenAction(pageId: string, fieldKey: string, hidden: boolean) {
  await setFieldHiddenStore(pageId, fieldKey, hidden);
  revalidateForPage(pageId);
}

export async function addFieldAction(pageId: string, field: FieldSpec) {
  await addFieldStore(pageId, field);
  revalidateForPage(pageId);
}

export async function deleteFieldAction(pageId: string, fieldKey: string, isCustomField: boolean) {
  await deleteFieldStore(pageId, fieldKey, isCustomField);
  revalidateForPage(pageId);
}

export async function setDropdownOptionsAction(pageId: string, fieldKey: string, options: DropdownOption[]) {
  await setDropdownOptionsStore(pageId, fieldKey, options);
  revalidateForPage(pageId);
}

export async function saveDocumentTemplateAction(pageId: string, htmlTemplate: string) {
  await saveDocumentTemplateStore(pageId, htmlTemplate);
  revalidateForPage(pageId);
  // Also revalidate the actual document route itself, not just the
  // module's list/create/edit/detail tree, since it lives one segment
  // deeper ([recordId]/document).
  const def = getPage(pageId);
  if (def) revalidatePath(def.path, "page");
}

export async function setModuleAppearanceAction(slug: string, appearance: ModuleAppearance) {
  await setModuleAppearanceStore(slug, appearance);
  revalidatePath("/admin/designer", "layout");
  revalidatePath(`/vendor/[vendorId]/${slug}`, "layout");
}
