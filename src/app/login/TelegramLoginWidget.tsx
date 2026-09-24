"use client";

import { useEffect, useRef } from "react";

/**
 * Renders Telegram's own Login Widget (a <script> tag Telegram serves,
 * telegram-widget.js) inside a container div. The widget itself handles the
 * "Log in with Telegram" button UI and the popup flow; once the user
 * approves in Telegram, it calls `onTelegramAuth` (registered on `window`
 * below, the convention Telegram's widget script expects for
 * data-onauth="onTelegramAuth(user)") with the signed payload. That payload
 * is POSTed to /api/auth/telegram, which verifies its hash server-side
 * before trusting anything in it (see that route) — this component never
 * trusts the payload itself, it only forwards it.
 */
export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    (window as unknown as { onTelegramAuth: (user: Record<string, unknown>) => void }).onTelegramAuth = (
      user: Record<string, unknown>
    ) => {
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
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    // Matches this app's standard 8px button radius (see .btn-accent/.btn-outline
    // in globals.css) instead of Telegram's default pill shape, so it reads as
    // part of the same button family as the "Sign in with Google" button above
    // it rather than a visually unrelated widget.
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [botUsername]);

  return <div ref={containerRef} />;
}
