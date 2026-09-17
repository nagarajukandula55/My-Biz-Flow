-- Admin-editable overrides for transactional email copy. No row for a key
-- means the hardcoded default* fields in emailTemplateDefs.ts are used.
CREATE TABLE "email_templates" (
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "footNote" TEXT,
    "bodyFormat" TEXT NOT NULL DEFAULT 'text',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("key")
);
