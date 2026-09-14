import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getTelegramSettings, getTelegramLog, TELEGRAM_ALERT_TYPES, TELEGRAM_REPORT_FREQUENCIES } from "@/lib/telegram";
import { saveTelegramSettingsAction, sendTestTelegramMessageAction } from "@/lib/telegramSettingsActions";
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
    "Per-partner Telegram alert setup — chatId, which alert occasions to send, an automatic report digest frequency, a Send Test Message button, and a real send-attempt log (TelegramLogEntry). Settings/log are real and persisted; actual delivery needs a real bot token (TELEGRAM_BOT_TOKEN), which isn't configured here — see src/lib/telegram.ts.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/telegram/page.tsx",
});

export const dynamic = "force-dynamic";

const REPORT_FREQUENCY_LABELS: Record<string, string> = {
  NONE: "Off",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export default async function TelegramAlertsPage({ params }: { params: { partnerId: string } }) {
  const [settings, log] = await Promise.all([
    getTelegramSettings(params.partnerId),
    getTelegramLog(params.partnerId),
  ]);
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
            No Telegram bot is connected yet on this deployment — your settings below will be saved, and test/alert
            attempts will be recorded in the activity log, but no messages will actually send until a bot token is
            configured.
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

          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Automatic business report
            <select
              name="reportFrequency"
              defaultValue={settings.reportFrequency}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
            >
              {TELEGRAM_REPORT_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {REPORT_FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal normal-case text-text-muted">
              How often a revenue/workorder summary digest is sent to your linked chat. Sending on this schedule
              still needs a real bot connection — the setting itself is saved now.
            </span>
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

        <form action={sendTestTelegramMessageAction.bind(null, params.partnerId)} className="rounded-lg border border-border bg-bg-raised p-4">
          <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text hover:border-accent hover:text-accent">
            Send Test Message
          </button>
          <p className="mt-2 text-xs text-text-muted">
            Sends a test alert using your saved Chat ID above and records the result below — useful to confirm your
            settings are saved correctly.
          </p>
        </form>

        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Recent activity</div>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">No alerts attempted yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-text">{entry.type}</div>
                    <div className="text-xs text-text-muted">{new Date(entry.createdAt).toLocaleString()}</div>
                  </div>
                  <span
                    className={
                      entry.sent
                        ? "shrink-0 rounded-md bg-success-soft px-2 py-0.5 text-xs text-success"
                        : "shrink-0 rounded-md bg-warning-soft px-2 py-0.5 text-xs text-warning"
                    }
                  >
                    {entry.sent ? "Sent" : entry.reason ?? "Not sent"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
