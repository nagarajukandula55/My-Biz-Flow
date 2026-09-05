-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_razorpayPaymentId_key" ON "subscription_payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "subscription_payments_vendorId_idx" ON "subscription_payments"("vendorId");
