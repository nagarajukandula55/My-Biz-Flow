import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { getWorkspaceProfiles, workspaceAlertKeys } from "@/lib/workspaceProfiles";
import { getTelegramSettings, buildTelegramConnectLink, TELEGRAM_ALERT_TYPES } from "@/lib/telegram";
import { workspaceReportKey } from "@/lib/workspaceTelegram";
import { saveWorkspaceTelegram } from "@/lib/workspaceTelegramActions";
import { registerPage } from "@/lib/designer/registry";

registerPage({
  id: "settings.module-notifications", moduleSlug: "platform", title: "Module Telegram notifications",
  path: "/partner/[partnerId]/settings/notifications", kind: "form", superAdminOnly: false, customizableRegions: [],
  explanation: "Owner-scoped Telegram routing and module digest selection. Only active modules and implemented events are offered. Service Centre uses its existing notification controls. Saving preserves connected chats and unrelated preferences.",
  sourceFile: "src/app/partner/[partnerId]/settings/notifications/page.tsx",
});

export default async function ModuleNotifications({ params }: { params: { partnerId: string } }) {
  const session = await requirePartnerSessionForPage(params.partnerId);
  if (session.kind === "staff") redirect(`/partner/${params.partnerId}/telecalling/queue`);
  const modules = await getVisibleModuleSlugs(params.partnerId);
  if (modules.includes("service-centre")) redirect(`/partner/${params.partnerId}/service-centre/telegram`);
  const settings = await getTelegramSettings(params.partnerId);
  const routing = settings.routing as Record<string, string | undefined>;
  const profiles = getWorkspaceProfiles(modules);
  const alerts = workspaceAlertKeys(modules);
  const choices = [{ key: "report", label: "Module summary reports" }, ...TELEGRAM_ALERT_TYPES.filter(alert => alerts.includes(alert.key))];
  const personal = !settings.chatId ? buildTelegramConnectLink(params.partnerId, "personal") : null;
  const group = !settings.groupChatId ? buildTelegramConnectLink(params.partnerId, "group") : null;
  return <AppShell topbarTitle="Telegram notifications">
    <h1 className="font-display text-2xl font-bold text-text">Telegram notifications</h1>
    <p className="mt-2 text-sm text-text-muted">Choose where notifications go and which active modules appear in your daily, weekly and monthly summaries.</p>
    <section className="card mt-6 p-4">
      <h2 className="font-display text-lg font-bold text-text">Connected chats</h2>
      <p className="mt-2 text-sm text-text-muted">Personal: {settings.chatTitle || (settings.chatId ? "Connected" : "Not connected")} · Group: {settings.groupChatTitle || (settings.groupChatId ? "Connected" : "Not connected")}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {personal && <a className="btn-outline" href={personal} target="_blank" rel="noreferrer">Connect personal chat</a>}
        {group && <a className="btn-outline" href={group} target="_blank" rel="noreferrer">Connect group</a>}
      </div>
      <p className="mt-2 text-xs text-text-muted">Contact your administrator to replace an existing connection. Delivery requires a configured bot and permission to post in the chat.</p>
    </section>
    <form action={saveWorkspaceTelegram.bind(null, params.partnerId)} className="mt-6 space-y-6">
      <fieldset className="card p-4"><legend className="font-display font-bold text-text">Notification destinations</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{choices.map(choice => <label key={choice.key} className="text-sm text-text">{choice.label}
          <select name={`routing_${choice.key}`} defaultValue={routing[choice.key] ?? "both"} className="mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 text-text">
            <option value="both">All connected chats</option><option value="personal">Personal chat</option><option value="group">Group</option><option value="none">Off</option>
          </select>
        </label>)}</div>
      </fieldset>
      <fieldset className="card p-4"><legend className="font-display font-bold text-text">Modules in summary reports</legend>
        <p className="mb-3 text-sm text-text-muted">Reports contain current operational totals for these modules. Only event notifications already implemented by your modules are listed above.</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{profiles.map(profile => <label className="flex gap-2 text-sm text-text" key={profile.slug}>
          <input type="checkbox" name="reportModules" value={profile.slug} defaultChecked={routing[workspaceReportKey(profile.slug)] !== "none"} />{profile.label}
        </label>)}</div>
      </fieldset>
      <button className="btn-accent" type="submit">Save notification preferences</button>
      <Link className="btn-outline ml-3" href={`/partner/${params.partnerId}/settings`}>Back to settings</Link>
    </form>
  </AppShell>;
}
