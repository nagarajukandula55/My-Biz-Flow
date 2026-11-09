ALTER TABLE "bookings" ADD COLUMN "enRouteAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "arrivedAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "inProgressAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN "currentLatitude" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN "currentLongitude" DOUBLE PRECISION;
ALTER TABLE "bookings" ADD COLUMN "currentLocationAt" TIMESTAMP(3);
