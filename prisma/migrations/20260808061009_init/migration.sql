-- CreateTable
CREATE TABLE "page_customizations" (
    "pageId" TEXT NOT NULL,
    "fieldOverrides" JSONB NOT NULL DEFAULT '{}',
    "addedFields" JSONB NOT NULL DEFAULT '[]',
    "deletedFieldKeys" JSONB NOT NULL DEFAULT '[]',
    "optionOverrides" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_customizations_pkey" PRIMARY KEY ("pageId")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "pageId" TEXT NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("pageId")
);

-- CreateTable
CREATE TABLE "module_appearances" (
    "slug" TEXT NOT NULL,
    "label" TEXT,
    "icon" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_appearances_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "numbering_main_schemes" (
    "documentType" TEXT NOT NULL,
    "scheme" JSONB NOT NULL,

    CONSTRAINT "numbering_main_schemes_pkey" PRIMARY KEY ("documentType")
);

-- CreateTable
CREATE TABLE "numbering_vendor_schemes" (
    "vendorId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "scheme" JSONB NOT NULL,

    CONSTRAINT "numbering_vendor_schemes_pkey" PRIMARY KEY ("vendorId","documentType")
);

-- CreateTable
CREATE TABLE "numbering_counters" (
    "scopeKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "numbering_counters_pkey" PRIMARY KEY ("scopeKey")
);

-- CreateTable
CREATE TABLE "page_access" (
    "pageId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "page_access_pkey" PRIMARY KEY ("pageId")
);

-- CreateTable
CREATE TABLE "error_log_entries" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,

    CONSTRAINT "error_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_log_entries_timestamp_idx" ON "error_log_entries"("timestamp");
