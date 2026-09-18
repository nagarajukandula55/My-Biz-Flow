-- A public Book Appointment inquiry no partner's Service Area could match
-- — not partner-scoped, so it can't live in BusinessRecord. Super Admin's
-- queue for manually routing these. Same migration name as the identical
-- one in My-Biz-Flow-Admin — both point at the same physical database.
CREATE TABLE "unassigned_inquiries" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "addressLine" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unassigned_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "unassigned_inquiries_resolvedAt_idx" ON "unassigned_inquiries"("resolvedAt");
