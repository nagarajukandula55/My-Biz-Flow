import { unstable_cache } from "next/cache";
import { getWorkspaceSummary, type WorkspaceSummary } from "@/lib/workspaceSummary";
import { getTelegramSettings, type TelegramSettingsRecord } from "@/lib/telegram";

// These values only drive informational shared-shell badges. Transactional
// pages, send operations and settings pages continue to use live reads.
const workspaceSummaryCached = unstable_cache(
  getWorkspaceSummary,
  ["partner-workspace-summary-shell"],
  { revalidate: 600, tags: ["partner-workspace-summary-shell"] },
);

const telegramSettingsCached = unstable_cache(
  getTelegramSettings,
  ["partner-telegram-settings-shell"],
  { revalidate: 600, tags: ["partner-telegram-settings-shell"] },
);

export async function getWorkspaceSummaryForShell(partnerId: string): Promise<WorkspaceSummary[]> {
  return workspaceSummaryCached(partnerId);
}

export async function getTelegramSettingsForShell(partnerId: string): Promise<TelegramSettingsRecord> {
  return telegramSettingsCached(partnerId);
}
