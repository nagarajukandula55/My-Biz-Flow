ALTER TABLE "providers" ADD COLUMN "providerCode" TEXT;
ALTER TABLE "customers" ADD COLUMN "customerCode" TEXT;

WITH numbered AS (
  SELECT id, 'SP' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", id)::TEXT, 4, '0') AS code
  FROM "providers"
)
UPDATE "providers" p SET "providerCode" = n.code FROM numbered n WHERE p.id = n.id;

WITH numbered AS (
  SELECT id, 'SS' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", id)::TEXT, 4, '0') AS code
  FROM "customers"
)
UPDATE "customers" c SET "customerCode" = n.code FROM numbered n WHERE c.id = n.id;

ALTER TABLE "providers" ALTER COLUMN "providerCode" SET NOT NULL;
ALTER TABLE "customers" ALTER COLUMN "customerCode" SET NOT NULL;
CREATE UNIQUE INDEX "providers_providerCode_key" ON "providers"("providerCode");
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");
