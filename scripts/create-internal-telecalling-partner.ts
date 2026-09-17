/**
 * One-off: creates AN Group's own internal Partner account under the
 * "telecalling" PartnerType (idPrefix "CC" — see
 * scripts/seed-telecalling-partner-type.ts) so the business's own
 * telecalling executives can be onboarded as PartnerStaff agents under it,
 * separate from any customer-facing Service Centre partner. Calls
 * createPartner() directly (bypassing the public /signup form and its
 * requiresApproval gate) since this is our own account, not a customer's —
 * per explicit direction. Prints the generated login password ONCE; it is
 * never stored in plaintext anywhere after this run.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/create-internal-telecalling-partner.ts
 */
import { createPartner } from "../src/lib/partnerData";

async function main() {
  const { partner, password } = await createPartner({
    partnerTypeId: "telecalling",
    businessName: "AN Group",
    addressLine: "1203, Opp: Ice Factory, Bondapalli, Gotlam",
    city: "Vizianagaram",
    state: "Andhra Pradesh",
    pincode: "535003",
    gstin: "37EOZPK9605G1Z5",
    businessEmail: "nraj.k55@gmail.com",
    businessContact: "9000528462",
    loginContact: "9000528462",
  });

  console.log("Partner created:");
  console.log("  Partner ID (login id):", partner.id);
  console.log("  Login contact:", partner.loginContact);
  console.log("  Password (shown once — save it now):", password);
  console.log(`\nLog in at /login with the id above, then go to /partner/${partner.id}/telecalling/agents to onboard executives.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  });
