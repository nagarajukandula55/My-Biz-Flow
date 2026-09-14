import { NumberingSchemeEditor } from "@/components/NumberingSchemeEditor";
import {
  NUMBERED_DOCUMENT_TYPES,
  getEffectiveScheme,
  getPartnerScheme,
} from "@/lib/designer/numbering";

/**
 * Numbering tab content — the same per-document prefix/separator/
 * financial-year/sequence override editor that used to live on its own
 * nav-reachable page (settings/numbering/page.tsx), folded in here as the
 * fourth Settings tab instead (see SettingsTabs.tsx). The standalone page
 * still exists as a redirect for anything that links to it directly.
 */
export async function NumberingPanel({ partnerId }: { partnerId: string }) {
  const schemeRows = await Promise.all(
    NUMBERED_DOCUMENT_TYPES.map(async (doc) => ({
      doc,
      override: await getPartnerScheme(partnerId, doc.id),
      effective: await getEffectiveScheme(doc.id, partnerId),
    }))
  );

  return (
    <section id="settings-panel-numbering" className="border-t border-border pt-8">
      <h2 className="font-display text-lg font-bold text-text">Document numbering</h2>
      <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
        Override the platform default for any document type below — anything left as
        &quot;Inheriting Main&quot; automatically follows whatever the Super Admin has configured.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {schemeRows.map(({ doc, override, effective }) => (
          <NumberingSchemeEditor
            key={doc.id}
            documentType={doc.id}
            documentTypeLabel={doc.label}
            initialScheme={override ?? effective}
            partnerId={partnerId}
            isPartnerOverride={Boolean(override)}
          />
        ))}
      </div>
    </section>
  );
}
