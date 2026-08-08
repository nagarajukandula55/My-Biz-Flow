import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { NumberingSchemeEditor } from "@/components/NumberingSchemeEditor";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import {
  NUMBERED_DOCUMENT_TYPES,
  getEffectiveScheme,
  getVendorScheme,
} from "@/lib/designer/numbering";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.vendor-numbering",
  moduleSlug: "platform",
  title: "Settings — Numbering",
  path: "/vendor/[vendorId]/settings/numbering",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: NUMBERED_DOCUMENT_TYPES.map((d) => ({
    key: d.id,
    label: `${d.label} numbering override`,
  })),
  explanation:
    "Per-Vendor numbering overrides — each Vendor can set its own prefix/separator/financial-year/sequence scheme per document type instead of the Super Admin's Main default (/admin/numbering). A document type with no override inherits Main automatically. 'Fetch next live number' is scoped to this Vendor's own counter, independent of Main's and every other Vendor's.",
  sourceFile: "src/app/vendor/[vendorId]/settings/numbering/page.tsx",
});

export default async function VendorNumberingPage({ params }: { params: { vendorId: string } }) {
  const schemeRows = await Promise.all(
    NUMBERED_DOCUMENT_TYPES.map(async (doc) => ({
      doc,
      override: await getVendorScheme(params.vendorId, doc.id),
      effective: await getEffectiveScheme(doc.id, params.vendorId),
    }))
  );
  return (
    <AppShell vendorId={params.vendorId} navGroups={await buildVendorAdminNavGroups("numbering")} topbarTitle="Settings — Numbering">
      <div>
        <Link
          href={`/vendor/${params.vendorId}/settings`}
          className="text-sm font-semibold text-teal hover:underline"
        >
          &larr; Back to Settings
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-text">Document numbering</h1>
        <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
          Override the platform default for any document type below — anything left as
          &quot;Inheriting Main&quot; automatically follows whatever the Super Admin has configured.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {schemeRows.map(({ doc, override, effective }) => (
            <NumberingSchemeEditor
              key={doc.id}
              documentType={doc.id}
              documentTypeLabel={doc.label}
              initialScheme={override ?? effective}
              vendorId={params.vendorId}
              isVendorOverride={Boolean(override)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
