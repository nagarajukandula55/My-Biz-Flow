import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import {
  getTelegramSettings,
  getRecentTelegramConnectionIssue,
  buildTelegramConnectLink,
  TELEGRAM_ALERT_TYPES,
  TELEGRAM_REPORT_FREQUENCIES,
  type AlertDestination,
} from "@/lib/telegram";
import { generateTelegramConnectQrDataUrl } from "@/lib/telegramQr";
import { saveTelegramSettingsAction, sendTestTelegramMessageAction } from "@/lib/telegramSettingsActions";
import { env } from "@/lib/env";
import { NoticeCard } from "@/components/NoticeCard";

registerPage({
  id: "service-centre.telegram",
  moduleSlug: "service-centre",
  title: "Service Centre — Telegram Alerts",
  path: "/partner/[partnerId]/service-centre/telegram",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Per-partner Telegram alert setup — two independently-connectable chats (a personal DM and a group chat), each with its own QR-code deep link that captures the chat id AND a friendly display name automatically via the bot's webhook (no manual entry needed); once connected, a slot shows that name + Disconnect instead of the QR/link again. Per-alert-type routing between personal/group/both; which alert occasions to send; an automatic report digest frequency (DAILY/WEEKLY/MONTHLY, actually sent by /api/cron/telegram-reports — real per-partner revenue/invoice/workorder data, never shared across partners); a Send Test Message button. Send attempts are still recorded to TelegramLogEntry (including two-way reply threading on the new-workorder alert) for the Super Admin side (a separate app), but this partner-facing page surfaces that history only as an actionable banner when recent sends are failing for a fixable reason (bot blocked, chat deleted, etc.), not as a raw log. Settings are real and persisted; actual delivery needs a real bot token + registered webhook (TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME / TELEGRAM_WEBHOOK_SECRET) — see src/lib/telegram.ts and src/app/api/telegram/webhook/route.ts.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/telegram/page.tsx",
});

export const dynamic = "force-dynamic";

