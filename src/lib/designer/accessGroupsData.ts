/**
 * Access Groups — real Prisma-backed store (`AccessGroup` table). Platform
 * RBAC: a named bundle of per-page, per-action permissions, defined once
 * by Super Admin and reused across every vendor.
 *
 * Deliberately free of the Designer registry import (which pulls in
 * node:fs transitively) so this stays importable from anywhere that isn't
 * strictly a Server Component — the registry-dependent page list lives in
 * accessGroupPermissions.ts.
 */
import { prisma } from "@/lib/prisma";

export type PageAction = "view" | "edit" | "delete" | "other";
export const PAGE_ACTIONS: PageAction[] = ["view", "edit", "delete", "other"];

export type PagePermission = {
  pageId: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
  other: boolean;
};

export type AccessGroupRecord = {
  id: string;
  description: string;
  pagePermissions: PagePermission[];
};

function toRecord(row: { id: string; description: string | null; pagePermissions: unknown }): AccessGroupRecord {
  return {
    id: row.id,
    description: row.description ?? "",
    pagePermissions: (row.pagePermissions as PagePermission[] | null) ?? [],
  };
}

export async function listAccessGroups(): Promise<AccessGroupRecord[]> {
  const rows = await prisma.accessGroup.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function getAccessGroup(id: string): Promise<AccessGroupRecord | undefined> {
  const row = await prisma.accessGroup.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
}

export async function createAccessGroup(data: {
  id: string;
  description: string;
  pagePermissions: PagePermission[];
}): Promise<void> {
  await prisma.accessGroup.create({
    data: { id: data.id, description: data.description, pagePermissions: data.pagePermissions },
  });
}

export async function updateAccessGroup(
  id: string,
  data: { description: string; pagePermissions: PagePermission[] }
): Promise<void> {
  await prisma.accessGroup.update({
    where: { id },
    data: { description: data.description, pagePermissions: data.pagePermissions },
  });
}

export async function deleteAccessGroup(id: string): Promise<void> {
  await prisma.accessGroup.delete({ where: { id } });
}
