-- Settings' "Show logo on printed documents" toggle (Partner.showLogoOnDocuments).
-- Defaults to true so existing partners who already uploaded a logo keep
-- seeing it print, unchanged from before this column existed.
ALTER TABLE "partners" ADD COLUMN "showLogoOnDocuments" BOOLEAN NOT NULL DEFAULT true;
