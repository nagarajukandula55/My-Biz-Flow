/**
 * India state/city/pincode reference data — curated sample set, NOT the
 * real central-api pincode database (per CLAUDE.md, central-api owns
 * cross-tenant data; that integration is a later phase). Structured so
 * swapping lookupPincode() for a real central-api call is a one-line
 * change: same input/output shape, same call site (Signup form).
 */

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

/** GST 2-digit state codes — standard public GSTIN state-code table (not central-api's copy). */
export const GST_STATE_CODES: { code: string; state: string }[] = [
  { code: "01", state: "Jammu and Kashmir" },
  { code: "02", state: "Himachal Pradesh" },
  { code: "03", state: "Punjab" },
  { code: "04", state: "Chandigarh" },
  { code: "05", state: "Uttarakhand" },
  { code: "06", state: "Haryana" },
  { code: "07", state: "Delhi" },
  { code: "08", state: "Rajasthan" },
  { code: "09", state: "Uttar Pradesh" },
  { code: "10", state: "Bihar" },
  { code: "11", state: "Sikkim" },
  { code: "12", state: "Arunachal Pradesh" },
  { code: "13", state: "Nagaland" },
  { code: "14", state: "Manipur" },
  { code: "15", state: "Mizoram" },
  { code: "16", state: "Tripura" },
  { code: "17", state: "Meghalaya" },
  { code: "18", state: "Assam" },
  { code: "19", state: "West Bengal" },
  { code: "20", state: "Jharkhand" },
  { code: "21", state: "Odisha" },
  { code: "22", state: "Chhattisgarh" },
  { code: "23", state: "Madhya Pradesh" },
  { code: "24", state: "Gujarat" },
  { code: "26", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", state: "Maharashtra" },
  { code: "29", state: "Karnataka" },
  { code: "30", state: "Goa" },
  { code: "31", state: "Lakshadweep" },
  { code: "32", state: "Kerala" },
  { code: "33", state: "Tamil Nadu" },
  { code: "34", state: "Puducherry" },
  { code: "35", state: "Andaman and Nicobar Islands" },
  { code: "36", state: "Telangana" },
  { code: "37", state: "Andhra Pradesh" },
  { code: "38", state: "Ladakh" },
];

export function gstStateCodeFor(state: string): string | undefined {
  return GST_STATE_CODES.find((s) => s.state === state)?.code;
}
