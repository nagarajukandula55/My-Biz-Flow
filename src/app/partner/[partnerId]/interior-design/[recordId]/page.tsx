import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RecordDetail } from "@/components/RecordDetail";
import { getBusinessRecord } from "@/lib/businessRecords";
import { registerPage } from "@/lib/designer/registry";
import { StatusActions } from "../StatusActions";

registerPage({ id: "interior-design.detail", moduleSlug: "interior-design", title: "Interior Design — Project / BOQ Detail", path: "/partner/[partnerId]/interior-design/[recordId]", kind: "detail", superAdminOnly: false, customizableRegions: [], explanation: "Project, site, room, BOQ, approval and billing summary.", sourceFile: "src/app/partner/[partnerId]/interior-design/[recordId]/page.tsx" });

export default async function InteriorDesignDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "interior-design", params.recordId); if (!record) notFound();
  const boqLines = Array.isArray(record.boqLines) ? record.boqLines as Array<any> : [];
  const estimatedCost = boqLines.reduce((s, l) => s + Number(l.quantity ?? 0) * (1 + Number(l.wastagePercent ?? 0) / 100) * Number(l.purchaseRate ?? 0), 0);
  const estimatedMargin = Number(record.estimatedTotal ?? 0) - estimatedCost;
  return <AppShell topbarTitle="Interior Design & Materials"><div className="mbf-page"><div className="border-b border-border bg-bg-raised px-6 py-4"><div className="flex items-center justify-between"><div><h1 className="font-display text-lg font-bold text-text">{String(record.projectName ?? record.id)}</h1><p className="mt-1 text-sm text-text-muted">Project / BOQ · {String(record.status ?? "Draft")}</p></div><Link href={`/partner/${params.partnerId}/interior-design`} className="btn-outline">Back</Link></div><div className="mt-3"><StatusActions partnerId={params.partnerId} recordId={params.recordId} status={String(record.status ?? "Draft")} stockConsumed={Boolean(record.stockConsumedAt)} /></div><div className="mt-3 text-sm text-text-muted">Estimated material cost: ₹{estimatedCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })} · Estimated margin: ₹{estimatedMargin.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div></div><RecordDetail recordLabel={String(record.id)} fields={Object.entries(record).filter(([k]) => k !== "id" && k !== "boqLines").map(([key, value]) => ({ key, label: key.replace(/[A-Z]/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()), value: String(value ?? "—"), type: "text" as const }))} /></div></AppShell>;
}
