/** Legal form values shared by the server data layer and client controls. */
export const LEGAL_MATTER_STATUSES = ["Open", "InProgress", "OnHold", "Closed"] as const;
export type LegalMatterStatus = (typeof LEGAL_MATTER_STATUSES)[number];
