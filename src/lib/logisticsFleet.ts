/**
 * Data-access layer for the Logistics / Fleet module's Prisma-backed tables
 * (Vehicle, Driver, Trip — see prisma/schema.prisma's "Logistics / Fleet"
 * block, migration 20260925180000). Replaces the previous BusinessRecord-
 * backed ("logistics-fleet" moduleSlug) storage — same conversion pattern
 * as src/lib/clinic.ts (tenant-scoped list/get/create/update, redirect-
 * driven server actions in each route's actions.ts).
 *
 * Relationship modeled: Vehicle 1--* Trip, Driver 1--* Trip. A Trip
 * optionally references a Vehicle and/or a Driver (both nullable FKs on
 * the schema, matching the old BusinessRecord shape where a shipment could
 * be created before a driver/vehicle was assigned). `driverName` stays a
 * denormalized column on Trip (carried over from the old shape) so the
 * delivery lifecycle UI/timeline can show a name even if the Driver row is
 * later deleted or unset.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";
import { withRecordLock } from "@/lib/withRecordLock";
import { DELIVERY_STAGES, type DeliveryStage } from "@/lib/logisticsFleetShared";
export { DELIVERY_STAGES } from "@/lib/logisticsFleetShared";
export type { DeliveryStage } from "@/lib/logisticsFleetShared";

async function readAccess(partnerId: string) { await assertRecordModuleAccess(partnerId, "logistics-fleet"); }
async function writeAccess(partnerId: string) { await readAccess(partnerId); await assertPartnerCanWrite(partnerId); }

const STAGE_TIMESTAMP_FIELD: Record<DeliveryStage, "pendingAt" | "outForDeliveryAt" | "deliveredAt" | "failedAt"> = {
  Pending: "pendingAt",
  "Out for Delivery": "outForDeliveryAt",
  Delivered: "deliveredAt",
  Failed: "failedAt",
};

// --- Vehicles ---------------------------------------------------------------

export async function listVehicles(partnerId: string) {
  await readAccess(partnerId);
  return prisma.vehicle.findMany({ where: { partnerId }, orderBy: { vehicleNumber: "asc" } });
}

export async function getVehicle(partnerId: string, id: string) {
  await readAccess(partnerId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: { trips: { orderBy: { createdAt: "desc" } } } });
  if (!vehicle || vehicle.partnerId !== partnerId) return null;
  return vehicle;
}

export async function createVehicle(partnerId: string, data: { vehicleNumber: string; isActive?: boolean }) {
  await writeAccess(partnerId);
  if (!data.vehicleNumber.trim()) throw new Error("Vehicle number is required.");
  return prisma.vehicle.create({
    data: { partnerId, vehicleNumber: data.vehicleNumber, isActive: data.isActive ?? true },
  });
}

export async function updateVehicle(partnerId: string, id: string, data: { vehicleNumber: string; isActive?: boolean }) {
  await writeAccess(partnerId);
  if (!data.vehicleNumber.trim()) throw new Error("Vehicle number is required.");
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Vehicle not found.");
  return prisma.vehicle.update({
    where: { id },
    data: { vehicleNumber: data.vehicleNumber, isActive: data.isActive ?? existing.isActive },
  });
}

// --- Drivers ------------------------------------------------------------------

export async function listDrivers(partnerId: string) {
  await readAccess(partnerId);
  return prisma.driver.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getDriver(partnerId: string, id: string) {
  await readAccess(partnerId);
  const driver = await prisma.driver.findUnique({ where: { id }, include: { trips: { orderBy: { createdAt: "desc" } } } });
  if (!driver || driver.partnerId !== partnerId) return null;
  return driver;
}

export async function createDriver(partnerId: string, data: { name: string; phone?: string; isActive?: boolean }) {
  await writeAccess(partnerId);
  if (!data.name.trim()) throw new Error("Driver name is required.");
  return prisma.driver.create({
    data: { partnerId, name: data.name, phone: data.phone || null, isActive: data.isActive ?? true },
  });
}

export async function updateDriver(partnerId: string, id: string, data: { name: string; phone?: string; isActive?: boolean }) {
  await writeAccess(partnerId);
  if (!data.name.trim()) throw new Error("Driver name is required.");
  const existing = await prisma.driver.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Driver not found.");
  return prisma.driver.update({
    where: { id },
    data: { name: data.name, phone: data.phone || null, isActive: data.isActive ?? existing.isActive },
  });
}

// --- Trips ----------------------------------------------------------------

export async function listTrips(partnerId: string) {
  await readAccess(partnerId);
  return prisma.trip.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { vehicle: true, driver: true },
  });
}

export async function getTrip(partnerId: string, id: string) {
  await readAccess(partnerId);
  const trip = await prisma.trip.findUnique({ where: { id }, include: { vehicle: true, driver: true } });
  if (!trip || trip.partnerId !== partnerId) return null;
  return trip;
}

export type CreateTripInput = {
  vehicleId?: string;
  driverId?: string;
  origin: string;
  destination: string;
  currentLatitude?: number;
  currentLongitude?: number;
  deliveryEta?: Date;
};

function validateTrip(input: CreateTripInput) {
  if (!input.origin.trim() || !input.destination.trim()) throw new Error("Origin and destination are required.");
  if (input.currentLatitude != null && (!Number.isFinite(input.currentLatitude) || Math.abs(input.currentLatitude) > 90)) throw new Error("Invalid latitude.");
  if (input.currentLongitude != null && (!Number.isFinite(input.currentLongitude) || Math.abs(input.currentLongitude) > 180)) throw new Error("Invalid longitude.");
  if (input.deliveryEta && !Number.isFinite(input.deliveryEta.getTime())) throw new Error("Invalid delivery estimate.");
}

async function validateTripAssignments(partnerId: string, input: Pick<CreateTripInput, "vehicleId" | "driverId">) {
  const [vehicle, driver] = await Promise.all([
    input.vehicleId ? prisma.vehicle.findFirst({ where: { id: input.vehicleId, partnerId, isActive: true } }) : null,
    input.driverId ? prisma.driver.findFirst({ where: { id: input.driverId, partnerId, isActive: true } }) : null,
  ]);
  if (input.vehicleId && !vehicle) throw new Error("Select an active vehicle belonging to this business.");
  if (input.driverId && !driver) throw new Error("Select an active driver belonging to this business.");
  return { vehicle, driver };
}

export async function createTrip(partnerId: string, input: CreateTripInput) {
  await writeAccess(partnerId);
  validateTrip(input);
  const { driver } = await validateTripAssignments(partnerId, input);
  return prisma.trip.create({
    data: {
      partnerId,
      vehicleId: input.vehicleId || null,
      driverId: input.driverId || null,
      driverName: driver?.name ?? null,
      origin: input.origin,
      destination: input.destination,
      currentLatitude: input.currentLatitude ?? null,
      currentLongitude: input.currentLongitude ?? null,
      deliveryEta: input.deliveryEta ?? null,
      deliveryStage: "Pending",
      pendingAt: new Date(),
    },
  });
}

export type UpdateTripInput = CreateTripInput;

export async function updateTrip(partnerId: string, id: string, input: UpdateTripInput) {
  await writeAccess(partnerId);
  validateTrip(input);
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Trip not found.");

  const { driver } = await validateTripAssignments(partnerId, input);

  return prisma.trip.update({
    where: { id },
    data: {
      vehicleId: input.vehicleId || null,
      driverId: input.driverId || null,
      driverName: driver?.name ?? null,
      origin: input.origin,
      destination: input.destination,
      currentLatitude: input.currentLatitude ?? null,
      currentLongitude: input.currentLongitude ?? null,
      deliveryEta: input.deliveryEta ?? null,
    },
  });
}

export async function deleteTrip(partnerId: string, id: string): Promise<void> {
  await writeAccess(partnerId);
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) return;
  await prisma.trip.delete({ where: { id } });
}

/** Assigns driver + vehicle to a trip — assignedAt is stamped server-side. */
export async function assignTripDriverVehicle(
  partnerId: string,
  tripId: string,
  driverId: string,
  driverName: string,
  vehicleId?: string
): Promise<void> {
  await writeAccess(partnerId);
  const existing = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!existing || existing.partnerId !== partnerId) return;
  const { driver, vehicle } = await validateTripAssignments(partnerId, { driverId, vehicleId: vehicleId ?? existing.vehicleId ?? undefined });
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      driverId,
      driverName: driver?.name ?? driverName,
      vehicleId: vehicle?.id ?? null,
      assignedAt: new Date(),
    },
  });
}

