-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'GST',
    "contact" TEXT,
    "customerGstin" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "roundOff" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "amountDue" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Draft',
    "paymentMode" TEXT,
    "invoiceSource" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "contact" TEXT,
    "amount" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'Credit Note',
    "contact" TEXT,
    "invoiceId" TEXT,
    "reason" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "contact" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_challans" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "contact" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "vehicleNumber" TEXT,
    "dispatchAddress" TEXT,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_challans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proforma_invoices" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "proformaNumber" TEXT NOT NULL,
    "contact" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proforma_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "vendorName" TEXT,
    "paymentMode" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceNumber" TEXT,
    "taxAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoice_schedules" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "lastGeneratedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_invoice_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "modulesEnabled" TEXT,
    "mappedWarehouseId" TEXT,
    "monthlyRevenue" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Onboarding',
    "openedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "insuranceProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctor" TEXT NOT NULL,
    "appointmentDateTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "diagnosis" TEXT,
    "consultationFee" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amc_contracts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "contractEndDate" TIMESTAMP(3) NOT NULL,
    "renewalTermMonths" INTEGER NOT NULL DEFAULT 12,
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "contractValue" INTEGER NOT NULL DEFAULT 0,
    "contractStatus" TEXT NOT NULL DEFAULT 'Active',
    "renewedFromId" TEXT,
    "renewedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amc_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_visits" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "serviceRequestRaisedAt" TIMESTAMP(3),
    "technicianId" TEXT,
    "technicianName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "checkInLatitude" DOUBLE PRECISION,
    "checkInLongitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_orders" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "waiter" TEXT,
    "lines" JSONB NOT NULL DEFAULT '[]',
    "covers" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "orderTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kotSentAt" TIMESTAMP(3),
    "billedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "invoiceIds" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "restaurant_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'Monthly',
    "planAmount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscribers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "planId" TEXT,
    "memberName" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL DEFAULT 'Monthly',
    "planAmount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "frozenAt" TIMESTAMP(3),
    "resumeDate" TIMESTAMP(3),
    "checkIns" JSONB NOT NULL DEFAULT '[]',
    "invoiceIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "price" INTEGER NOT NULL DEFAULT 0,
    "areaSqft" INTEGER,
    "bedrooms" INTEGER,
    "listingStatus" TEXT NOT NULL DEFAULT 'Available',
    "agentName" TEXT,
    "siteVisitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'New',
    "agentName" TEXT,
    "siteVisitStart" TIMESTAMP(3),
    "siteVisitEnd" TIMESTAMP(3),
    "dealValue" INTEGER,
    "commissionPct" INTEGER,
    "commissionAmount" INTEGER,
    "closedLostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_assets" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rental_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_agreements" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "assetId" TEXT,
    "assetName" TEXT NOT NULL,
    "renter" TEXT NOT NULL,
    "bookingStart" TIMESTAMP(3) NOT NULL,
    "bookingEnd" TIMESTAMP(3) NOT NULL,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "rentalAmount" INTEGER NOT NULL DEFAULT 0,
    "damageCharge" INTEGER,
    "refundableAmount" INTEGER,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "returnNotes" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "driverName" TEXT,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "deliveryEta" TIMESTAMP(3),
    "deliveryStage" TEXT NOT NULL DEFAULT 'Pending',
    "assignedAt" TIMESTAMP(3),
    "pendingAt" TIMESTAMP(3),
    "outForDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "recipientName" TEXT,
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_services" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "salon_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_appointments" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "serviceId" TEXT,
    "serviceName" TEXT NOT NULL,
    "stylist" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Booked',
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "branch" TEXT,
    "commissionPercent" INTEGER,
    "commissionAmount" INTEGER,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salon_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_members" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePointsEarned" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'Bronze',
    "lastRedemption" TIMESTAMP(3),
    "cashbackEarned" INTEGER NOT NULL DEFAULT 0,
    "enrolledModule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_ledger_entries" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "amount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoices_partnerId_idx" ON "invoices"("partnerId");

