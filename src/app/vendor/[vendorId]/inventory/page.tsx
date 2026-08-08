import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { Boxes, Warehouse, ClipboardList, SlidersHorizontal, Undo2, PackageCheck } from "lucide-react";
import { bomRows } from "@/lib/sample-data/bom";
import { warehouseRows, stockRows, stockAdjustmentRows, returnOrderRows, partOrderRows } from "@/lib/sample-data/warehouse";

registerPage({
  id: "inventory.hub",
  moduleSlug: "inventory",
  title: "Inventory — Hub",
  path: "/vendor/[vendorId]/inventory",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Landing page for the Inventory / Warehouse module — links out to the Material Catalog (BOM), Warehouses, per-warehouse Stock, Stock Adjustments, Return Orders, and Part Orders, since this module is a hub of related sections rather than one flat record list (see CLAUDE.md's 2026-08-08 Service Centre/POS scoping notes).",
  sourceFile: "src/app/vendor/[vendorId]/inventory/page.tsx",
});

const SECTIONS = [
  {
    href: "bom",
    icon: Boxes,
    label: "Material Catalog (BOM)",
    description: "Flat item master — spares, consumables, and finished-goods products, shared across POS and Service Centre.",
    count: (vendorId: string) => bomRows.length,
  },
  {
    href: "warehouses",
    icon: Warehouse,
    label: "Warehouses",
    description: "Central / Regional / Local warehouse master data.",
    count: () => warehouseRows.length,
  },
  {
    href: "stock",
    icon: ClipboardList,
    label: "Inventory (Stock)",
    description: "Per-warehouse stock ledger — quantity on hand, reserved, available, reorder level.",
    count: () => stockRows.length,
  },
  {
    href: "stock-adjustments",
    icon: SlidersHorizontal,
    label: "Stock Adjustments",
    description: "Manual increase/decrease log — damaged, lost, recount, initial stock.",
    count: () => stockAdjustmentRows.length,
  },
  {
    href: "return-orders",
    icon: Undo2,
    label: "Return Orders",
    description: "Defective/good material sent back from a Service Centre location to its mapped warehouse.",
    count: () => returnOrderRows.length,
  },
  {
    href: "part-orders",
    icon: PackageCheck,
    label: "Part Orders",
    description: "Warehouse dispatching replacement material back to a Service Centre location.",
    count: () => partOrderRows.length,
  },
];

export default async function InventoryHubPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("inventory");

  return (
    <AppShell topbarTitle={mod?.label ?? "Inventory / Warehouse"}>
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={`/vendor/${params.vendorId}/inventory/${s.href}`}
                className="flex flex-col gap-2 rounded-lg border border-border bg-bg-raised p-5 transition-colors hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
                  <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-xs font-semibold text-text-muted">
                    {s.count(params.vendorId)}
                  </span>
                </div>
                <div className="font-display text-sm font-bold text-text">{s.label}</div>
                <p className="text-xs text-text-muted">{s.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
