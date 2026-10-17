import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getWorkspaceProfiles } from "@/lib/workspaceProfiles";
import { loadWorkspaceSummary } from "@/lib/workspaceSummary";
import { getTelegramSettings, sendPartnerTelegramReport, type TelegramReportCadence } from "@/lib/telegram";

export const workspaceReportKey = (slug: string) => `workspaceModule:${slug}`;
export function telegramHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Returns false only for Service Centre: its established report remains untouched. */
export async function moduleReportMessage(partner: { id: string; partnerTypeId: string; businessName: string }, frequency: TelegramReportCadence, now: Date, scheduled = false): Promise<string | null> {
  const type = await getPartnerType(partner.partnerTypeId);
  // Check the configured type, not transient key availability, to preserve legacy SC reports.
  if (type?.defaultModules.includes("service-centre")) return null;
  const modules = await getVisibleModuleSlugs(partner.id);
  const settings = await getTelegramSettings(partner.id);
  const routing = settings.routing as Record<string, string | undefined>;
  if (scheduled && (routing.report === "none" || (!settings.chatId && !settings.groupChatId))) throw new Error("Telegram report is disabled or no chat is connected");
  const included = getWorkspaceProfiles(modules).filter(profile => routing[workspaceReportKey(profile.slug)] !== "none").map(profile => profile.slug);
  if (!included.length) throw new Error("No active modules selected for Telegram reports");
  const summaries = await loadWorkspaceSummary(partner.id, included);
  const when = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const lines = [
    `<b>${telegramHtml(partner.businessName)}</b>`,
    `${frequency === "DAILY" ? "Daily" : frequency === "WEEKLY" ? "Weekly" : "Monthly"} module snapshot · ${telegramHtml(when)}`,
    "Current totals, not transactions during the reporting period.",
    ...summaries.flatMap(summary => ["", `<b>${telegramHtml(summary.label)}</b>`, ...summary.metrics.map(metric => `${telegramHtml(metric.label)}: ${metric.value.toLocaleString("en-IN")}`)]),
  ];
  // At most 24 short module sections; fail clearly instead of silently truncating business data.
  const message = lines.join("\n");
  if (message.length > 4000) throw new Error("Select fewer modules for one Telegram digest");
  return message;
}

export async function sendModuleReportIfApplicable(partner: { id: string; partnerTypeId: string; businessName: string }, frequency: TelegramReportCadence, now: Date): Promise<boolean> {
  const message = await moduleReportMessage(partner, frequency, now, true);
  if (message === null) return false;
  if (!await sendPartnerTelegramReport(partner.id, frequency, message)) throw new Error("Module report was not accepted by Telegram");
  return true;
}
