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
CREATE TABLE "numbering_partner_schemes" (
    "partnerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "scheme" JSONB NOT NULL,

    CONSTRAINT "numbering_partner_schemes_pkey" PRIMARY KEY ("partnerId","documentType")
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

-- CreateTable
CREATE TABLE "access_groups" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "pagePermissions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "accessGroupIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_types" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "defaultModules" JSONB NOT NULL DEFAULT '[]',
    "assignableRoleIds" JSONB NOT NULL DEFAULT '[]',
    "planTierByPage" JSONB NOT NULL DEFAULT '{}',
    "planIds" JSONB NOT NULL DEFAULT '[]',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "internalKey" TEXT NOT NULL,
    "businessId" TEXT NOT NULL DEFAULT 'BIZ002',
    "partnerTypeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "gstin" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessContact" TEXT NOT NULL,
    "loginContact" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'Trial',
    "trialStartAt" TIMESTAMP(3),
    "trialEndAt" TIMESTAMP(3),
    "billingCycle" TEXT,
    "planId" TEXT,
    "offerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "planIds" JSONB NOT NULL DEFAULT '[]',
    "billingCycles" JSONB NOT NULL DEFAULT '[]',
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "includedModuleSlugs" JSONB NOT NULL DEFAULT '[]',
    "maxUsers" INTEGER NOT NULL,
    "maxLocations" INTEGER NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_records" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "recordKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_signup_requests" (
    "id" TEXT NOT NULL,
    "partnerTypeId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "gstin" TEXT,
    "businessEmail" TEXT NOT NULL,
    "businessContact" TEXT NOT NULL,
    "loginContact" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_signup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_access_keys" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "module_access_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engineers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineer_services" (
    "id" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "engineer_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engineer_service_areas" (
    "id" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "locality" TEXT,
    "pincode" TEXT,

    CONSTRAINT "engineer_service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_allocations" (
    "id" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "jobRef" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feeAmount" INTEGER,
    "feeStatus" TEXT,

    CONSTRAINT "job_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_log_entries_timestamp_idx" ON "error_log_entries"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "partners_internalKey_key" ON "partners"("internalKey");

-- CreateIndex
CREATE UNIQUE INDEX "partners_loginContact_key" ON "partners"("loginContact");

-- CreateIndex
CREATE INDEX "business_records_partnerId_moduleSlug_idx" ON "business_records"("partnerId", "moduleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "business_records_partnerId_moduleSlug_recordKey_key" ON "business_records"("partnerId", "moduleSlug", "recordKey");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_razorpayPaymentId_key" ON "subscription_payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "subscription_payments_partnerId_idx" ON "subscription_payments"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "module_access_keys_key_key" ON "module_access_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "module_access_keys_partnerId_moduleSlug_key" ON "module_access_keys"("partnerId", "moduleSlug");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "engineer_services_engineerId_serviceId_key" ON "engineer_services"("engineerId", "serviceId");

-- CreateIndex
CREATE INDEX "engineer_service_areas_engineerId_idx" ON "engineer_service_areas"("engineerId");

-- CreateIndex
CREATE INDEX "job_allocations_partnerId_idx" ON "job_allocations"("partnerId");

-- CreateIndex
CREATE INDEX "job_allocations_engineerId_idx" ON "job_allocations"("engineerId");

-- AddForeignKey
ALTER TABLE "engineer_services" ADD CONSTRAINT "engineer_services_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "engineers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineer_services" ADD CONSTRAINT "engineer_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engineer_service_areas" ADD CONSTRAINT "engineer_service_areas_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "engineers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_allocations" ADD CONSTRAINT "job_allocations_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "engineers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

