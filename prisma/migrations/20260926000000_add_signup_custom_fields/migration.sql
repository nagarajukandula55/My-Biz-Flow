-- Additive only: three new nullable-by-default JSON columns, no drops/alters
-- of existing columns, no renames, no data touched on existing rows.
--
-- 1. PartnerType.customSignupFields: array of Super-Admin-configured extra
--    signup field defs for that business type ([] for every existing row).
-- 2. Partner.customFieldValues: values collected for those fields at signup
--    ({} for every existing row).
-- 3. PartnerSignupRequest.customFieldValues: same values, held pending
--    approval for types with requiresApproval=true, carried onto the
--    Partner row by createPartnerFromRequest() when approved.

ALTER TABLE "partner_types" ADD COLUMN "customSignupFields" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "partners" ADD COLUMN "customFieldValues" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "partner_signup_requests" ADD COLUMN "customFieldValues" JSONB NOT NULL DEFAULT '{}';
