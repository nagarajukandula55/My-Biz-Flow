export const WHOLESALE_ORDER_STATUSES = ["Requested", "Processing", "Picking", "Packed", "Shipped", "Delivered", "Received", "Cancelled"] as const;
export type WholesaleOrderStatusValue = (typeof WHOLESALE_ORDER_STATUSES)[number];
