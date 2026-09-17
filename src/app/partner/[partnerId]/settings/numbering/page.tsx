import { redirect } from "next/navigation";

/**
 * Numbering moved from its own nav-reachable page to a tab on the main
 * Settings page (see ../NumberingPanel.tsx and ../SettingsTabs.tsx) — this
 * route stays only as a redirect for anything that still links here
 * directly, rather than 404ing.
 */
export default function PartnerNumberingRedirectPage({ params }: { params: { partnerId: string } }) {
  redirect(`/partner/${params.partnerId}/settings`);
}
