"use server";

import { listBusinessRecords } from "@/lib/businessRecords";
import { assertPageTierAccess } from "@/lib/tenant";
import { requirePosStaffAction } from "@/lib/pos/posAuth";
import { extractSaleFromRecord } from "@/lib/sample-data/pos";

export async function findReturnableSalesByBarcodeAction(partnerId: string, rawBarcode: string): Promise<Array<{ saleId: string; timestamp: string; productName: string; serialNumber?: string }>> {
  await requirePosStaffAction(partnerId);
  await assertPageTierAccess(partnerId, "inventory.barcodes");
  const barcode = rawBarcode.trim().toUpperCase();
  if (!barcode) return [];
  const [materials, stockRows, sales, returns] = await Promise.all([
    listBusinessRecords(partnerId, "inventory-bom"), listBusinessRecords(partnerId, "inventory-stock"), listBusinessRecords(partnerId, "pos"), listBusinessRecords(partnerId, "pos-returns"),
  ]);
  const materialCodes = new Set(materials.filter((row) => String(row["barcode"] ?? "").trim().toUpperCase() === barcode).map((row) => String(row["id"])));
  const stockIds = new Set(stockRows.filter((row) => materialCodes.has(String(row["materialId"] ?? "").split(" - ")[0].trim())).map((row) => String(row["id"])));
  const returned = new Set(returns.map((row) => String(row["saleId"] ?? "")));
  return sales.flatMap((row) => {
    const sale = extractSaleFromRecord(row);
    if (sale.status !== "Completed" || returned.has(String(row["id"]))) return [];
    const line = sale.lines.find((item) => String(item.serialNumber ?? "").trim().toUpperCase() === barcode || stockIds.has(item.sku));
    return line ? [{ saleId: String(row["id"]), timestamp: String(row["transactionTimestamp"] ?? ""), productName: line.productName, serialNumber: line.serialNumber }] : [];
  }).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
}
