"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { assertPartnerCanWrite } from "@/lib/tenant";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getWorkspaceProfiles, workspaceAlertKeys } from "@/lib/workspaceProfiles";
import { workspaceReportKey } from "@/lib/workspaceTelegram";

export async function saveWorkspaceTelegram(partnerId: string, form: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  await assertPartnerCanWrite(partnerId);
  const modules = await getVisibleModuleSlugs(partnerId);
  if (modules.includes("service-centre")) throw new Error("Use the existing Service Centre Telegram controls.");
  const allowed = new Set(["personal", "group", "both", "none"]);
  const patch: Record<string, string> = {};
  for (const key of ["report", ...workspaceAlertKeys(modules)]) {
    const value = String(form.get(`routing_${key}`) ?? "");
    if (!allowed.has(value)) throw new Error("Invalid notification destination");
    patch[key] = value;
  }
  const profiles = getWorkspaceProfiles(modules);
  const selected = new Set(form.getAll("reportModules").map(String));
  if ([...selected].some(slug => !profiles.some(profile => profile.slug === slug))) throw new Error("Report module is not available to this account");
  if (patch.report !== "none" && !selected.size) throw new Error("Select a report module or turn reports off");
  for (const profile of profiles) patch[workspaceReportKey(profile.slug)] = selected.has(profile.slug) ? "both" : "none";
  // Atomic JSON merge preserves unrelated modules, Admin keys, connected chats and send stamps.
  await prisma.$transaction(async tx => {
    await tx.telegramSettings.upsert({ where: { partnerId }, create: { partnerId, routing: {} }, update: {} });
    await tx.$executeRaw`UPDATE telegram_settings SET routing = COALESCE(routing, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb WHERE "partnerId" = ${partnerId}`;
  });
  revalidatePath(`/partner/${partnerId}/settings/notifications`);
  redirect(`/partner/${partnerId}/settings/notifications?saved=1`);
}
