/**
 * Service Centre service types a partner can offer — a fixed, small list
 * rather than a Designer-editable master, since these two map directly to
 * distinct operational flows (a technician dispatched to the customer vs.
 * the customer dropping the device off) that the rest of the app (public
 * Book Appointment form, Inquiry auto-assignment) branches on by exact
 * code. Stored on Partner.serviceCentreServiceTypes as a JSON string array
 * of these codes.
 */
export const SERVICE_TYPES = [
  { code: "ONSITE", label: "Onsite Visit", description: "We visit the customer's place and repair it there." },
  { code: "WALK_IN", label: "Walk-in", description: "The customer brings the device in to be repaired." },
] as const;

export type ServiceTypeCode = (typeof SERVICE_TYPES)[number]["code"];

export function serviceTypeLabel(code: string): string {
  return SERVICE_TYPES.find((t) => t.code === code)?.label ?? code;
}

export function parseServiceTypes(value: unknown): ServiceTypeCode[] {
  if (!Array.isArray(value)) return [];
  const valid = new Set(SERVICE_TYPES.map((t) => t.code));
  return value.filter((v): v is ServiceTypeCode => typeof v === "string" && valid.has(v as ServiceTypeCode));
}

export function parsePincodeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && /^\d{6}$/.test(v));
}
