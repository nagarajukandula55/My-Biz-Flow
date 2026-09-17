-- Add Plan.launchPrice -- AN-CRM's real launch-pricing mechanism
-- (src/core/pricing/plans.ts: launchPriceINR/LAUNCH_PRICING_CUTOVER), ported
-- here since My-Biz-Flow's Plan table only had one flat `price` and was
-- quoting every partner the full standard rate with no introductory tier.
ALTER TABLE "plans" ADD COLUMN "launchPrice" INTEGER;

-- Backfill the real AN-CRM launch prices for the 3 plans this app already
-- has, matched by their existing standard price (each is a unique value):
-- 799 -> Starter-equivalent (349), 1199 -> Pro-equivalent (549),
-- 2499 -> Ultimate-equivalent (999). See src/core/pricing/plans.ts.
UPDATE "plans" SET "launchPrice" = 349 WHERE "price" = 799;
UPDATE "plans" SET "launchPrice" = 549 WHERE "price" = 1199;
UPDATE "plans" SET "launchPrice" = 999 WHERE "price" = 2499;

-- Only "yearly" is offered as a Plan's billing cycle now -- per explicit
-- direction ("billing cycle only yearly no monthly plans at all"). `price`
-- was always really a MONTHLY base rate (computeCyclePrice multiplies it
-- out by 12/24 months for the real Yearly/TwoYearly purchase cycles) --
-- this just corrects the label on any Plan row still saying "monthly".
UPDATE "plans" SET "billingCycle" = 'yearly' WHERE "billingCycle" = 'monthly';
