import { SuperAdminGate } from "@/components/SuperAdminGate";
import { LogoMark } from "@/components/LogoMark";
import { NumberingSchemeEditor } from "@/components/NumberingSchemeEditor";
import { NUMBERED_DOCUMENT_TYPES, getMainScheme } from "@/lib/designer/numbering";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "platform.numbering",
  moduleSlug: "platform",
  title: "Numbering — Main",
  path: "/admin/numbering",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: NUMBERED_DOCUMENT_TYPES.map((d) => ({
    key: d.id,
    label: `${d.label} numbering scheme`,
  })),
  explanation:
    "Super Admin's own default numbering scheme per document type (prefix, separator including 'None', Indian financial-year token, zero-padded sequence). This is the MAIN/platform-wide default — any Vendor without its own override (set at /vendor/[vendorId]/settings/numbering) inherits this. 'Fetch next live number' is a real working counter (src/lib/designer/numbering.ts) — every click advances and persists the sequence, it does not just preview a static example.",
  sourceFile: "src/app/admin/numbering/page.tsx",
});

export default async function MainNumberingPage() {
  const schemes = await Promise.all(NUMBERED_DOCUMENT_TYPES.map((doc) => getMainScheme(doc.id)));
  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-extrabold text-text">
              My Biz Flow — Numbering (Main)
            </span>
          </div>
          <p className="mt-1 max-w-[65ch] text-sm text-text-muted">
            Default numbering per document type, platform-wide. A Vendor can override any of
            these for itself at Settings → Numbering; anything they haven&apos;t overridden falls
            back to what&apos;s configured here.
          </p>
        </header>

        <div className="flex flex-col gap-4 p-6">
          {NUMBERED_DOCUMENT_TYPES.map((doc, i) => (
            <NumberingSchemeEditor
              key={doc.id}
              documentType={doc.id}
              documentTypeLabel={doc.label}
              initialScheme={schemes[i]}
            />
          ))}
        </div>
      </div>
    </SuperAdminGate>
  );
}
