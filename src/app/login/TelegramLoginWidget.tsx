"use client";

import { useEffect, useState } from "react";

type TelegramLoginResult = Record<string, unknown> | false;

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (
          options: { bot_id: string; request_access?: string },
          callback: (user: TelegramLoginResult) => void
        ) => void;
      };
    };
  }
}

/**
 * Telegram login via Telegram's `Telegram.Login.auth()` JS API — the
 * documented alternative to embedding Telegram's own pre-rendered widget
 * (see the git history of this file for that version). The drop-in widget
 * only offers large/medium/small sizes with a baked-in "Log in with
 * Telegram" label and no icon-only/circular mode, which didn't match the
 * small circular Google button next to it. This calls Telegram's real auth
 * popup from our own fully custom button instead, so both buttons can look
 * identical (same size/shape), while the actual auth flow and the
 * server-side hash verification in /api/auth/telegram are unchanged.
 *
 * Still loads telegram-widget.js (that's what defines window.Telegram.Login)
 * but without any data-telegram-login attributes, since we're not asking it
 * to render its own button — just to make the auth() function available.
 */
export function TelegramLoginWidget({ botId }: { botId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.Telegram?.Login) {
      setReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  function handleClick() {
    if (!window.Telegram?.Login) return;
    window.Telegram.Login.auth({ bot_id: botId, request_access: "write" }, (user) => {
      if (!user) return; // user cancelled/closed the popup — not an error, just a no-op
      fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      })
        .then((res) => res.json())
        .then((data: { redirect?: string; error?: string }) => {
          window.location.href = data.redirect || "/login?error=telegram_not_connected";
        })
        .catch(() => {
          window.location.href = "/login?error=telegram_not_connected";
        });
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready}
      title="Log in with Telegram"
      aria-label="Log in with Telegram"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-bg hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="20" height="20" viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="120" fill="#229ED9" />
        <path
          fill="#fff"
          d="M181.9 71.5c-1.9-1.6-4.9-1.8-8.7-.4-4.1 1.5-96.4 40.5-105.1 44.2-4.9 2-9.7 4.3-9.7 8.4 0 2.9 1.7 4.7 6.4 6.4 4.9 1.8 17.2 5.5 24.4 7.5 7 2 14.9 4.3 19.1 5.5 3.8 1.1 7.8-.1 10.3-2.5 4.4-4.2 31.1-30.8 33.4-33.1 1.1-1.1 2.5-.2 1.1 1-2.2 2.2-27.8 26.5-31.5 30.4-3.3 3.4-5.9 6.6-2.2 10 5.1 4.7 25.8 18.7 29.4 21.2 2.9 2 5.9 3.4 8.6 3.4 3 0 4.4-1.4 5.3-4.4 1.2-4 12.9-64.2 17.4-88.4 1.4-7.6-.5-10.5-2.1-11.2z"
        />
      </svg>
    </button>
  );
}
