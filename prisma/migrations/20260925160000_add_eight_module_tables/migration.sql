-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_lines" (
    "id" TEXT NOT NULL,
    "bomId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialLabel" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" INTEGER NOT NULL,

    CONSTRAINT "bom_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_centers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "work_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_orders" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bomId" TEXT,
    "productName" TEXT NOT NULL,
    "quantityPlanned" INTEGER NOT NULL,
    "quantityProduced" INTEGER NOT NULL DEFAULT 0,
    "workCenterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_stage_history" (
    "id" TEXT NOT NULL,
    "productionOrderId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "production_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_customers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "gstin" TEXT,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "creditTermDays" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_tiers" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_orders" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "priceTierId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wholesale_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "materialLabel" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" INTEGER NOT NULL,

    CONSTRAINT "wholesale_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_bookings" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "venueId" TEXT,
    "eventName" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'OneTime',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resources" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "event_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_resource_allocations" (
    "id" TEXT NOT NULL,
    "eventBookingId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "event_resource_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_clients" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_matters" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "matterNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "matterType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "openedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedDate" TIMESTAMP(3),

    CONSTRAINT "legal_matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_court_dates" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "hearingDate" TIMESTAMP(3) NOT NULL,
    "court" TEXT,
    "purpose" TEXT,
    "outcome" TEXT,

    CONSTRAINT "legal_court_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationWeeks" INTEGER,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "capacity" INTEGER,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "guardianName" TEXT,
    "guardianContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Active',

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_installments" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmount" INTEGER,

    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_attendance" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "class_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "reportingManagerId" TEXT,
    "joiningDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_check_ins" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "checkInLat" DOUBLE PRECISION,
    "checkInLng" DOUBLE PRECISION,
    "checkOutLat" DOUBLE PRECISION,
    "checkOutLng" DOUBLE PRECISION,
    "checkInPhotoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "notes" TEXT,

    CONSTRAINT "attendance_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_locations" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 200,

    CONSTRAINT "office_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "totalDays" INTEGER NOT NULL DEFAULT 0,
    "usedDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicPay" INTEGER NOT NULL,
    "allowances" INTEGER NOT NULL DEFAULT 0,
    "deductions" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Draft',

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_vendors" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "parentAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "narration" TEXT,
    "sourceType" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_of_materials_partnerId_idx" ON "bill_of_materials"("partnerId");

-- CreateIndex
CREATE INDEX "bom_lines_bomId_idx" ON "bom_lines"("bomId");

-- CreateIndex
CREATE INDEX "work_centers_partnerId_idx" ON "work_centers"("partnerId");

-- CreateIndex
CREATE INDEX "production_orders_partnerId_idx" ON "production_orders"("partnerId");

-- CreateIndex
CREATE INDEX "production_orders_bomId_idx" ON "production_orders"("bomId");

-- CreateIndex
CREATE INDEX "production_orders_workCenterId_idx" ON "production_orders"("workCenterId");

-- CreateIndex
CREATE INDEX "production_stage_history_productionOrderId_idx" ON "production_stage_history"("productionOrderId");

-- CreateIndex
CREATE INDEX "wholesale_customers_partnerId_idx" ON "wholesale_customers"("partnerId");

-- CreateIndex
CREATE INDEX "price_tiers_partnerId_idx" ON "price_tiers"("partnerId");

-- CreateIndex
CREATE INDEX "wholesale_orders_partnerId_idx" ON "wholesale_orders"("partnerId");

-- CreateIndex
CREATE INDEX "wholesale_orders_customerId_idx" ON "wholesale_orders"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "wholesale_orders_partnerId_orderNumber_key" ON "wholesale_orders"("partnerId", "orderNumber");

-- CreateIndex
CREATE INDEX "wholesale_order_lines_orderId_idx" ON "wholesale_order_lines"("orderId");

-- CreateIndex
CREATE INDEX "venues_partnerId_idx" ON "venues"("partnerId");

-- CreateIndex
CREATE INDEX "event_bookings_partnerId_idx" ON "event_bookings"("partnerId");

-- CreateIndex
CREATE INDEX "event_bookings_venueId_idx" ON "event_bookings"("venueId");

-- CreateIndex
CREATE INDEX "event_resources_partnerId_idx" ON "event_resources"("partnerId");

-- CreateIndex
CREATE INDEX "event_resource_allocations_eventBookingId_idx" ON "event_resource_allocations"("eventBookingId");

-- CreateIndex
CREATE INDEX "event_resource_allocations_resourceId_idx" ON "event_resource_allocations"("resourceId");

-- CreateIndex
CREATE INDEX "legal_clients_partnerId_idx" ON "legal_clients"("partnerId");

-- CreateIndex
CREATE INDEX "legal_matters_partnerId_idx" ON "legal_matters"("partnerId");

-- CreateIndex
CREATE INDEX "legal_matters_clientId_idx" ON "legal_matters"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "legal_matters_partnerId_matterNumber_key" ON "legal_matters"("partnerId", "matterNumber");

-- CreateIndex
CREATE INDEX "legal_court_dates_matterId_idx" ON "legal_court_dates"("matterId");

-- CreateIndex
CREATE INDEX "legal_documents_matterId_idx" ON "legal_documents"("matterId");

-- CreateIndex
CREATE INDEX "courses_partnerId_idx" ON "courses"("partnerId");

-- CreateIndex
CREATE INDEX "batches_partnerId_idx" ON "batches"("partnerId");

-- CreateIndex
CREATE INDEX "batches_courseId_idx" ON "batches"("courseId");

-- CreateIndex
CREATE INDEX "students_partnerId_idx" ON "students"("partnerId");

-- CreateIndex
CREATE INDEX "enrollments_studentId_idx" ON "enrollments"("studentId");

-- CreateIndex
CREATE INDEX "enrollments_batchId_idx" ON "enrollments"("batchId");

-- CreateIndex
CREATE INDEX "fee_installments_enrollmentId_idx" ON "fee_installments"("enrollmentId");

-- CreateIndex
CREATE INDEX "class_attendance_batchId_idx" ON "class_attendance"("batchId");

-- CreateIndex
CREATE INDEX "class_attendance_studentId_idx" ON "class_attendance"("studentId");

-- CreateIndex
CREATE INDEX "employees_partnerId_idx" ON "employees"("partnerId");

-- CreateIndex
CREATE INDEX "employees_reportingManagerId_idx" ON "employees"("reportingManagerId");

-- CreateIndex
CREATE INDEX "attendance_check_ins_employeeId_idx" ON "attendance_check_ins"("employeeId");

-- CreateIndex
CREATE INDEX "attendance_check_ins_employeeId_checkInAt_idx" ON "attendance_check_ins"("employeeId", "checkInAt");

-- CreateIndex
CREATE INDEX "office_locations_partnerId_idx" ON "office_locations"("partnerId");

-- CreateIndex
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");

-- CreateIndex
CREATE INDEX "leave_balances_employeeId_idx" ON "leave_balances"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeId_leaveType_key" ON "leave_balances"("employeeId", "leaveType");

-- CreateIndex
CREATE INDEX "payslips_employeeId_idx" ON "payslips"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employeeId_month_year_key" ON "payslips"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_vendors_partnerId_key" ON "marketplace_vendors"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_vendors_partnerId_idx" ON "marketplace_vendors"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_listings_partnerId_idx" ON "marketplace_listings"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_orders_partnerId_idx" ON "marketplace_orders"("partnerId");

-- CreateIndex
CREATE INDEX "marketplace_orders_listingId_idx" ON "marketplace_orders"("listingId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_partnerId_idx" ON "chart_of_accounts"("partnerId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentAccountId_idx" ON "chart_of_accounts"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_partnerId_accountCode_key" ON "chart_of_accounts"("partnerId", "accountCode");

-- CreateIndex
CREATE INDEX "journal_entries_partnerId_idx" ON "journal_entries"("partnerId");

-- CreateIndex
CREATE INDEX "journal_entries_partnerId_entryDate_idx" ON "journal_entries"("partnerId", "entryDate");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_partnerId_entryNumber_key" ON "journal_entries"("partnerId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_lines_journalEntryId_idx" ON "journal_lines"("journalEntryId");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "fiscal_periods_partnerId_idx" ON "fiscal_periods"("partnerId");

-- AddForeignKey
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "bill_of_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_workCenterId_fkey" FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_stage_history" ADD CONSTRAINT "production_stage_history_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_orders" ADD CONSTRAINT "wholesale_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "wholesale_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_orders" ADD CONSTRAINT "wholesale_orders_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "price_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_order_lines" ADD CONSTRAINT "wholesale_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "wholesale_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resource_allocations" ADD CONSTRAINT "event_resource_allocations_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_resource_allocations" ADD CONSTRAINT "event_resource_allocations_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "event_resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_matters" ADD CONSTRAINT "legal_matters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "legal_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_court_dates" ADD CONSTRAINT "legal_court_dates_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "legal_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "legal_matters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_check_ins" ADD CONSTRAINT "attendance_check_ins_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

