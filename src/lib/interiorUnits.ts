export type InteriorUnitKind = "count" | "length" | "area" | "volume" | "weight" | "pack" | "time";

export type InteriorUnit = { code: string; label: string; kind: InteriorUnitKind; toBase: number };

/** Canonical base units: piece, metre, square metre, cubic metre, kilogram, pack and hour. */
export const INTERIOR_UNITS: InteriorUnit[] = [
  { code: "pcs", label: "Piece", kind: "count", toBase: 1 }, { code: "pair", label: "Pair", kind: "pack", toBase: 2 }, { code: "set", label: "Set", kind: "pack", toBase: 1 },
  { code: "mm", label: "Millimetre", kind: "length", toBase: 0.001 }, { code: "cm", label: "Centimetre", kind: "length", toBase: 0.01 }, { code: "m", label: "Metre", kind: "length", toBase: 1 }, { code: "inch", label: "Inch", kind: "length", toBase: 0.0254 }, { code: "ft", label: "Foot", kind: "length", toBase: 0.3048 }, { code: "yard", label: "Yard", kind: "length", toBase: 0.9144 },
  { code: "sq.mm", label: "Square millimetre", kind: "area", toBase: 0.000001 }, { code: "sq.cm", label: "Square centimetre", kind: "area", toBase: 0.0001 }, { code: "sq.m", label: "Square metre", kind: "area", toBase: 1 }, { code: "sq.ft", label: "Square foot", kind: "area", toBase: 0.09290304 }, { code: "sq.yard", label: "Square yard", kind: "area", toBase: 0.83612736 },
  { code: "cu.ft", label: "Cubic foot", kind: "volume", toBase: 0.0283168466 }, { code: "cu.m", label: "Cubic metre", kind: "volume", toBase: 1 }, { code: "ml", label: "Millilitre", kind: "volume", toBase: 0.000001 }, { code: "ltr", label: "Litre", kind: "volume", toBase: 0.001 },
  { code: "g", label: "Gram", kind: "weight", toBase: 0.001 }, { code: "kg", label: "Kilogram", kind: "weight", toBase: 1 }, { code: "tonne", label: "Tonne", kind: "weight", toBase: 1000 },
  { code: "hour", label: "Hour", kind: "time", toBase: 1 }, { code: "day", label: "Day", kind: "time", toBase: 8 },
];

export function convertUnit(value: number, from: string, to: string, custom: Record<string, number> = {}): number {
  if (from === to) return value;
  const factor = (custom[from] ?? INTERIOR_UNITS.find((u) => u.code === from)?.toBase);
  const target = (custom[to] ?? INTERIOR_UNITS.find((u) => u.code === to)?.toBase);
  if (!factor || !target) throw new Error(`Unknown unit conversion: ${from} → ${to}`);
  const fromUnit = INTERIOR_UNITS.find((u) => u.code === from);
  const toUnit = INTERIOR_UNITS.find((u) => u.code === to);
  if (fromUnit && toUnit && fromUnit.kind !== toUnit.kind && !(fromUnit.kind === "pack" && toUnit.kind === "count")) throw new Error(`Incompatible unit types: ${from} and ${to}`);
  return (value * factor) / target;
}

export function measuredQuantity(mode: "count" | "area" | "running" | "volume", length = 0, width = 0, height = 0, wastagePercent = 0): number {
  const base = mode === "area" ? length * width : mode === "running" ? length : mode === "volume" ? length * width * height : length;
  return Number((base * (1 + Math.max(0, wastagePercent) / 100)).toFixed(4));
}
