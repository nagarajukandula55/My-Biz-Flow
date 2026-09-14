import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getTelegramSettings, getTelegramLog, buildTelegramConnectLink, TELEGRAM_ALERT_TYPES, TELEGRAM_REPORT_FREQUENCIES } from "@/lib/telegram";
import { saveTelegramSettingsAction, sendTestTelegramMessageAction, disconnectTelegramAction } from "@/lib/telegramSettingsActions";
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
    "Per-partner Telegram alert setup — a real 'Connect Telegram' deep link that captures the chat id automatically via the bot's webhook (no manual entry needed), which alert occasions to send, an automatic report digest frequency, a Send Test Message button, and a real send-attempt log (TelegramLogEntry) including two-way reply threading on the new-workorder alert. Settings/log are real and persisted; actual delivery needs a real bot token + registered webhook (TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME / TELEGRAM_WEBHOOK_SECRET), which isn't configured here — see src/lib/telegram.ts and src/app/api/telegram/webhook/route.ts.",
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
  const connectLink = buildTelegramConnectLink(params.partnerId);
  const connected = Boolean(settings.chatId);

  return (
    <AppShell topbarTitle="Telegram Alerts">
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-text-muted">
          Get real-time alerts in Telegram — and reply to a "New workorder" alert right there in the chat to log
          that reply against the workorder it's about. Connect once below; no Chat ID to find or type.
        </p>

        {!botConfigured && (
          <div className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            No Telegram bot is connected yet on this deployment — your settings below will be saved, and test/alert
            attempts will be recorded in the activity log, but no messages will actually send until a bot token is
            configured.
          </div>
        )}

        <div className="rounded-lg border border-border bg-bg-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Connection status</div>
              <div className="mt-1 text-sm text-text">
                {connected ? (
                  <>
                    <span className="text-success">Connected</span> — chat <span className="tabular-nums">{settings.chatId}</span>
                  </>
                ) : (
                  <span className="text-text-muted">Not connected</span>
                )}
              </div>
            </div>
            {connected ? (
              <form action={disconnectTelegramAction.bind(null, params.partnerId)}>
                <button type="submit" className="btn-outline">
                  Disconnect
                </button>
              </form>
            ) : connectLink ? (
              <a href={connectLink} target="_blank" rel="noopener noreferrer" className="btn-accent">
                Connect Telegram
              </a>
            ) : (
              <span className="rounded-md bg-warning-soft px-2 py-1 text-xs text-warning">Bot username not configured</span>
            )}
          </div>
          {!connected && !connectLink && (
            <p className="mt-2 text-xs text-text-muted">
              TELEGRAM_BOT_USERNAME isn't set on this deployment yet — see .env.example.
            </p>
          )}
          {!connected && connectLink && (
            <p className="mt-2 text-xs text-text-muted">
              Opens Telegram — tap Start there and this chat is captured automatically as your alert destination.
            </p>
          )}
        </div>

        <details className="rounded-lg border border-border bg-bg-raised p-4 text-sm text-text-muted">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted">
            Enter a Chat ID manually instead
          </summary>
          <p className="mt-2">
            Only needed for a group chat the bot has been added to (get its Chat ID from @userinfobot or the group's
            admin tools) — a personal DM connects automatically via the button above.
          </p>
          <form action={saveTelegramSettingsAction.bind(null, params.partnerId)} className="mt-3 flex items-end gap-2">
            <label className="block flex-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Chat ID
              <input
                type="text"
                name="chatId"
                defaultValue={settings.chatId ?? ""}
                placeholder="-1001234567890"
                className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
              />
            </label>
            {/* Alert types + report frequency live in the main form below — this
                mini-form only overrides the chat id, then falls through to the
                same save action, so it must resend the other fields' current
                values or they'd be cleared. Simplest correct fix: keep them as
                hidden inputs mirroring the main form's current values. */}
            {TELEGRAM_ALERT_TYPES.map((t) => (
              settings.enabledTypes.includes(t.key) ? (
                <input key={t.key} type="hidden" name={`alert_${t.key}`} value="on" />
              ) : null
            ))}
            <input type="hidden" name="reportFrequency" value={settings.reportFrequency} />
            <button type="submit" className="btn-outline shrink-0">
              Save Chat ID
            </button>
          </form>
        </details>

        <form action={saveTelegramSettingsAction.bind(null, params.partnerId)} className="space-y-4 rounded-lg border border-border bg-bg-raised p-4">
          <input type="hidden" name="chatId" value={settings.chatId ?? ""} />

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
