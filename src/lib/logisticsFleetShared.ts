/** Delivery stages shared by server transitions and client controls. */
export const DELIVERY_STAGES = ["Pending", "Out for Delivery", "Delivered"] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number] | "Failed";
