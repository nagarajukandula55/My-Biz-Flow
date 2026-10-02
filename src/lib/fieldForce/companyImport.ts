/**
 * Bulk-creates Bookings from a company's job-data CSV, using that
 * FieldForceCompany's own saved columnMapping (CSV header text -> our
 * internal field — see companiesData.ts) so a partner configures the
 * layout once per company and every later file from them just works.
 *
 * Not built on the generic runBulkImport/createBusinessRecord engine
 * (src/lib/bulkImportCsv.ts) — Booking is a first-class Prisma model with
 * real relations (Customer, Address, Service, Provider), not a generic
 * BusinessRecord JSON blob, so this does its own Customer/Address
 * find-or-create + Service lookup per row, then dispatches each created
 * Booking the same way an end-customer's own booking would be (nearest
 * eligible Provider gets offered first — see matchingEngine.ts).
 */
import { findOrCreateCustomer, addAddress } from "@/lib/fieldForce/customersData";
import { createCompanyBooking } from "@/lib/fieldForce/bookingsData";
import { dispatchBookingRequest } from "@/lib/fieldForce/matchingEngine";
import { prisma } from "@/lib/prisma";
import type { CompanyUploadField } from "@/lib/fieldForce/companiesData";
import { REQUIRED_COMPANY_UPLOAD_FIELDS } from "@/lib/fieldForce/companiesData";

/** Raw CSV parse — headers kept exactly as written in the file (no matching against known keys), since the whole point is the company's own saved mapping decides what each header means. No quoted-comma support, same limitation every other plain CSV importer in this app has. */
function parseRawCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
  return { headers, rows };
}

export type CompanyImportResult = {
  createdCount: number;
  failed: { row: number; error: string }[];
};

export async function importCompanyBookingsCsv(
  partnerId: string,
  companyId: string,
  columnMapping: Record<string, CompanyUploadField>,
  file: File
): Promise<CompanyImportResult> {
  const text = await file.text();
  const { headers, rows } = parseRawCsv(text);
  if (rows.length === 0) throw new Error("No valid rows found in the CSV");

  // header text -> column index, only for headers this company's mapping actually uses.
  const colIndexByField = new Map<CompanyUploadField, number>();
  for (const [header, field] of Object.entries(columnMapping)) {
    const idx = headers.findIndex((h) => h.toLowerCase() === header.toLowerCase());
    if (idx >= 0) colIndexByField.set(field, idx);
  }

  const missingRequired = REQUIRED_COMPANY_UPLOAD_FIELDS.filter((f) => !colIndexByField.has(f));
  if (missingRequired.length > 0) {
    throw new Error(
      `This company's column mapping doesn't cover required field(s): ${missingRequired.join(", ")}. Set up the mapping on the Companies page first.`
    );
  }

  function cell(row: string[], field: CompanyUploadField): string {
    const idx = colIndexByField.get(field);
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  }

  let createdCount = 0;
  const failed: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const customerName = cell(row, "customerName");
      const customerPhone = cell(row, "customerPhone");
      const addressLine1 = cell(row, "addressLine1");
      const city = cell(row, "city");
      const state = cell(row, "state");
      const pincode = cell(row, "pincode");
      const serviceName = cell(row, "serviceName");
      const notes = cell(row, "notes");
      const scheduledAtRaw = cell(row, "scheduledAt");

      const missing = REQUIRED_COMPANY_UPLOAD_FIELDS.filter((f) => !cell(row, f));
      if (missing.length > 0) {
        failed.push({ row: i + 2, error: `Missing required value(s): ${missing.join(", ")}` });
        continue;
      }

      const service = await prisma.service.findFirst({ where: { name: { equals: serviceName, mode: "insensitive" } } });
      if (!service) {
        failed.push({ row: i + 2, error: `Service "${serviceName}" not found in the catalog.` });
        continue;
      }

      const customer = await findOrCreateCustomer(partnerId, { name: customerName, phone: customerPhone });
      const address = await addAddress(customer.id, partnerId, { line1: addressLine1, city, state, pincode });

      const scheduledAt = scheduledAtRaw && !Number.isNaN(new Date(scheduledAtRaw).getTime()) ? new Date(scheduledAtRaw) : new Date();

      const booking = await createCompanyBooking(partnerId, {
        customerId: customer.id,
        addressId: address.id,
        serviceId: service.id,
        companyId,
        scheduledAt,
        slotLabel: "Any time",
        notes: notes || undefined,
      });

      // Auto-assign to the nearest eligible engineer by pincode — same
      // fan-out an end-customer's own booking gets (matchingEngine.ts).
      await dispatchBookingRequest(booking.id);

      createdCount++;
    } catch (err) {
      failed.push({ row: i + 2, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { createdCount, failed };
}
