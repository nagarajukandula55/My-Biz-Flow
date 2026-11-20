import { getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { DEFAULT_BARCODE_SETTINGS, normalizeBarcode, type BarcodeSettings, validateBarcode } from "@/lib/barcodes";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";

/** Barcodes are deliberately a POS retail tool, not a generic Inventory or
 * Service Centre setting. Both the UI and every write action use this gate. */
export async function assertPosBarcodeAccess(partnerId: string): Promise<void> {
  if (!(await getVisibleModuleSlugs(partnerId)).includes("pos")) {
    throw new Error("Barcode labels are available only to businesses with an active POS module.");
  }
}

export async function getBarcodeSettings(partnerId: string): Promise<BarcodeSettings> {
  const saved = await getBusinessRecord(partnerId, "inventory-barcode-settings", "default");
  return { ...DEFAULT_BARCODE_SETTINGS, ...(saved ?? {}), labelFields: Array.isArray(saved?.["labelFields"]) ? saved!["labelFields"] as string[] : DEFAULT_BARCODE_SETTINGS.labelFields };
}

export async function assertMaterialBarcodeAvailable(partnerId: string, values: Record<string, unknown>, exceptMaterialId?: string): Promise<void> {
  const code = normalizeBarcode(values["barcode"]);
  if (!code) return;
  const type = String(values["barcodeType"] ?? "CODE128") as BarcodeSettings["barcodeType"];
  const error = validateBarcode(code, type);
  if (error) throw new Error(error);
  const matches = (await listBusinessRecords(partnerId, "inventory-bom"))
    .filter((row) => String(row["id"]) !== exceptMaterialId && normalizeBarcode(row["barcode"]) === code);
  if (matches.length) throw new Error(`Barcode "${code}" is already assigned to material ${String(matches[0]["id"])}.`);
}

export async function assignGeneratedBarcode(partnerId: string, materialId: string, settings: BarcodeSettings, barcode: string): Promise<void> {
  const material = await getBusinessRecord(partnerId, "inventory-bom", materialId);
  if (!material) throw new Error("Material not found.");
  await assertMaterialBarcodeAvailable(partnerId, { barcode, barcodeType: settings.barcodeType }, materialId);
  await updateBusinessRecord(partnerId, "inventory-bom", materialId, {
    ...material, barcode, barcodeType: settings.barcodeType, barcodeSource: "Generated", barcodeAssignedAt: new Date().toISOString(),
  });
}
