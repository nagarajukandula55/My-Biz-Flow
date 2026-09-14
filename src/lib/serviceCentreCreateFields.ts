import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { parseProductDomains } from "@/lib/catalog/productDomains";
import { categoryOptionsForDomains } from "@/lib/catalog/serviceCatalog";
import { filterByDomains } from "@/lib/sample-data/service-centre-brands";
import type { FormFieldDef } from "@/components/RecordForm";

/**
 * The one place the Service Centre workorder CREATE field set is built.
 *
 * Both create surfaces go through this — the full-page /new form and the
 * list page's quick-create modal — so the modal can no longer drift into
 * rendering the raw, undomain-filtered field list (it previously passed
 * `serviceCentreFormFields` straight through, showing vehicle categories to
 * an electronics-only shop and offering no brand/model suggestions at all).
 *
 * It applies, in order: the Designer's per-page customizations, the
 * partner's product-domain scoping of Device Type, this partner's own live
 * Brand/Model catalogs as suggestions (Models keyed BY BRAND), the
 * "+ Add new" catalog links, and the recently-used "logged by" names.
 *
 * Field VISIBILITY at create time is not done here — RecordForm's
 * `mode="create"` drops every `createHidden` field, so the same field set
 * stays valid for an edit render too.
 */

/** Sorted, de-duplicated, non-empty values of one column across a record set. */
function distinct(rows: Record<string, unknown>[], key: string): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim();
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export async function buildServiceCentreCreateFields(partnerId: string): Promise<FormFieldDef[]> {
  const baseFields = await applyCustomizations("service-centre.create", serviceCentreFormFields);

  const partner = await getPartner(partnerId);
  const domains = parseProductDomains(partner?.productDomains);

  const [brands, models, priorJobs] = await Promise.all([
    listBusinessRecords(partnerId, "service-centre-brands"),
    listBusinessRecords(partnerId, "service-centre-models"),
    listBusinessRecords(partnerId, "service-centre"),
  ]);

  const scopedModels = filterByDomains(models, domains);
  // Model suggestions keyed by their Brand — the form offers only the
  // models under the currently-selected brand, and clears Model when the
  // brand changes (mirrors the reference app's savedModelsByBrand).
  const modelsByBrand: Record<string, string[]> = {};
  for (const m of scopedModels) {
    const brand = String(m["brandName"] ?? "").trim();
    const name = String(m["name"] ?? "").trim();
    if (!brand || !name) continue;
    (modelsByBrand[brand] ??= []).push(name);
  }
  for (const brand of Object.keys(modelsByBrand)) {
    modelsByBrand[brand] = [...new Set(modelsByBrand[brand])].sort((a, b) => a.localeCompare(b));
  }

  const base = `/partner/${partnerId}/service-centre`;
  const suggestionsByKey: Record<string, string[]> = {
    brandName: distinct(filterByDomains(brands, domains), "name"),
    loggedBy: distinct(priorJobs, "loggedBy"),
  };
  const addNewByKey: Record<string, { label: string; href: string }> = {
    brandName: { label: "Add new brand", href: `${base}/brands/new` },
    modelName: { label: "Add new model", href: `${base}/models/new` },
  };

  const categoryOptions = categoryOptionsForDomains(domains);

  return baseFields.map((f) => ({
    ...f,
    ...(f.key === "deviceCategory" ? categoryOptions : {}),
    ...(f.key === "modelName" ? { suggestionsByParent: modelsByBrand } : {}),
    ...(suggestionsByKey[f.key]?.length ? { suggestions: suggestionsByKey[f.key] } : {}),
    ...(addNewByKey[f.key] ? { addNew: addNewByKey[f.key] } : {}),
  }));
}
