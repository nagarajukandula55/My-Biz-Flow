import { AppShell } from "@/components/AppShell";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { registerPage } from "@/lib/designer/registry";
import { createSupplierAction } from "./actions";

registerPage({ id: "inventory.suppliers", moduleSlug: "inventory", title: "Suppliers", path: "/partner/[partnerId]/inventory/suppliers", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "Supplier master with GST/contact/payment terms, used by procurement and material purchasing workflows.", sourceFile: "src/app/partner/[partnerId]/inventory/suppliers/page.tsx" });

export default async function SuppliersPage({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") return <AppShell topbarTitle="Suppliers"><div className="mbf-page p-6">Owner access is required.</div></AppShell>;
  const suppliers = await listBusinessRecords(params.partnerId, "inventory-supplier");
  const action = createSupplierAction.bind(null, params.partnerId);
  return <AppShell topbarTitle="Suppliers"><div className="mbf-page space-y-6 p-6">
    <div><h1 className="font-display text-xl font-bold text-text">Suppliers</h1><p className="mt-1 text-sm text-text-muted">Maintain supplier contacts, GST details and payment terms for purchasing.</p></div>
    <form action={action} className="grid max-w-4xl gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
      {[["name","Supplier name",true],["contactName","Contact name",false],["phone","Phone",false],["email","Email",false],["gstin","GSTIN",false]].map(([name,label,required]) => <label key={String(name)} className="text-sm">{String(label)}<input name={String(name)} required={Boolean(required)} className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>)}
      <label className="text-sm">Payment terms (days)<input name="paymentTermsDays" type="number" min="0" defaultValue="0" className="mt-1 w-full rounded border border-border bg-bg p-2" /></label>
      <div className="sm:col-span-2"><button className="btn-accent" type="submit">Add supplier</button></div>
    </form>
    <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="p-3">Supplier</th><th className="p-3">Contact</th><th className="p-3">GSTIN</th><th className="p-3">Terms</th><th className="p-3">Status</th></tr></thead><tbody>{suppliers.map(row => <tr key={String(row.id)} className="border-b border-border last:border-0"><td className="p-3 font-medium">{String(row.name)}</td><td className="p-3">{String(row.contactName || row.phone || row.email || "—")}</td><td className="p-3">{String(row.gstin || "—")}</td><td className="p-3">{String(row.paymentTermsDays ?? 0)} days</td><td className="p-3">{String(row.status || "Active")}</td></tr>)}</tbody></table></div>
  </div></AppShell>;
}
