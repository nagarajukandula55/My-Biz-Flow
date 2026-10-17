/** These workspaces collect customer payments; SaaS subscription checkout is separate. */
const COLLECTION_MODULES = new Set(["billing", "pos", "clinic", "amc-field-service", "restaurant-pos", "subscriptions", "rentals", "education", "real-estate", "manufacturing", "wholesale-b2b", "logistics-fleet", "legal", "salon-spa", "event-booking", "marketplace", "field-force", "hotel"]);

export function canConfigureBusinessPayments(modules: readonly string[]) {
  return !modules.includes("service-centre") && modules.some(module => COLLECTION_MODULES.has(module));
}

export function readBusinessUpiId(value: unknown): string | null {
  if (typeof value !== "string") throw new Error("Enter a valid business UPI ID.");
  const upiId = value.trim();
  if (!upiId) return null;
  if (upiId.length > 200 || !/^[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]{2,}$/.test(upiId)) throw new Error("Enter a business UPI ID such as business@bank, without spaces or a payment link.");
  return upiId;
}
