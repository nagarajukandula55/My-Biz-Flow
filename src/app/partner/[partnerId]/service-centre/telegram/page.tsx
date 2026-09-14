import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getTelegramSettings, TELEGRAM_ALERT_TYPES } from "@/lib/telegram";
import { saveTelegramSettingsAction } from "@/lib/telegramSettingsActions";
import { env } from "@/lib/env";

registerPage({
  id: "service-centre.telegram",
  moduleSlug: "service-centre",
  title: "Service Centre — Telegram Alerts",
  path: "/partner/[partnerId]/service-centre/telegram",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Per-partner Telegram alert setup — chatId + which alert occasions to send there. Settings are real and persisted (TelegramSettings); actual delivery needs a real bot token (TELEGRAM_BOT_TOKEN), which isn't configured here — see src/lib/telegram.ts.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/telegram/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function TelegramAlertsPage({ params }: { params: { partnerId: string } }) {
  const settings = await getTelegramSettings(params.partnerId);
  const botConfigured = Boolean(env.telegramBotToken());

  return (
    <AppShell topbarTitle="Telegram Alerts">
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-text-muted">
          Get real-time alerts in a Telegram chat/group — add this bot to your group, then paste its Chat ID below
          (get it from @userinfobot or your group's admin tools) and choose which events to send.
        </p>

        {!botConfigured && (
          <div className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            No Telegram bot is connected yet on this deployment — your settings below will be saved, but no messages
            will actually send until one is configured.
          </div>
        )}

        <form action={saveTelegramSettingsAction.bind(null, params.partnerId)} className="space-y-4 rounded-lg border border-border bg-bg-raised p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Chat ID
            <input
              type="text"
              name="chatId"
              defaultValue={settings.chatId ?? ""}
              placeholder="-1001234567890"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
            />
          </label>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Alert on</div>
            <div className="mt-2 space-y-1.5">
              {TELEGRAM_ALERT_TYPES.map((t) => (
                <label key={t.key} className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" name={`alert_${t.key}`} defaultChecked={settings.enabledTypes.includes(t.key)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-accent">
            Save
          </button>
        </form>
      </div>
    </AppShell>
  );
}
