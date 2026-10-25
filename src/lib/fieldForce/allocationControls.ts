export const DEFAULT_ALLOCATION_CONTROLS = { maxOffersPerBooking: 10, offerExpiryMinutes: 15 } as const;

export function normalizeAllocationControls(input: { maxOffersPerBooking?: number; offerExpiryMinutes?: number }) {
  const rawOffers = input.maxOffersPerBooking ?? DEFAULT_ALLOCATION_CONTROLS.maxOffersPerBooking;
  const rawExpiry = input.offerExpiryMinutes ?? DEFAULT_ALLOCATION_CONTROLS.offerExpiryMinutes;
  return {
    maxOffersPerBooking: Math.min(50, Math.max(1, Number.isFinite(rawOffers) ? Math.floor(rawOffers) : DEFAULT_ALLOCATION_CONTROLS.maxOffersPerBooking)),
    offerExpiryMinutes: Math.min(120, Math.max(1, Number.isFinite(rawExpiry) ? Math.floor(rawExpiry) : DEFAULT_ALLOCATION_CONTROLS.offerExpiryMinutes)),
  };
}