const REPORT_FREQUENCY_LABELS: Record<string, string> = {
  NONE: "Off",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

const DESTINATION_LABELS: Record<AlertDestination, string> = {
  personal: "Personal only",
  group: "Group only",
  both: "Both",
};

export default async function TelegramAlertsPage({ params }: { params: { partnerId: string } }) {
  const [settings, connectionIssue] = await Promise.all([
    getTelegramSettings(params.partnerId),
    getRecentTelegramConnectionIssue(params.partnerId),
  ]);
  const botConfigured = Boolean(env.telegramBotToken());
  const personalConnectLink = buildTelegramConnectLink(params.partnerId, "personal");
  const groupConnectLink = buildTelegramConnectLink(params.partnerId, "group");
  const [personalQr, groupQr] = await Promise.all([
    !settings.chatId && personalConnectLink ? generateTelegramConnectQrDataUrl(personalConnectLink) : Promise.resolve(null),
    !settings.groupChatId && groupConnectLink ? generateTelegramConnectQrDataUrl(groupConnectLink) : Promise.resolve(null),
  ]);

  const chatSlots: Array<{
    slot: "personal" | "group";
    label: string;
    chatId: string | null;
    chatTitle: string | null;
    connectLink: string | null;
    qr: string | null;
    hint: string;
    steps: string[];
  }> = [
    {
      slot: "personal",
      label: "Personal chat (DM)",
      chatId: settings.chatId,
      chatTitle: settings.chatTitle,
      connectLink: personalConnectLink,
      qr: personalQr,
      hint: "Scan with your phone's camera, or tap the link — hitting Start captures this chat automatically.",
      steps: [
        "Open your phone's camera app and point it at the QR code (or tap the QR — most phones open it straight in-camera).",
        'A notification/banner will appear — tap it to open Telegram. On desktop, click "Connect" instead to open Telegram directly.',
        'Telegram opens a chat with the My Biz Flow bot with a "Start" button already filled in — tap Start (or Send, if it opened as a message).',
        "You'll get an instant \"Connected!\" reply in that chat — come back to this page and refresh; it'll show as connected.",
      ],
    },
    {
      slot: "group",
      label: "Group chat",
      chatId: settings.groupChatId,
      chatTitle: settings.groupChatTitle,
      connectLink: groupConnectLink,
      qr: groupQr,
      hint: "Scan or tap this to add the bot straight to a group you pick — no need to add it manually first.",
      steps: [
        "Scan the QR code with your phone camera, or tap the link on desktop — this is a special Telegram \"add bot to group\" link, different from the personal one above.",
        "Telegram shows you a list of your groups — pick the one you want alerts posted to (you need admin rights in that group to add a bot).",
        "Telegram adds the bot to that group automatically — nothing else to tap.",
        "The group gets an instant \"Connected!\" message from the bot — refresh this page and it'll show the group as connected.",
      ],
    },
  ];

  const anyChatConnected = Boolean(settings.chatId || settings.groupChatId);
  const bothChatsConnected = Boolean(settings.chatId && settings.groupChatId);

  return (
    <AppShell topbarTitle="Telegram Alerts">
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-text-muted">
          Get real-time alerts in Telegram, to a personal chat and/or a group chat — and reply to a "New workorder"
          alert right there in the chat to log that reply against the workorder it's about.
        </p>

        {connectionIssue && (
          <NoticeCard tone="danger" title="⚠️ Your Telegram alerts aren't getting through">
            Your last {connectionIssue.count} alert{connectionIssue.count === 1 ? "" : "s"} failed to send —{" "}
            {connectionIssue.reason}. Contact support to have your Telegram connection reset so you can reconnect.
          </NoticeCard>
        )}

        {anyChatConnected ? (
          <NoticeCard tone="success" title="✅ Telegram is connected">
            {bothChatsConnected
              ? "Both your personal and group chats are linked — alerts will send per the routing you choose below."
              : `Your ${settings.chatId ? "personal" : "group"} chat is linked. Connect the other one below too if you want alerts there as well.`}
          </NoticeCard>
        ) : botConfigured ? (
          <NoticeCard tone="info" title="Telegram isn't connected yet">
            Scan a QR code or tap Connect below to start receiving alerts.
          </NoticeCard>
        ) : (
          <NoticeCard tone="warning" title="No Telegram bot is connected on this deployment">
            Your settings below will still save, but no messages will actually send until a bot token is configured.
          </NoticeCard>
        )}

        {chatSlots.map(({ slot, label, chatId, chatTitle, connectLink, qr, hint, steps }) => {
          const connected = Boolean(chatId);
          return (
            <div key={slot} className="rounded-lg border border-border bg-bg-raised p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</div>
                  <div className="mt-1 text-sm text-text">
                    {connected ? (
                      <>
                        <span className="text-success">Connected</span> —{" "}
                        {chatTitle ? (
                          <span>{chatTitle}</span>
                        ) : (
                          <>
                            chat <span className="tabular-nums">{chatId}</span>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-text-muted">Not connected</span>
                    )}
                  </div>
                </div>
                {connected ? (
                  <span className="text-xs text-text-muted">Contact support to change this.</span>
                ) : connectLink ? (
                  <a href={connectLink} target="_blank" rel="noopener noreferrer" className="btn-accent">
                    Connect {slot === "group" ? "Group" : ""}
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
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
                  {qr && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt={`${label} connect QR code`}
                      width={176}
                      height={176}
                      className="h-44 w-44 flex-shrink-0 rounded-md border border-border bg-white p-2"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-muted">{hint}</p>
                    <ol className="mt-2 space-y-1.5">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-xs text-text-muted">
                          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!bothChatsConnected && (
          <details className="rounded-lg border border-border bg-bg-raised p-4 text-sm text-text-muted">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-text-muted">
              Enter a Chat ID manually instead
            </summary>
            <p className="mt-2">
              Only needed for a group chat the bot has been added to (get its Chat ID from @userinfobot or the group's
              admin tools) — a personal DM connects automatically via the QR/link above. Only shown for a slot that
              isn't connected yet — once connected, a chat id can no longer be changed here (contact support).
            </p>
            <form action={saveTelegramSettingsAction.bind(null, params.partnerId)} className="mt-3 space-y-2">
              {!settings.chatId && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Personal Chat ID
                  <input
                    type="text"
                    name="chatId"
                    placeholder="123456789"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
                  />
                </label>
              )}
              {!settings.groupChatId && (
                <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Group Chat ID
                  <input
                    type="text"
                    name="groupChatId"
                    placeholder="-1001234567890"
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm normal-case text-text outline-none focus:border-accent"
                  />
                </label>
              )}
              {/* Alert types + report frequency + routing live in the main form
                  below — this mini-form only overrides the chat ids, then falls
                  through to the same save action, so it must resend the other
                  fields' current values or they'd be cleared. Simplest correct
                  fix: keep them as hidden inputs mirroring the main form's
                  current values. */}
              {TELEGRAM_ALERT_TYPES.map((t) => (
                settings.enabledTypes.includes(t.key) ? (
                  <input key={t.key} type="hidden" name={`alert_${t.key}`} value="on" />
                ) : null
              ))}
              {TELEGRAM_ALERT_TYPES.map((t) => (
                <input key={t.key} type="hidden" name={`routing_${t.key}`} value={settings.routing[t.key] ?? "both"} />
              ))}
              <input type="hidden" name="reportFrequency" value={settings.reportFrequency} />
              <button type="submit" className="btn-outline">
                Save Chat IDs
              </button>
            </form>
          </details>
        )}

        <form action={saveTelegramSettingsAction.bind(null, params.partnerId)} className="space-y-4 rounded-lg border border-border bg-bg-raised p-4">
          <input type="hidden" name="chatId" value={settings.chatId ?? ""} />
          <input type="hidden" name="groupChatId" value={settings.groupChatId ?? ""} />

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
              How often a real, per-business revenue/invoice/workorder summary digest is sent to your linked
              chat(s) — DAILY sends every day (for the prior day), WEEKLY every Monday (for the prior week), MONTHLY
              on the 1st (for the prior month). Sent automatically by a daily scheduled job; still needs a real bot
              connection to actually deliver.
            </span>
          </label>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Alert on, and where it goes</div>
            <div className="mt-2 space-y-2">
              {TELEGRAM_ALERT_TYPES.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-2 text-sm text-text">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name={`alert_${t.key}`} defaultChecked={settings.enabledTypes.includes(t.key)} />
                    {t.label}
                  </label>
                  <select
                    name={`routing_${t.key}`}
                    defaultValue={settings.routing[t.key] ?? "both"}
                    className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  >
                    {(["personal", "group", "both"] as AlertDestination[]).map((d) => (
                      <option key={d} value={d}>
                        {DESTINATION_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              "Both" sends to whichever of your personal/group chats is connected. Picking "Personal only" or "Group
              only" for a chat you haven't connected yet means that alert type won't send until you connect it.
            </p>
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
            Sends a test alert to every chat you've connected (personal and group) — useful to confirm your settings
            are saved correctly.
          </p>
        </form>
      </div>
    </AppShell>
  );
}
