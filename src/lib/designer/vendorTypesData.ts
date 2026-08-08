/**
 * Vendor Types — real Prisma-backed store (`VendorType` table). The
 * top-level entity a vendor account is created against; bundles a default
 * module set, which Roles are assignable, and which Plans apply.
 */
import { prisma } from "@/lib/prisma";

export type VendorTypeRecord = {
  id: string;
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  planIds: string[];
  status: string;
};

function toRecord(row: {
  id: string;
  description: string | null;
  defaultModules: unknown;
  assignableRoleIds: unknown;
  planIds: unknown;
  status: string;
}): VendorTypeRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    defaultModules: (row.defaultModules as string[] | null) ?? [],
    assignableRoleIds: (row.assignableRoleIds as string[] | null) ?? [],
    planIds: (row.planIds as string[] | null) ?? [],
    status: row.status,
  };
}

export async function listVendorTypes(): Promise<VendorTypeRecord[]> {
  const rows = await prisma.vendorType.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function getVendorType(id: string): Promise<VendorTypeRecord | undefined> {
  const row = await prisma.vendorType.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export type VendorTypeInput = {
  description: string;
  defaultModules: string[];
  assignableRoleIds: string[];
  planIds: string[];
  status: string;
};

export async function createVendorType(id: string, data: VendorTypeInput): Promise<void> {
  await prisma.vendorType.create({ data: { id, ...data } });
}

export async function updateVendorType(id: string, data: VendorTypeInput): Promise<void> {
  await prisma.vendorType.update({ where: { id }, data });
}

export async function deleteVendorType(id: string): Promise<void> {
  await prisma.vendorType.delete({ where: { id } });
}

/** Dropdown options for Signup — active types only. */
export async function getVendorTypeOptions(): Promise<{ value: string; label: string }[]> {
  const rows = await prisma.vendorType.findMany({ where: { status: "Active" }, orderBy: { id: "asc" } });
  return rows.map((r) => ({ value: r.id, label: r.id }));
}
