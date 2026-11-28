export const LEAD_STATUSES = ["New", "Contacted", "Interested", "FollowUpRequired", "Accepted", "Closed", "Lost", "DoNotCall"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const TERMINAL_LEAD_STATUSES = ["Accepted", "Closed", "Lost", "DoNotCall"] as const;
export const CALL_OUTCOMES = ["Interested", "NotReachable", "FollowUpRequired", "Accepted", "Closed", "DoNotCall", "WrongNumber"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const TEMPLATE_CATEGORIES = ["Welcome", "ProductInfo", "FollowUp", "General"] as const;
