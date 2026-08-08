/**
 * Pure template substitution, deliberately split out from
 * documentTemplates.ts — that file imports node:fs/node:path for its file
 * store, and the Designer's live-preview editor (a Client Component) needs
 * renderTemplate() without dragging Node built-ins into the browser bundle.
 */

export function renderTemplate(htmlTemplate: string, record: Record<string, unknown>): string {
  return htmlTemplate.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = record[key];
    return escapeHtml(value === undefined || value === null ? "" : String(value));
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
