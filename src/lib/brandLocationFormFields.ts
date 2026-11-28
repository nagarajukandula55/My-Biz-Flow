import type { FormFieldDef } from "@/components/RecordForm";
import { getWarehouseOptionsForPartner } from "@/lib/sample-data/warehouse";
import { BRAND_STATUSES } from "@/lib/sample-data/brand";

/** Fetches this partner's real warehouse options for the location form. */
export async function getLocationFormFields(partnerId: string): Promise<FormFieldDef[]> {
  const warehouseOptions = await getWarehouseOptionsForPartner(partnerId);
  return [
    { key: "locationName", label: "Location Name", type: "text", required: true },
    { key: "city", label: "City", type: "text", required: true },
    { key: "modulesEnabled", label: "Modules Enabled", type: "textarea", required: false },
    { key: "mappedWarehouseId", label: "Mapped Warehouse", type: "select", required: false, options: warehouseOptions.map((o) => o.label) },
    { key: "monthlyRevenue", label: "Monthly Revenue (₹)", type: "currency", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...BRAND_STATUSES] },
    { key: "openedDate", label: "Opened Date", type: "date", required: false },
  ];
}
