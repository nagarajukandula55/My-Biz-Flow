import type { Column, Row } from "@/components/DataTable";

import { posColumns, posRows } from "@/lib/sample-data/pos";
import { serviceCentreColumns, serviceCentreRows } from "@/lib/sample-data/service-centre";
import { billingColumns, billingRows } from "@/lib/sample-data/billing";
import { brandColumns, brandRows } from "@/lib/sample-data/brand";
import { clinicColumns, clinicRows } from "@/lib/sample-data/clinic";
import { amcFieldServiceColumns, amcFieldServiceRows } from "@/lib/sample-data/amc-field-service";
import { restaurantPosColumns, restaurantPosRows } from "@/lib/sample-data/restaurant-pos";
import { subscriptionsColumns, subscriptionsRows } from "@/lib/sample-data/subscriptions";
import { realEstateColumns, realEstateRows } from "@/lib/sample-data/real-estate";
import { rentalsColumns, rentalsRows } from "@/lib/sample-data/rentals";
import { educationColumns, educationRows } from "@/lib/sample-data/education";
import { manufacturingColumns, manufacturingRows } from "@/lib/sample-data/manufacturing";
import { wholesaleB2bColumns, wholesaleB2bRows } from "@/lib/sample-data/wholesale-b2b";
import { logisticsFleetColumns, logisticsFleetRows } from "@/lib/sample-data/logistics-fleet";
import { legalColumns, legalRows } from "@/lib/sample-data/legal";
import { eventBookingColumns, eventBookingRows } from "@/lib/sample-data/event-booking";
import { inventoryColumns, inventoryRows } from "@/lib/sample-data/inventory";
import { accountingGstColumns, accountingGstRows } from "@/lib/sample-data/accounting-gst";
import { loyaltyRewardsColumns, loyaltyRewardsRows } from "@/lib/sample-data/loyalty-rewards";
import { hrmsColumns, hrmsRows } from "@/lib/sample-data/hrms";
import { marketplaceColumns, marketplaceRows } from "@/lib/sample-data/marketplace";

/**
 * Explicit per-module sample-data registry — same "enumerate, don't rely
 * on dynamic magic" convention as src/lib/designer/registerAll.ts. Powers
 * any feature that needs to compute something across all 21 modules
 * generically (the Type-wise dynamic dashboard, Analytics' cross-module
 * bar chart) without hardcoding per-module logic 21 times.
 */
export const MODULE_DATA: Record<string, { columns: Column[]; rows: Row[] }> = {
  pos: { columns: posColumns, rows: posRows },
  "service-centre": { columns: serviceCentreColumns, rows: serviceCentreRows },
  billing: { columns: billingColumns, rows: billingRows },
  brand: { columns: brandColumns, rows: brandRows },
  clinic: { columns: clinicColumns, rows: clinicRows },
  "amc-field-service": { columns: amcFieldServiceColumns, rows: amcFieldServiceRows },
  "restaurant-pos": { columns: restaurantPosColumns, rows: restaurantPosRows },
  subscriptions: { columns: subscriptionsColumns, rows: subscriptionsRows },
  "real-estate": { columns: realEstateColumns, rows: realEstateRows },
  rentals: { columns: rentalsColumns, rows: rentalsRows },
  education: { columns: educationColumns, rows: educationRows },
  manufacturing: { columns: manufacturingColumns, rows: manufacturingRows },
  "wholesale-b2b": { columns: wholesaleB2bColumns, rows: wholesaleB2bRows },
  "logistics-fleet": { columns: logisticsFleetColumns, rows: logisticsFleetRows },
  legal: { columns: legalColumns, rows: legalRows },
  "event-booking": { columns: eventBookingColumns, rows: eventBookingRows },
  inventory: { columns: inventoryColumns, rows: inventoryRows },
  "accounting-gst": { columns: accountingGstColumns, rows: accountingGstRows },
  "loyalty-rewards": { columns: loyaltyRewardsColumns, rows: loyaltyRewardsRows },
  hrms: { columns: hrmsColumns, rows: hrmsRows },
  marketplace: { columns: marketplaceColumns, rows: marketplaceRows },
};

/**
 * A module's record count, and — if it has a `currency`-typed column — the
 * sum of that column. Used to generate a DashboardWidget per enabled
 * module without 21 hand-written aggregation functions.
 */
export function computeModuleStat(slug: string): { count: number; currencySum?: number } {
  const data = MODULE_DATA[slug];
  if (!data) return { count: 0 };

  const currencyColumn = data.columns.find((c) => c.type === "currency");
  if (!currencyColumn) return { count: data.rows.length };

  const sum = data.rows.reduce((total, row) => {
    const value = row[currencyColumn.key];
    return total + (typeof value === "number" ? value : 0);
  }, 0);

  return { count: data.rows.length, currencySum: sum };
}
