/**
 * Starter Electrical + Electronics service catalog for the Field Force
 * module — seeded into the `Service` table on first read
 * (src/lib/fieldForce/servicesData.ts's ensureServiceCatalogSeeded()) if
 * that table is empty. Editable afterwards from field-force/admin
 * (add/edit/deactivate a row) without a schema change.
 */
export const STARTER_SERVICES: { name: string; category: string }[] = [
  { name: "Wiring / Rewiring", category: "Electrical" },
  { name: "Switchgear & MCB Installation", category: "Electrical" },
  { name: "Inverter / UPS Installation", category: "Electrical" },
  { name: "Solar Panel Installation", category: "Electrical" },
  { name: "Fan Installation", category: "Electrical" },
  { name: "AC Installation", category: "Electrical" },
  { name: "AC Repair & Gas Refill", category: "Electronics" },
  { name: "TV Repair", category: "Electronics" },
  { name: "Refrigerator Repair", category: "Electronics" },
  { name: "Washing Machine Repair", category: "Electronics" },
  { name: "Microwave / Oven Repair", category: "Electronics" },
  { name: "CCTV Installation", category: "Electronics" },
  { name: "Home Automation Wiring", category: "Electronics" },
  { name: "Water Purifier (RO) Installation & Repair", category: "Electronics" },
  { name: "Geyser Installation & Repair", category: "Electrical" },
];
