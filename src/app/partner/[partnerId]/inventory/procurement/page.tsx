import { AppShell } from "@/components/AppShell";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { registerPage } from "@/lib/designer/registry";
import { createPurchaseOrderAction, receivePurchaseOrderAction } from "./actions";

registerPage({ id: "inventory.procurement", moduleSlug: "inventory", title: "Procurement", path: "/partner/[partnerId]/inventory/procurement", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Create supplier purchase orders and receive materials into Good inventory with an auditable receipt record.", sourceFile: "src/app/partner/[partnerId]/inventory/procurement/page.tsx" });

export default async function ProcurementPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") return <AppShell topbarTitle="Procurement"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const [suppliers, orders] = await Promise.all([listBusinessRecords(params.partnerId, "inventory-supplier"), listBusinessRecords(params.partnerId, "inventory-purchase-order")]);
  const create = createPurchaseOrderAction.bind(null, params.partnerId);
  return <AppShell topbarTitle="Procurement"><div className="mbf-page space-y-6 p-6">
    <div><h1 className="font-display text-xl font-bold text-text">Procurement</h1><p className="mt-1 text-sm text-text-muted">Raise supplier purchase orders and receive stock into a selected warehouse.</p></div>
    <form action={create} className="grid max-w-5xl gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-3">
      <label className="text-sm">Supplier<select name="supplierId" required className="mt-1 w-full rounded border border-border bg-bg p-2">{suppliers.map(s => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}</select></label>
      <label className="text-sm">Supplier name<input name="supplierName" required className="mt-1 w-full rounded border border-border bg-bg p-2" placeholder="Name shown on PO" /></label>
      <label className="text-sm">Expected date<input name="expectedDate" type="date" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <label className="text-sm">Material ID<input name="materialId" required className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <label className="text-sm">Material label<input name="materialLabel" required className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <label className="text-sm">Warehouse<input name="warehouseName" required defaultValue="Main Warehouse" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <label className="text-sm">Quantity<input name="quantity" required type="number" min="0.0001" step="0.0001" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <label className="text-sm">Unit price<input name="unitPrice" required type="number" min="0" step="0.01" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <div className="flex items-end"><button className="btn-accent" type="submit">Create purchase order</button></div>
    </form>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="p-3">Supplier</th><th className="p-3">Total</th><th className="p-3">Expected</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{orders.map(order => <tr key={String(order.id)} className="border-b border-border last:border-0"><td className="p-3">{String(order.supplierName)}</td><td className="p-3">₹{String(order.totalAmount)}</td><td className="p-3">{String(order.expectedDate || "—")}</td><td className="p-3">{String(order.status)}</td><td className="p-3">{String(order.status) !== "Received" && <form action={receivePurchaseOrderAction.bind(null, params.partnerId)}><input type="hidden" name="purchaseOrderId" value={String(order.id)} /><button className="text-teal underline" type="submit">Receive into stock</button></form>}</td></tr>)}</tbody></table></div>
  </div></AppShell>;
}
