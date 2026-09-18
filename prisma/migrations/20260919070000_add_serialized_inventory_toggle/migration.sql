-- "Serialized Inventory" toggle on /partner/<id>/settings — was a demo
-- stub with no backing state; gates whether deductInventoryForWorkorderAction
-- validates/deducts stock at all. Defaults to false so every existing
-- partner keeps today's behavior of NOT blocking on stock (only relevant
-- for the brief window in which this fail-closed check was unconditional).
ALTER TABLE "partners" ADD COLUMN "serializedInventoryEnabled" BOOLEAN NOT NULL DEFAULT false;
