/**
 * One-off: creates the canonical Field Force operator Partner account —
 * the account providers self-signup under and customers book through
 * (see /solutions/field-force, /downloads). Field Force is a free-to-join
 * marketplace with no subscription (see activateFieldForce.ts), so this
 * is the ONE operator account, not a per-business signup.
 *
 * Phone number is read from an env var at run time — never hardcoded here
 * or written to any file, so it never lands in git history or anywhere
 * public. Business address is a placeholder (no real registered address
 * exists anywhere in this codebase to use) — update it for real from
 * Settings once you have one.
 *
 * Run once: FF_OPERATOR_PHONE=<real phone> npx tsx scripts/createFieldForceOperator.ts
 */
import { createPartner } from "../src/lib/partnerData";
import { SUPPORT_EMAIL } from "../src/lib/seo";

async function main() {
  const phone = process.env.FF_OPERATOR_PHONE;
  if (!phone) {
    console.error("Set FF_OPERATOR_PHONE to the real phone number to use, then re-run.");
    process.exit(1);
  }

  const result = await createPartner({
    partnerTypeId: "field-force",
    businessName: "My Biz Flow Field Force",
    addressLine: "TO BE UPDATED — set the real registered address from Settings",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    gstin: "",
    businessEmail: SUPPORT_EMAIL,
    businessContact: phone,
    loginContact: phone,
  });

  console.log(`Created Field Force operator account: ${result.partner.id}`);
  console.log("Password was generated and hashed — use /login's forced first-time password flow, or /forgot-password.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
