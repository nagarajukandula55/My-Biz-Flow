import { listBusinessRecords } from "@/lib/businessRecords";
import { runWorkflowAutomations } from "@/lib/workflowAutomation";

export async function runLowStockAutomations(partnerId: string): Promise<number> {
  const rows = await listBusinessRecords(partnerId, "inventory-stock");
  let triggered = 0;
  for (const row of rows) {
    if (String(row.condition ?? "Good") === "Defective") continue;
    const available = Number(row.availableQty ?? row.qtyOnHand ?? 0);
    const reorderLevel = Number(row.reorderLevel ?? 0);
    if (!Number.isFinite(available) || !Number.isFinite(reorderLevel) || reorderLevel <= 0 || available > reorderLevel) continue;
    await runWorkflowAutomations(partnerId, { trigger: "stock.low", moduleSlug: "inventory", recordId: String(row.id), record: row });
    triggered++;
  }
  return triggered;
}
