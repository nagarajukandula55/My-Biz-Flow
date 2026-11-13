ALTER TABLE "providers"
  ADD COLUMN "aadhaarNumber" TEXT,
  ADD COLUMN "aadhaarFrontDriveFileId" TEXT,
  ADD COLUMN "aadhaarBackDriveFileId" TEXT,
  ADD COLUMN "selfieDriveFileId" TEXT,
  ADD COLUMN "identitySubmittedAt" TIMESTAMP(3);
