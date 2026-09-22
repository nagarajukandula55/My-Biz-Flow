import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreFormFields } from "@/lib/sample-data/service-centre";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { parseProductDomains } from "@/lib/catalog/productDomains";
import { categoryOptionsForDomains } from "@/lib/catalog/serviceCatalog";
import { filterByDomains, scBrandFormFields } from "@/lib/sample-data/service-centre-brands";
import { scModelFormFieldsFor } from "@/lib/sample-data/service-centre-models";
import { activeStaffNames } from "@/lib/sample-data/service-centre-staff-names";
import { createServiceCentreBrandInlineAction, createServiceCentreModelInlineAction } from "@/lib/serviceCentreCatalogActions";
import { getPageTierAccess } from "@/lib/tenant";
import type { FormFieldDef, RecordFormAction } from "@/components/RecordForm";

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
 * "+ Add new" catalog links, and the partner's Staff Names roster as the
 * suggestion source for "Logged By".
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

  const [brands, models, staffNames] = await Promise.all([
    listBusinessRecords(partnerId, "service-centre-brands"),
    listBusinessRecords(partnerId, "service-centre-models"),
    listBusinessRecords(partnerId, "service-centre-staff-names"),
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
  // "Logged By" is sourced from the partner's own Staff Names roster, NOT
  // from the names typed on past workorders. Scraping history meant the
  // field quietly proposed (and, being the only suggestion, effectively
  // defaulted to) whoever booked the last job — so the mandatory "who took
  // this in" answer was whatever the previous shift happened to be. A
  // Starter partner has no roster and therefore no suggestions: they type
  // the name each time, which is the correct behaviour, not a degradation.
  const suggestionsByKey: Record<string, string[]> = {
    brandName: distinct(filterByDomains(brands, domains), "name"),
    loggedBy: activeStaffNames(staffNames),
  };
  // "Manage staff names" is a real list-management page (add/edit/deactivate
  // many entries) — a link is the right affordance there. Brand/Model are a
  // single quick add mid-workorder, so they open inline instead of
  // abandoning the workorder the operator is filling in (see addNewModal on
  // RecordForm — was previously a target="_blank" link to a whole page).
  const addNewByKey: Record<string, { label: string; href: string }> = {
    ...(staffNames.length ? { loggedBy: { label: "Manage staff names", href: `${base}/staff-names` } } : {}),
  };
  // Starter has no catalog at all (Brands/Models pages are pro+, per
  // DEFAULT_PAGE_TIERS) — the inline "+ Add new" affordance must not exist
  // on Starter either, not just the standalone pages. Checked here (not
  // just hidden in CSS) so a Starter partner never even sees the button;
  // the server-side action itself is ALSO tier-gated (see
  // service-centre-brands.ts's createServiceCentreBrandAction /
  // service-centre-models.ts's createServiceCentreModelAction) so this
  // isn't security-through-hidden-UI — the same enforcement runs even if
  // someone crafts a request directly.
  const [brandsTier, modelsTier] = await Promise.all([
    getPageTierAccess(partnerId, "service-centre.brands.create"),
    getPageTierAccess(partnerId, "service-centre.models.create"),
  ]);
  const addNewModalByKey: Record<string, FormFieldDef["addNewModal"]> = {
    ...(brandsTier.allowed
      ? {
          brandName: {
            label: "Add new brand",
            title: "New Brand",
            submitLabel: "Create Brand",
            fields: scBrandFormFields,
            action: createServiceCentreBrandInlineAction.bind(null, partnerId) as RecordFormAction,
          },
        }
      : {}),
    ...(modelsTier.allowed
      ? {
          modelName: {
            label: "Add new model",
            title: "New Model",
            submitLabel: "Create Model",
            fields: scModelFormFieldsFor(suggestionsByKey.brandName),
            action: createServiceCentreModelInlineAction.bind(null, partnerId) as RecordFormAction,
          },
        }
      : {}),
  };

  const categoryOptions = categoryOptionsForDomains(domains);

  return baseFields.map((f) => ({
    ...f,
    ...(f.key === "deviceCategory" ? categoryOptions : {}),
    ...(f.key === "modelName" ? { suggestionsByParent: modelsByBrand } : {}),
    ...(suggestionsByKey[f.key]?.length ? { suggestions: suggestionsByKey[f.key] } : {}),
    ...(addNewByKey[f.key] ? { addNew: addNewByKey[f.key] } : {}),
    ...(addNewModalByKey[f.key] ? { addNewModal: addNewModalByKey[f.key] } : {}),
  }));
}
