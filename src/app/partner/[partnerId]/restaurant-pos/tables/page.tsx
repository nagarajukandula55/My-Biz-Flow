import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { StatusChip } from "@/components/StatusChip";
import { listBusinessRecords } from "@/lib/businessRecords";
import { extractOrderFromRecord, isOrderOpenForTable, restaurantTables } from "@/lib/sample-data/restaurant-pos";

registerPage({
  id: "restaurant-pos.tables",
  moduleSlug: "restaurant-pos",
  title: "Restaurant POS — Table Floor",
  path: "/partner/[partnerId]/restaurant-pos/tables",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "The real front-of-house floor view: every table on a fixed floor plan, showing Free vs an order's live status (Open/In kitchen/Served). Clicking a table opens its live cart (tables/[tableNumber]) to add items, send a KOT to the kitchen, and settle the bill — the generic KOT list at restaurant-pos/ stays as the historical order log.",
  sourceFile: "src/app/partner/[partnerId]/restaurant-pos/tables/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RestaurantTablesPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("restaurant-pos");
  const records = await listBusinessRecords(params.partnerId, "restaurant-pos");
  const openByTable = new Map(
    records
      .map(extractOrderFromRecord)
      .filter((o) => isOrderOpenForTable(o.status))
      .map((o) => [o.tableNumber, o] as const)
  );

  return (
    <AppShell topbarTitle={`${mod?.label ?? "Restaurant POS"} — Tables`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Table Floor</h1>
        <p className="mt-1 text-sm text-text-muted">
          Tap a table to open its cart, add items, send a KOT to the kitchen, and settle the bill.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {restaurantTables.map((tableNumber) => {
            const order = openByTable.get(tableNumber);
            return (
              <Link
                key={tableNumber}
                href={`/partner/${params.partnerId}/restaurant-pos/tables/${tableNumber}`}
                className="rounded-lg border border-border bg-bg-raised p-4 transition hover:border-accent"
              >
                <div className="font-display text-lg font-bold text-text">{tableNumber}</div>
                <div className="mt-2">
                  {order ? (
                    <StatusChip
                      label={order.status}
                      variant={order.status === "In kitchen" ? "warning" : order.status === "Served" ? "amber" : "teal"}
                    />
                  ) : (
                    <StatusChip label="Free" variant="neutral" />
                  )}
                </div>
                {order && (
                  <div className="mt-2 text-xs text-text-muted">
                    {order.lines.length} item{order.lines.length === 1 ? "" : "s"} · ₹{order.totalAmount}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
