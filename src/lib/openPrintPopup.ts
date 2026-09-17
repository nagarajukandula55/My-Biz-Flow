/**
 * Opens a document (job card/estimate/service record/invoice/etc.) in a
 * small, separate popup window sized for print preview — like Amazon's
 * order-invoice popup — instead of navigating the current tab (which
 * forced a Back click to return to whatever list the user was on) or
 * opening a full same-size browser tab. Ported from the reference app
 * (AN-CRM's src/lib/openPrintPopup.ts) — same dimensions, same window-
 * feature string, same no-popup fallback, with one fix: the primary
 * window.open() call must NOT include `noopener` — per spec, `noopener`
 * makes window.open() always return null, which made the `if (!win)`
 * check below think every popup had been blocked and fire the "_blank"
 * fallback on top of it, opening a duplicate tab alongside the popup on
 * every single click. Safe to drop here since this only ever opens this
 * same app's own print pages (same-origin), not an external URL.
 */
export function openPrintPopup(url: string): void {
  const width = 900;
  const height = 1000;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  const win = window.open(
    url,
    "printwindow",
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
  );
  if (!win) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  // Popups can otherwise open unfocused behind the opener tab, forcing the
  // user to click into them before printing/scrolling works.
  win.focus();
}
