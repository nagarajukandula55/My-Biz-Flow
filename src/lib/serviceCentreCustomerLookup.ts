"use server";

/**
 * Returning-customer lookup for the Service Centre intake form.
 *
 * AN-CRM's equivalent screen types a phone number and prefills the whole
 * customer block from its own Customer collection (captureCustomer()
 * upserts one on every job sheet create). My Biz Flow has no standalone
 * Customer directory and deliberately isn't growing one in this pass —
 * so this searches the two places a customer's details ALREADY live:
 *
 *  1. the Billing module's Contacts (BusinessRecord "billing-contacts") —
 *     the closest thing to a customer directory this app has, already the
 *     party record invoices/credit notes/payments point at;
 *  2. this partner's own past Service Centre workorders, so a repeat
 *     walk-in prefills even when Billing isn't enabled for them.
 *
 * Billing Contacts win when both match, since that record is maintained
 * deliberately rather than snapshotted at one job's intake.
 *
 * Server Action, called from the create form's client component — same
 * client/server split the signup flow's PincodeLookupFields uses for its
 * pincode → state/city lookup.
 */

import { listBusinessRecords } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

export type ServiceCentreCustomerMatch = {
  customer: string;
  customerEmail: string;
  customerCompany: string;
  customerGstin: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPincode: string;
  /** Where the match came from, for the "prefilled from…" hint on the form. */
  source: "Billing contact" | "Past workorder";
};

/** Last 10 digits, so "+91 98765 43210" and "9876543210" match each other. */
function normalizePhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function str(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/**
 * Bind with .bind(null, partnerId) before passing to the form.
 * Returns null when the phone isn't a full number yet or nothing matches —
 * the form then simply leaves whatever the user typed alone.
 */
export async function lookupServiceCentreCustomerAction(
  partnerId: string,
  phone: string
): Promise<ServiceCentreCustomerMatch | null> {
  const target = normalizePhone(phone);
  if (target.length !== 10) return null;

  await requireSessionPartnerId(partnerId);

  const contacts = await listBusinessRecords(partnerId, "billing-contacts");
  const contact = contacts.find((c) => normalizePhone(c["phone"]) === target);
  if (contact) {
    return {
      customer: str(contact["name"]),
      customerEmail: str(contact["email"]),
      // Billing Contacts have no separate company column — a B2B contact
      // IS the company, so its name doubles as one only when a GSTIN is
      // present. Anything else would be inventing a value.
      customerCompany: contact["gstin"] ? str(contact["name"]) : "",
      customerGstin: str(contact["gstin"]),
      customerAddress: str(contact["billingAddress"]),
      customerCity: str(contact["city"]),
      customerState: str(contact["state"]),
      customerPincode: str(contact["pincode"]),
      source: "Billing contact",
    };
  }

  const workorders = await listBusinessRecords(partnerId, "service-centre");
  // Most recent intake wins — a customer who moved shouldn't be prefilled
  // from their oldest address.
  const prior = workorders
    .filter((w) => normalizePhone(w["customerPhone"]) === target)
    .sort((a, b) => str(b["receivedDate"]).localeCompare(str(a["receivedDate"])))[0];
  if (!prior) return null;

  return {
    customer: str(prior["customer"]),
    customerEmail: str(prior["customerEmail"]),
    customerCompany: str(prior["customerCompany"]),
    customerGstin: str(prior["customerGstin"]),
    customerAddress: str(prior["customerAddress"]),
    customerCity: str(prior["customerCity"]),
    customerState: str(prior["customerState"]),
    customerPincode: str(prior["customerPincode"]),
    source: "Past workorder",
  };
}
