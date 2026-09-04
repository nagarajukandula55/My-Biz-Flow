import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { NumberingSchemeEditor } from "@/components/NumberingSchemeEditor";
import {
  NUMBERED_DOCUMENT_TYPES,
  getEffectiveScheme,
  getPartnerScheme,
} from "@/lib/designer/numbering";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.partner-numbering",
  moduleSlug: "platform",
  title: "Settings — Numbering",
  path: "/partner/[partnerId]/settings/numbering",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: NUMBERED_DOCUMENT_TYPES.map((d) => ({
    key: d.id,
    label: `${d.label} numbering override`,
  })),
  explanation:
    "Per-Partner numbering overrides — each Partner can set its own prefix/separator/financial-year/sequence scheme per document type instead of the Super Admin's Main default (/admin/numbering). A document type with no override inherits Main automatically. 'Fetch next live number' is scoped to this Partner's own counter, independent of Main's and every other Partner's.",
  sourceFile: "src/app/partner/[partnerId]/settings/numbering/page.tsx",
});

export default async function PartnerNumberingPage({ params }: { params: { partnerId: string } }) {
  const schemeRows = await Promise.all(
    NUMBERED_DOCUMENT_TYPES.map(async (doc) => ({
      doc,
      override: await getPartnerScheme(params.partnerId, doc.id),
      effective: await getEffectiveScheme(doc.id, params.partnerId),
    }))
  );
  return (
    <AppShell topbarTitle="Settings — Numbering">
      <div>
        <Link
          href={`/partner/${params.partnerId}/settings`}
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
              partnerId={params.partnerId}
              isPartnerOverride={Boolean(override)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
