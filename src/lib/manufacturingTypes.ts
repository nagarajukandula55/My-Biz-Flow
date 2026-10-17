/** Shared production vocabulary: safe to import from client components. */
export const PRODUCTION_ORDER_STATUSES = ["Planned", "InProduction", "QC", "Completed", "Delayed"] as const;
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];
