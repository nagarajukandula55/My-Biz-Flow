/**
 * GST state codes (the 2-digit prefix of every GSTIN issued in that
 * state/UT) — shared by every place this app needs to print or export a
 * "Place of Supply"/GSTIN state code per CGST Rule 46(m). Keyed lowercase
 * so lookups aren't defeated by "Karnataka" vs "karnataka ".
 */
export function normalizeState(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

export const GST_STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", "punjab": "03", "chandigarh": "04",
  "uttarakhand": "05", "haryana": "06", "delhi": "07", "rajasthan": "08", "uttar pradesh": "09",
  "bihar": "10", "sikkim": "11", "arunachal pradesh": "12", "nagaland": "13", "manipur": "14",
  "mizoram": "15", "tripura": "16", "meghalaya": "17", "assam": "18", "west bengal": "19",
  "jharkhand": "20", "odisha": "21", "chhattisgarh": "22", "madhya pradesh": "23", "gujarat": "24",
  "dadra and nagar haveli and daman and diu": "26", "maharashtra": "27", "andhra pradesh": "28",
  "karnataka": "29", "goa": "30", "lakshadweep": "31", "kerala": "32", "tamil nadu": "33",
  "puducherry": "34", "andaman and nicobar islands": "35", "telangana": "36",
  "andhra pradesh (new)": "37", "ladakh": "38",
};

export function stateCodeOf(stateName?: string): string | undefined {
  return GST_STATE_CODES[normalizeState(stateName)];
}
