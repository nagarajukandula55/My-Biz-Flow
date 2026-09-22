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

/**
 * Aliases for state/UT names as they actually appear in postal_pincodes
 * (ALL CAPS, abbreviated forms, a couple of misspellings/typos) or in
 * India Post's live API fallback — keyed by UPPERCASE(trim(raw)), valued
 * with the exact INDIAN_STATES spelling. Confirmed by inspecting every
 * distinct value in postal_pincodes: without this, a pincode lookup's
 * State <select> (a fixed INDIAN_STATES option list — see RecordForm.tsx
 * and PincodeLookupFields.tsx) never matches, so it silently shows no
 * selection even though the value was technically written — this is why
 * City (whose options list is built FROM the lookup response, so it can
 * never mismatch itself) appeared to work while State didn't.
 */
const STATE_NAME_ALIASES: Record<string, string> = {
  "ANDAMAN & NICOBAR ISLANDS": "Andaman and Nicobar Islands",
  "CHATTISGARH": "Chhattisgarh", // common misspelling in source data (missing an "h")
  "DADRA & NAGAR HAVELI": "Dadra and Nagar Haveli and Daman and Diu",
  "DAMAN & DIU": "Dadra and Nagar Haveli and Daman and Diu",
  "JAMMU & KASHMIR": "Jammu and Kashmir",
  "PONDICHERRY": "Puducherry", // old name, still used by some data sources
  "ORISSA": "Odisha", // old name
};

/**
 * Resolves a raw state string (from postal_pincodes or India Post's live
 * API) to the exact INDIAN_STATES spelling a State <select> needs to
 * actually show a selection. Returns null for anything unrecognized
 * (e.g. postal_pincodes' handful of bad rows with a district name or the
 * literal string "NULL" sitting in the state column) rather than writing
 * a garbage value into the form — the field is left for the user to pick
 * manually instead of silently holding an unmatched, unvalidated string.
 */
export function normalizeIndianStateName(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  const upper = value.toUpperCase();
  if (STATE_NAME_ALIASES[upper]) return STATE_NAME_ALIASES[upper];

  const canonicalMatch = INDIAN_STATES.find((s) => s.toUpperCase() === upper);
  if (canonicalMatch) return canonicalMatch;

  return null;
}

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

/**
 * Curated district sample set, NOT an exhaustive census list — enough to
 * exercise the Field Force serviceable-area picker's state → district
 * cascade for the states most likely used in demos/early rollout. A state
 * with no entry here still works in the picker: the UI falls back to a
 * free-text district field instead of a dropdown (see EngineerOnboardForm).
 */
export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Karnataka: ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Mangaluru (Dakshina Kannada)", "Hubballi-Dharwad", "Belagavi", "Kalaburagi"],
  Maharashtra: ["Mumbai City", "Mumbai Suburban", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
  Telangana: ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal Urban", "Nizamabad"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada (NTR)", "Guntur", "Krishna", "Chittoor"],
  Delhi: ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
  "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Ghaziabad", "Noida (Gautam Buddh Nagar)", "Varanasi", "Agra"],
  "West Bengal": ["Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Kerala: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur"],
};

export function districtsForState(state: string): string[] {
  return DISTRICTS_BY_STATE[state] ?? [];
}