-- CreateIndex
CREATE INDEX "invoices_partnerId_issueDate_idx" ON "invoices"("partnerId", "issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_partnerId_invoiceNumber_key" ON "invoices"("partnerId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "payments_partnerId_idx" ON "payments"("partnerId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_notes_partnerId_idx" ON "credit_notes"("partnerId");

-- CreateIndex
CREATE INDEX "credit_notes_invoiceId_idx" ON "credit_notes"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_partnerId_noteNumber_key" ON "credit_notes"("partnerId", "noteNumber");

-- CreateIndex
CREATE INDEX "quotations_partnerId_idx" ON "quotations"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_partnerId_quotationNumber_key" ON "quotations"("partnerId", "quotationNumber");

-- CreateIndex
CREATE INDEX "delivery_challans_partnerId_idx" ON "delivery_challans"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_challans_partnerId_challanNumber_key" ON "delivery_challans"("partnerId", "challanNumber");

-- CreateIndex
CREATE INDEX "proforma_invoices_partnerId_idx" ON "proforma_invoices"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "proforma_invoices_partnerId_proformaNumber_key" ON "proforma_invoices"("partnerId", "proformaNumber");

-- CreateIndex
CREATE INDEX "expenses_partnerId_idx" ON "expenses"("partnerId");

-- CreateIndex
CREATE INDEX "expenses_partnerId_expenseDate_idx" ON "expenses"("partnerId", "expenseDate");

-- CreateIndex
CREATE INDEX "recurring_invoice_schedules_partnerId_idx" ON "recurring_invoice_schedules"("partnerId");

-- CreateIndex
CREATE INDEX "brands_partnerId_idx" ON "brands"("partnerId");

-- CreateIndex
CREATE INDEX "locations_brandId_idx" ON "locations"("brandId");

-- CreateIndex
CREATE INDEX "locations_partnerId_idx" ON "locations"("partnerId");

-- CreateIndex
CREATE INDEX "patients_partnerId_idx" ON "patients"("partnerId");

-- CreateIndex
CREATE INDEX "appointments_partnerId_idx" ON "appointments"("partnerId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_appointmentId_idx" ON "prescriptions"("appointmentId");

-- CreateIndex
CREATE INDEX "amc_contracts_partnerId_idx" ON "amc_contracts"("partnerId");

-- CreateIndex
CREATE INDEX "service_visits_contractId_idx" ON "service_visits"("contractId");

-- CreateIndex
CREATE INDEX "service_visits_partnerId_idx" ON "service_visits"("partnerId");

-- CreateIndex
CREATE INDEX "restaurant_tables_partnerId_idx" ON "restaurant_tables"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_partnerId_tableNumber_key" ON "restaurant_tables"("partnerId", "tableNumber");

-- CreateIndex
CREATE INDEX "restaurant_orders_partnerId_idx" ON "restaurant_orders"("partnerId");

-- CreateIndex
CREATE INDEX "restaurant_orders_partnerId_status_idx" ON "restaurant_orders"("partnerId", "status");

-- CreateIndex
CREATE INDEX "subscription_plans_partnerId_idx" ON "subscription_plans"("partnerId");

-- CreateIndex
CREATE INDEX "subscribers_partnerId_idx" ON "subscribers"("partnerId");

-- CreateIndex
CREATE INDEX "subscribers_planId_idx" ON "subscribers"("planId");

-- CreateIndex
CREATE INDEX "properties_partnerId_idx" ON "properties"("partnerId");

-- CreateIndex
CREATE INDEX "enquiries_partnerId_idx" ON "enquiries"("partnerId");

-- CreateIndex
CREATE INDEX "enquiries_propertyId_idx" ON "enquiries"("propertyId");

-- CreateIndex
CREATE INDEX "rental_assets_partnerId_idx" ON "rental_assets"("partnerId");

-- CreateIndex
CREATE INDEX "rental_agreements_partnerId_idx" ON "rental_agreements"("partnerId");

-- CreateIndex
CREATE INDEX "rental_agreements_assetId_idx" ON "rental_agreements"("assetId");

-- CreateIndex
CREATE INDEX "vehicles_partnerId_idx" ON "vehicles"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_partnerId_vehicleNumber_key" ON "vehicles"("partnerId", "vehicleNumber");

-- CreateIndex
CREATE INDEX "drivers_partnerId_idx" ON "drivers"("partnerId");

-- CreateIndex
CREATE INDEX "trips_partnerId_idx" ON "trips"("partnerId");

-- CreateIndex
CREATE INDEX "trips_vehicleId_idx" ON "trips"("vehicleId");

-- CreateIndex
CREATE INDEX "trips_driverId_idx" ON "trips"("driverId");

-- CreateIndex
CREATE INDEX "salon_services_partnerId_idx" ON "salon_services"("partnerId");

-- CreateIndex
CREATE INDEX "salon_appointments_partnerId_idx" ON "salon_appointments"("partnerId");

-- CreateIndex
CREATE INDEX "salon_appointments_serviceId_idx" ON "salon_appointments"("serviceId");

-- CreateIndex
CREATE INDEX "loyalty_members_partnerId_idx" ON "loyalty_members"("partnerId");

-- CreateIndex
CREATE INDEX "points_ledger_entries_memberId_idx" ON "points_ledger_entries"("memberId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visits" ADD CONSTRAINT "service_visits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "amc_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_agreements" ADD CONSTRAINT "rental_agreements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "rental_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_appointments" ADD CONSTRAINT "salon_appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "salon_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_ledger_entries" ADD CONSTRAINT "points_ledger_entries_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "loyalty_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

