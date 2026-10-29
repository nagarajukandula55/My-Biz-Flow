import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DataTable } from "@/components/DataTable";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { interiorDesignColumns } from "@/lib/sample-data/interior-design";
import { registerPage } from "@/lib/designer/registry";

registerPage({ id: "interior-design.list", moduleSlug: "interior-design", title: "Interior Design — Projects / BOQs", path: "/partner/[partnerId]/interior-design", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Projects and measurement-led bills of quantities for interior work.", sourceFile: "src/app/partner/[partnerId]/interior-design/page.tsx" });

export default async function InteriorDesignPage({ params }: { params: { partnerId: string } }) {
  const records = await listBusinessRecords(params.partnerId, "interior-design");
  return <AppShell topbarTitle="Interior Design & Materials"><div className="mbf-page"><div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4"><div><h1 className="font-display text-lg font-bold text-text">Projects / BOQs</h1><p className="mt-1 text-sm text-text-muted">Measurements, materials, estimates and progress billing.</p></div><Link href={`/partner/${params.partnerId}/interior-design/new`} className="btn-accent">+ New Project / BOQ</Link></div><div className="p-6"><DataTable columns={interiorDesignColumns} rows={records as any} onRowClick={undefined} /></div></div></AppShell>;
}
