"use client";

import { useState } from "react";

/**
 * Shareable self-signup link + QR for THIS partner's engineers — the real
 * per-partner equivalent of /downloads's generic, hardcoded-partner
 * instructions. Scanning the QR or opening the link takes an engineer
 * straight to this partner's own Provider signup page
 * (field-force/provider/signup), which is already wired as an installable
 * PWA (see provider/layout.tsx's manifest) — "Add to Home Screen" from
 * there gives them a real app icon with no store listing needed.
 */
export function ProviderInviteCard({ signupLink, qrDataUrl }: { signupLink: string; qrDataUrl: string | null }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(signupLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-bg-raised p-4 sm:flex-row sm:items-center">
      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="Scan to sign up as an engineer" className="h-28 w-28 rounded-md border border-border bg-white p-1" />
      )}
      <div className="flex-1">
        <h2 className="font-display text-sm font-bold text-text">Invite Engineers</h2>
        <p className="mt-1 text-sm text-text-muted">
          Share this link (or have them scan the QR) — it opens their sign-up page on their phone. Once signed up,
          they can tap &quot;Add to Home Screen&quot; / &quot;Install app&quot; in their browser for a real app icon,
          no app store needed.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">{signupLink}</code>
          <button type="button" onClick={copyLink} className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text hover:bg-bg-sunken">
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
