CREATE TABLE "partner_integration_connections" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_configured',
    "encryptedSecret" TEXT,
    "displayMetadata" JSONB NOT NULL DEFAULT '{}',
    "lastTestedAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "partner_integration_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_integration_connections_partnerId_integrationId_key" ON "partner_integration_connections"("partnerId", "integrationId");
CREATE INDEX "partner_integration_connections_partnerId_status_idx" ON "partner_integration_connections"("partnerId", "status");
