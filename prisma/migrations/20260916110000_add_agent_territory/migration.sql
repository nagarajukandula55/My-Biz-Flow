-- Telecalling agent territory gate: which states/cities a Telecaller may
-- see and be auto-assigned leads for. Empty array (the default) means no
-- restriction, so every existing agent keeps seeing everything unchanged.
ALTER TABLE "partner_staff" ADD COLUMN "assignedStates" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "partner_staff" ADD COLUMN "assignedCities" JSONB NOT NULL DEFAULT '[]';
