import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { LogoMark } from "@/components/LogoMark";
import { getRegisteredPages, registerPage } from "@/lib/designer/registry";
import "@/lib/designer/registerAll";
import { getFieldSchema } from "@/lib/designer/fieldSchema";
import { getPageCustomization } from "@/lib/designer/customizations";
import { getDocumentTemplate } from "@/lib/designer/documentTemplates";
import { getEffectiveScheme } from "@/lib/designer/numbering";
import { formatNumber } from "@/lib/designer/numberingFormat";
import { MODULE_DATA } from "@/lib/moduleData";
import { DesignerFieldEditor } from "@/components/DesignerFieldEditor";
import { DesignerDocumentEditor } from "@/components/DesignerDocumentEditor";
import { ModuleAppearanceEditor } from "@/components/ModuleAppearanceEditor";
import { MODULES } from "@/lib/designer/modules";
import { getModuleAppearance } from "@/lib/designer/moduleAppearance";

registerPage({
  id: "platform.designer.detail",
  moduleSlug: "platform",
  title: "Designer — Page Detail",
  path: "/admin/designer/[pageId]",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [],
  explanation:
    "Super-Admin-only developer tool: looks up a single registered page by id, shows its metadata (module, kind, customizable regions, plain-language explanation), and reads its actual source file from disk to render for inspection — a live, always-accurate view of what each page in the product does, not a maintained-by-hand doc that can drift.",
  sourceFile: "src/app/admin/designer/[pageId]/page.tsx",
});

export default function PageDetailPage({ params }: { params: { pageId: string } }) {
  const page = getRegisteredPages().find((p) => p.id === params.pageId);
  if (!page) notFound();

  const baseFields = getFieldSchema(page.id);
  const customization = getPageCustomization(page.id);

  let source: string | null = null;
  let readError: string | null = null;
  try {
    source = fs.readFileSync(path.join(process.cwd(), page.sourceFile), "utf-8");
  } catch (err) {
    readError = err instanceof Error ? err.message : String(err);
  }

  return (
    <SuperAdminGate>
      <div className="min-h-screen w-full bg-bg">
        <header className="border-b border-border bg-bg-raised px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <span className="font-display text-base font-extrabold text-text">
              My Biz Flow — Designer
            </span>
          </div>
          <Link
            href="/admin/designer"
            className="mt-1 inline-block text-sm font-semibold text-teal hover:underline"
          >
            &larr; Back to registry
          </Link>
        </header>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-text">{page.title}</h1>
            {page.superAdminOnly && <StatusChip variant="warning" label="Super Admin only" />}
            <StatusChip variant="neutral" label={page.kind} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoTile label="Page ID" value={page.id} mono />
            <InfoTile label="Module" value={page.moduleSlug} mono />
            <InfoTile label="Path" value={page.path} mono />
            <InfoTile label="Source file" value={page.sourceFile} mono />
          </div>

          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">What this page does</h2>
            <p className="mbf-prose mt-2 text-sm text-text-muted">{page.explanation}</p>
          </div>

          {page.customizableRegions.length > 0 && (
            <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
              <h2 className="font-display text-base font-bold text-text">Customizable regions</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {page.customizableRegions.map((region) => (
                  <li
                    key={region.key}
                    className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-muted"
                    title={region.key}
                  >
                    {region.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page.kind === "list" && MODULES.some((m) => m.slug === page.moduleSlug) && (
            <ModuleAppearanceEditor
              slug={page.moduleSlug}
              defaultLabel={MODULES.find((m) => m.slug === page.moduleSlug)!.label}
              initialLabel={getModuleAppearance(page.moduleSlug).label}
              initialIcon={getModuleAppearance(page.moduleSlug).icon}
            />
          )}

          {page.kind === "document" && baseFields && (
            <DesignerDocumentEditor
              pageId={page.id}
              availableFields={[
                { key: "documentNumber", label: "Document Number (from Numbering system)", type: "text" },
                ...baseFields,
              ]}
              initialTemplate={getDocumentTemplate(page.id) ?? ""}
              sampleRecord={{
                ...(MODULE_DATA[page.moduleSlug]?.rows[0] ?? {}),
                documentNumber: formatNumber(getEffectiveScheme(page.id), getEffectiveScheme(page.id).sequenceStart),
              }}
            />
          )}

          {page.kind !== "document" && baseFields && (
            <DesignerFieldEditor pageId={page.id} baseFields={baseFields} customization={customization} />
          )}

          <div className="mt-6 rounded-lg border border-border bg-bg-raised p-5">
            <h2 className="font-display text-base font-bold text-text">Source</h2>
            {readError ? (
              <p className="mt-2 text-sm text-danger">Could not read source file: {readError}</p>
            ) : (
              <pre className="mt-3 max-h-[70vh] overflow-auto rounded-md border border-border bg-bg-sunken p-4 font-mono text-xs leading-relaxed text-text">
                <code>{source}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}

function InfoTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-bg-raised p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
      <div className={`mt-1 break-all text-sm text-text ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
