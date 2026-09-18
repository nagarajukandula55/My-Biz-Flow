/**
 * The Workorder fields required at intake — shared between
 * serviceCentreCreateAction.ts's validation and inquiries/actions.ts's
 * convert-to-workorder flow (which needs the list itself, not just a
 * combined error string, to prompt for exactly what's missing). Kept out
 * of serviceCentreCreateAction.ts because that file is "use server" and
 * every export from a "use server" file must be an async function — a
 * plain const array isn't allowed there (Next.js build error).
 */
export const SERVICE_CENTRE_REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "customerPhone", label: "Contact No" },
  { key: "customer", label: "Customer Name" },
  { key: "faultDescription", label: "Fault in Device" },
  { key: "customerAddress", label: "Address" },
  { key: "customerCity", label: "City" },
  { key: "customerState", label: "State" },
  { key: "customerPincode", label: "Pincode" },
];
