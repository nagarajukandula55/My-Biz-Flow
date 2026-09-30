export type EventBookingStatus = "Requested" | "Confirmed" | "InProgress" | "Completed" | "Cancelled";
export const EVENT_BOOKING_STATUSES: EventBookingStatus[] = ["Requested", "Confirmed", "InProgress", "Completed", "Cancelled"];
export type EventBookingType = "OneTime" | "Recurring";
