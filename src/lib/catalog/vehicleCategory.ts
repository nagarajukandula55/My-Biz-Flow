/**
 * Vehicle category taxonomy — the AUTOMOBILE-domain counterpart to the
 * electronics DEVICE_CATEGORIES list in
 * src/lib/sample-data/service-centre.ts.
 *
 * PROVENANCE: this is NOT ported from the AN-CRM reference app. AN-CRM has
 * no automobile/vehicle service concept anywhere — its job sheet types the
 * device against a fixed 45-value electronics-only taxonomy and its models
 * carry no registration/odometer/vehicle field of any kind. This taxonomy
 * is a deliberate My-Biz-Flow extension added on direct product request, so
 * it is designed from the real Indian vehicle-service market rather than
 * matched against a reference file.
 *
 * It is kept in its OWN file and its OWN const on purpose: DEVICE_CATEGORIES
 * is verified-real, electronics-only, and must never acquire vehicle
 * entries (an earlier build pass mixed invented two-wheeler values into it
 * and that was reverted). Anywhere the two lists meet — the workorder
 * intake form, the Brand/Model catalog — they meet as two clearly
 * domain-tagged sets, never as one merged list.
 *
 * Deliberately a compact, honest set of vehicle classes a repair/service
 * shop actually books work against, not an exhaustive RTO classification.
 */

export const VEHICLE_CATEGORIES = [
  "MOTORCYCLE",
  "SCOOTER",
  "MOPED",
  "ELECTRIC_TWO_WHEELER",
  "HATCHBACK",
  "SEDAN",
  "SUV",
  "MUV_VAN",
  "ELECTRIC_CAR",
  "AUTO_RICKSHAW",
  "PICKUP_LCV",
  "TRUCK_HCV",
  "BUS_TEMPO_TRAVELLER",
  "TRACTOR",
  "CONSTRUCTION_EQUIPMENT",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  MOTORCYCLE: "Motorcycle",
  SCOOTER: "Scooter",
  MOPED: "Moped",
  ELECTRIC_TWO_WHEELER: "Electric Two-Wheeler",
  HATCHBACK: "Car — Hatchback",
  SEDAN: "Car — Sedan",
  SUV: "Car — SUV",
  MUV_VAN: "Car — MUV / Van",
  ELECTRIC_CAR: "Car — Electric",
  AUTO_RICKSHAW: "Auto Rickshaw / Three-Wheeler",
  PICKUP_LCV: "Pickup / Light Commercial Vehicle",
  TRUCK_HCV: "Truck / Heavy Commercial Vehicle",
  BUS_TEMPO_TRAVELLER: "Bus / Tempo Traveller",
  TRACTOR: "Tractor",
  CONSTRUCTION_EQUIPMENT: "Construction Equipment",
};

/**
 * Coarse grouping used as the <optgroup> heading when vehicle categories
 * are shown alongside electronics ones on the intake form.
 */
export const VEHICLE_CATEGORY_GROUPS: Record<string, string> = {
  MOTORCYCLE: "Two-Wheeler",
  SCOOTER: "Two-Wheeler",
  MOPED: "Two-Wheeler",
  ELECTRIC_TWO_WHEELER: "Two-Wheeler",
  HATCHBACK: "Car / Four-Wheeler",
  SEDAN: "Car / Four-Wheeler",
  SUV: "Car / Four-Wheeler",
  MUV_VAN: "Car / Four-Wheeler",
  ELECTRIC_CAR: "Car / Four-Wheeler",
  AUTO_RICKSHAW: "Commercial Vehicle",
  PICKUP_LCV: "Commercial Vehicle",
  TRUCK_HCV: "Commercial Vehicle",
  BUS_TEMPO_TRAVELLER: "Commercial Vehicle",
  TRACTOR: "Farm & Construction",
  CONSTRUCTION_EQUIPMENT: "Farm & Construction",
};
