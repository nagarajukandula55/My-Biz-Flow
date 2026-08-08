/**
 * Roles — real Prisma-backed store (`Role` table). Platform RBAC: a named
 * bundle of Access Group ids, defined once by Super Admin and reused
 * across every vendor.
 */
import { prisma } from "@/lib/prisma";

export type RoleRecord = {
  id: string;
  description: string;
  accessGroupIds: string[];
};

function toRecord(row: { id: string; description: string | null; accessGroupIds: unknown }): RoleRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    accessGroupIds: (row.accessGroupIds as string[] | null) ?? [],
  };
}

export async function listRoles(): Promise<RoleRecord[]> {
  const rows = await prisma.role.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function getRole(id: string): Promise<RoleRecord | undefined> {
  const row = await prisma.role.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function createRole(data: { id: string; description: string; accessGroupIds: string[] }): Promise<void> {
  await prisma.role.create({ data: { id: data.id, description: data.description, accessGroupIds: data.accessGroupIds } });
}

export async function updateRole(
  id: string,
  data: { description: string; accessGroupIds: string[] }
): Promise<void> {
  await prisma.role.update({ where: { id }, data: { description: data.description, accessGroupIds: data.accessGroupIds } });
}

export async function deleteRole(id: string): Promise<void> {
  await prisma.role.delete({ where: { id } });
}
