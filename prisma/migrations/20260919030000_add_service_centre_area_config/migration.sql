-- Which Service Types (Onsite/Walk-in) and pincodes a partner covers for
-- Service Centre inquiries/appointments — drives the public Book
-- Appointment form's auto-assignment.
ALTER TABLE "partners" ADD COLUMN "serviceCentreServiceTypes" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "partners" ADD COLUMN "serviceCentrePincodes" JSONB NOT NULL DEFAULT '[]';
