import Link from "next/link";

/**
 * Standing, non-dismissible top-of-page banners for states that need the
 * partner's action to resolve — as opposed to SuccessBanner/
 * GlobalActionBanner, which are one-time acknowledgments that a just-taken
 * action succeeded. Rendered above `children` in PartnerLayout so it's
 * visible from every page, not just Settings/Subscription/Telegram
 * themselves, since a partner unaware their plan is unpaid or their
 * Telegram is disconnected won't think to go looking for that news.
 *
 * Two independent conditions, each its own row (both can show together):
 *  - Plan payment pending: subscriptionStatus is "PastDue" or "Cancelled",
 *    or "Trial" within TRIAL_WARNING_DAYS of trialEndAt.
 *  - Telegram not connected: neither chatId nor groupChatId is set —
 *    without a connected chat, this partner can NEVER receive daily
 *    reports or alerts (see api/cron/telegram-reports), no matter how the
 *    report-frequency setting is configured.
 */

const TRIAL_WARNING_DAYS = 3;

export function PendingActionsBanner({
  partnerId,
  subscriptionStatus,
  trialEndAt,
  telegramConnected,
}: {
  partnerId: string;
  subscriptionStatus: string;
  trialEndAt: Date | null;
  telegramConnected: boolean;
}) {
  const daysToTrialEnd = trialEndAt
    ? Math.ceil((trialEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const trialExpired = subscriptionStatus === "Trial" && daysToTrialEnd !== null && daysToTrialEnd < 0;
  const trialEndingSoon = subscriptionStatus === "Trial" && daysToTrialEnd !== null && daysToTrialEnd >= 0 && daysToTrialEnd <= TRIAL_WARNING_DAYS;
  const planPending = subscriptionStatus === "PastDue" || subscriptionStatus === "Cancelled" || trialEndingSoon || trialExpired;

  if (!planPending && telegramConnected) return null;

  return (
    <div className="flex flex-col gap-px">
      {planPending && (
        <Link
          href={`/partner/${partnerId}/admin/subscription`}
          className="flex items-center justify-between gap-3 bg-danger px-4 py-2 text-sm font-medium text-danger-contrast hover:bg-danger/90"
        >
          <span>
            {subscriptionStatus === "Cancelled"
              ? "Your subscription is cancelled — renew to keep using MyBizFlow."
              : subscriptionStatus === "PastDue"
                ? "Your plan payment is overdue — renew now to avoid losing access."
                : trialExpired
                  ? "Your free trial has ended — you can still view all your data, but adding or changing records is locked until you choose a plan."
                  : `Your free trial ends in ${Math.max(0, daysToTrialEnd ?? 0)} day(s) — choose a plan to keep your data.`}
          </span>
          <span className="flex-shrink-0 underline">Renew now &rarr;</span>
        </Link>
      )}
      {!telegramConnected && (
        <Link
          href={`/partner/${partnerId}/service-centre/telegram`}
          className="flex items-center justify-between gap-3 bg-warning px-4 py-2 text-sm font-medium text-black hover:bg-warning/90"
        >
          <span>Telegram isn&apos;t connected — you won&apos;t receive daily reports or alerts until you connect it.</span>
          <span className="flex-shrink-0 underline">Connect now &rarr;</span>
        </Link>
      )}
    </div>
  );
}
