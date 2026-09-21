import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { notFound, redirect } from "next/navigation";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { extractSaleFromRecord } from "@/lib/sample-data/pos";
import { requirePosStaff } from "@/lib/pos/posAuth";
import { hasExistingReturn } from "@/lib/pos/posReturns";
import { createPosReturnAction } from "./actions";

registerPage({
  id: "pos.return",
  moduleSlug: "pos",
  title: "POS — Return / Refund",
  path: "/partner/[partnerId]/pos/[recordId]/return",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Partial return/refund against one Completed sale — pick a quantity to return per line, a refund method, and a reason. Restocks the exact Good units returned to the same warehouse the sale sold from, and records the refund (src/lib/pos/posReturns.ts). One return per sale for this pass — a sale already returned redirects back to its detail page instead of allowing a second one.",
  sourceFile: "src/app/partner/[partnerId]/pos/[recordId]/return/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PosReturnPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePosStaff(params.partnerId);
  const record = await getBusinessRecord(params.partnerId, "pos", params.recordId);
  if (!record) notFound();
  const sale = extractSaleFromRecord(record);
  if (sale.status !== "Completed") redirect(`/partner/${params.partnerId}/pos/${params.recordId}`);
  if (await hasExistingReturn(params.partnerId, params.recordId)) {
    redirect(`/partner/${params.partnerId}/pos/${params.recordId}`);
  }

  const locationId = String(record["locationId"] ?? "");
  const action = createPosReturnAction.bind(null, params.partnerId, params.recordId);

  return (
    <AppShell topbarTitle="POS — Return / Refund">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-xl font-bold text-text">Return / Refund — {params.recordId}</h1>
        <p className="mt-1 text-sm text-text-muted">Enter a quantity to return for each line you're refunding.</p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="locationId" value={locationId} />

          <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5 text-right">Sold Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Price</th>
                  <th className="px-3 py-2.5 text-right">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {sale.lines.map((line) => (
                  <tr key={line.sku} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      {line.productName}
                      <input type="hidden" name="sku" value={line.sku} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">₹{line.unitPrice}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        name="qty"
                        min={0}
                        max={line.qty}
                        defaultValue={0}
                        className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-right text-sm text-text"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Refund Method
            <select name="refundMethod" defaultValue="Cash" className="mt-1 block w-48 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Wallet">Wallet</option>
            </select>
          </label>

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Reason
            <input name="reason" type="text" placeholder="e.g. Customer changed mind, defective item" className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text" />
          </label>

          <button type="submit" className="btn-accent">
            Process Return
          </button>
        </form>
      </div>
    </AppShell>
  );
}
