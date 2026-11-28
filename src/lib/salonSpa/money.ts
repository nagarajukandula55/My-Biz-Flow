/** Salon catalog and appointment amounts are stored as integer paise. */
export function rupeesToSalonPaise(value: unknown): number {
  const rupees = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(rupees) || rupees < 0 || rupees > Number.MAX_SAFE_INTEGER / 100) {
    throw new Error("Enter a valid non-negative service price.");
  }
  return Math.round(rupees * 100);
}

export function salonPaiseToRupees(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid Salon amount stored in paise.");
  return value / 100;
}
