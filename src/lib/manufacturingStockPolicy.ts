/** Quantities remain the BOM's existing per-order quantities; aggregate duplicate materials before validation. */
export function aggregateMaterialRequirements(lines: { materialId: string; materialLabel: string; quantity: number }[]) {
  const requirements = new Map<string, { materialId: string; materialLabel: string; quantity: number }>();
  for (const line of lines) {
    const code = line.materialId.split(" — ")[0].trim();
    if (!code || !Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error("Invalid material quantity.");
    const total = (requirements.get(code)?.quantity ?? 0) + line.quantity;
    if (!Number.isFinite(total)) throw new Error("Invalid total quantity.");
    requirements.set(code, { materialId: code, materialLabel: line.materialLabel, quantity: total });
  }
  return Array.from(requirements.values());
}
