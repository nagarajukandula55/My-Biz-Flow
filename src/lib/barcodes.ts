/** Partner-owned retail barcode rules.  Internal codes are deliberately not
 * presented as GS1 identifiers: EAN-13 is accepted only when supplied by
 * the business and its check digit is valid. */
export const BARCODE_TYPES = ["CODE128", "EAN13"] as const;
export type BarcodeType = (typeof BARCODE_TYPES)[number];
export type PriceDisplay = "MRP" | "SALE" | "BOTH" | "NONE";
export const LABEL_PRESETS = {
  THERMAL_50X25: { label: "Thermal 50 × 25 mm", widthMm: 50, heightMm: 25 },
  SHELF_100X50: { label: "Shelf 100 × 50 mm", widthMm: 100, heightMm: 50 },
  A4_70X37: { label: "A4 sticker 70 × 37 mm", widthMm: 70, heightMm: 37 },
  CUSTOM: { label: "Custom size", widthMm: 50, heightMm: 25 },
} as const;
export type LabelPreset = keyof typeof LABEL_PRESETS;

export type BarcodeSettings = {
  prefix: string; sequenceStart: number; nextSequence: number; length: number;
  barcodeType: BarcodeType; priceDisplay: PriceDisplay; labelWidthMm: number;
  labelHeightMm: number; labelFields: string[];
  labelPreset: LabelPreset;
};

export const DEFAULT_BARCODE_SETTINGS: BarcodeSettings = {
  prefix: "SKU", sequenceStart: 1, nextSequence: 1, length: 6, barcodeType: "CODE128",
  priceDisplay: "BOTH", labelWidthMm: 50, labelHeightMm: 25,
  labelFields: ["description", "variant", "packSize", "mrp", "offerPrice", "barcode"],
  labelPreset: "THERMAL_50X25",
};

export function normalizeBarcode(value: unknown): string { return String(value ?? "").trim().toUpperCase(); }

export function ean13CheckDigit(firstTwelve: string): number {
  if (!/^\d{12}$/.test(firstTwelve)) throw new Error("EAN-13 needs 12 digits before its check digit.");
  const sum = [...firstTwelve].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function validateBarcode(value: unknown, type: BarcodeType): string | null {
  const code = normalizeBarcode(value);
  if (!code) return "Barcode is required.";
  if (type === "EAN13") {
    if (!/^\d{13}$/.test(code)) return "EAN-13 must contain exactly 13 digits.";
    if (ean13CheckDigit(code.slice(0, 12)) !== Number(code[12])) return "EAN-13 check digit is invalid.";
  } else if (type === "CODE128" && /[^\x20-\x7E]/.test(code)) {
    return "Code 128 supports printable ASCII characters only.";
  }
  return null;
}

export function formatInternalBarcode(settings: Pick<BarcodeSettings, "prefix" | "length">, sequence: number): string {
  const prefix = String(settings.prefix ?? "").trim().toUpperCase().replace(/[^A-Z0-9.\- $/+%]/g, "");
  if (!prefix && settings.length < 1) throw new Error("Set a barcode prefix or sequence length.");
  const serial = String(sequence).padStart(Math.max(1, Math.min(18, Number(settings.length) || 6)), "0");
  return `${prefix}${prefix ? "-" : ""}${serial}`;
}

/** Code 128-B encoder, rendered as SVG bars by BarcodeSymbol. */
const CODE128_PATTERNS = (
  "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232"
).split(" ");

function widthsToBits(widths: string): string { return [...widths].map((width, i) => (i % 2 === 0 ? "1" : "0").repeat(Number(width))).join(""); }

export function code128Bits(value: string): string {
  const values = [...value].map((character) => character.charCodeAt(0) - 32);
  if (values.some((v) => v < 0 || v > 94)) throw new Error("Code 128 value contains unsupported characters.");
  const checksum = (104 + values.reduce((sum, value, index) => sum + value * (index + 1), 0)) % 103;
  return `0000000000${widthsToBits(CODE128_PATTERNS[104])}${values.map((v) => widthsToBits(CODE128_PATTERNS[v])).join("")}${widthsToBits(CODE128_PATTERNS[checksum])}${widthsToBits("2331112")}0000000000`;
}

const EAN_L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const EAN_G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const EAN_R = EAN_L.map((bits) => [...bits].map((bit) => (bit === "1" ? "0" : "1")).join(""));
const EAN_PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13Bits(value: string): string {
  if (validateBarcode(value, "EAN13")) throw new Error("Invalid EAN-13 value.");
  const digits = [...value].map(Number);
  const parity = EAN_PARITY[digits[0]];
  const left = digits.slice(1, 7).map((digit, index) => (parity[index] === "L" ? EAN_L[digit] : EAN_G[digit])).join("");
  return `0000000000${"101"}${left}${"01010"}${digits.slice(7).map((digit) => EAN_R[digit]).join("")}${"101"}0000000000`;
}

export function barcodeBits(value: string, type: BarcodeType): string {
  return type === "EAN13" ? ean13Bits(value) : code128Bits(value);
}