/**
 * Advances the delivery stage, stamping the transition's timestamp
 * server-side. A transition into Delivered requires recipient name + proof
 * notes — the caller (DeliveryLifecycle) enforces the UI gate, but this is
 * re-checked here since it's the actual write path and the client's gate
 * must never be trusted alone.
 */
export async function advanceTripDeliveryStage(
  partnerId: string,
  tripId: string,
  nextStage: DeliveryStage,
  proof?: { recipientName: string; deliveryNotes: string },
  failureReason?: string
): Promise<void> {
  await writeAccess(partnerId);
  if (!(nextStage in STAGE_TIMESTAMP_FIELD)) throw new Error("Select a valid delivery stage.");
  return withRecordLock("logistics-trip", `${partnerId}:${tripId}`, async () => {
  const existing = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Trip not found.");

  if (existing.deliveryStage === nextStage) return;
  const allowed: Record<string, DeliveryStage[]> = {
    Pending: ["Out for Delivery", "Failed"],
    "Out for Delivery": ["Delivered", "Failed"],
    Failed: [],
    Delivered: [],
  };
  if (!allowed[existing.deliveryStage]?.includes(nextStage)) throw new Error("Invalid delivery stage transition.");
  if (nextStage === "Delivered" && (!proof?.recipientName?.trim() || !proof?.deliveryNotes?.trim())) throw new Error("Recipient name and delivery proof are required.");
  if (nextStage === "Failed" && !failureReason?.trim()) throw new Error("A failure reason is required.");

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      deliveryStage: nextStage,
      [STAGE_TIMESTAMP_FIELD[nextStage]]: new Date(),
      ...(nextStage === "Delivered" && proof
        ? { recipientName: proof.recipientName, deliveryNotes: proof.deliveryNotes }
        : {}),
      ...(nextStage === "Failed" && failureReason ? { failureReason } : {}),
    },
  });
  });
}
