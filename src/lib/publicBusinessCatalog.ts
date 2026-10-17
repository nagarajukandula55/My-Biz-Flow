import { BUSINESS_OFFERINGS } from "@/lib/businessOfferings";

export type PublicBusinessCard = {
  slug: string; title: string; summary: string; features: string[];
  signupOptions: { id: string; label: string }[];
};

/** Marketing never activates a type. Signup links always use an actual active ID. */
export function buildPublicBusinessCatalog(types: { id: string; status: string; defaultModules: string[]; description?: string }[]): PublicBusinessCard[] {
  const active = types.filter(type => type.status === "Active");
  return BUSINESS_OFFERINGS.map(offering => ({
    slug: offering.slug, title: offering.title, summary: offering.summary,
    features: offering.workflow ?? [],
    signupOptions: active.filter(type =>
      // Keep vertical packages distinct even when they bundle shared tools.
      (type.id === offering.slug || (type.id === "accounting-gst" && offering.slug === "accounting") ||
        (!BUSINESS_OFFERINGS.some(o => o.slug === type.id) && type.defaultModules[0] === offering.slug)) &&
      offering.modules.every(slug => type.defaultModules.includes(slug))
    ).map(type => ({ id: type.id, label: type.description || offering.title })),
  }));
}
