import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { verifyDocumentShareToken } from "@/lib/documentShare";
import { SharedDocumentPrintButton } from "@/components/SharedDocumentPrintButton";

export const dynamic = "force-dynamic";

export default async function SharedDocumentPage({ searchParams }: { searchParams: { token?: string } }) {
  if (!searchParams.token) notFound();
  let claims;
  try { claims = await verifyDocumentShareToken(searchParams.token); } catch { notFound(); }
  const record = await getBusinessRecord(claims.partnerId, claims.moduleSlug, claims.recordKey);
  if (!record) notFound();
  const entries = Object.entries(record).filter(([key, value]) => key !== "id" && value !== null && value !== undefined && typeof value !== "object");
  return (
    <main className="min-h-screen bg-white p-6 text-slate-900 print:p-0">
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 p-8 print:border-0">
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div><h1 className="text-xl font-bold">{claims.documentLabel ?? "Document"}</h1><p className="text-sm text-slate-500">Read-only shared copy</p></div>
          <SharedDocumentPrintButton />
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entries.map(([key, value]) => <div key={key}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</dt><dd className="mt-1 break-words text-sm">{String(value)}</dd></div>)}
        </dl>
        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">This link expires automatically after 7 days.</p>
      </div>
    </main>
  );
}
