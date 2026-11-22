import type { Row } from "@/components/DataTable";
import { splitMaterialLabel } from "@/lib/materialLabel";

/**
 * Replaces internal consumption record keys with the business references a
 * user needs to trace stock usage: a Workorder No. for Service Centre work,
 * or an Invoice No. for a direct sales-invoice deduction. BOM remains the
 * current source of truth for the material's displayed name.
 */
export function prepareConsumptionDisplayRows(consumptionRows: Row[], bomRows: Row[]): Row[] {
  const bomByCode = new Map(
    bomRows.map((bom) => [String(bom["id"] ?? "").trim(), String(bom["description"] ?? "").trim()])
  );

  return consumptionRows.map(({ workorderId, invoiceId: _invoiceId, materialId: rawMaterialId, materialLabel: rawMaterialLabel, ...row }) => {
    const source = String(row["source"] ?? "Service Centre");
    const legacyLinkedNumber = String(workorderId ?? "");
    const fromMaterialId = splitMaterialLabel(rawMaterialId);
    const fromMaterialLabel = splitMaterialLabel(rawMaterialLabel);
    const materialCode = fromMaterialId.code || fromMaterialLabel.code;
    const materialName = bomByCode.get(materialCode) || fromMaterialLabel.name || fromMaterialId.name || materialCode;

    return {
      ...row,
      source,
      workorderNumber: source === "Sales Invoice" ? "" : String(row["workorderNumber"] ?? legacyLinkedNumber),
      invoiceNumber: source === "Sales Invoice" ? String(row["invoiceNumber"] ?? legacyLinkedNumber) : "",
      materialCode,
      materialName,
      materialLabel: materialName ? `${materialCode} - ${materialName}` : materialCode,
    };
  });
}
