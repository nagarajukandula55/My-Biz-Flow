import type { SocialLinks } from "@/lib/socialLinks";

const ITEMS = [["instagramUrl", "Instagram", "IG"], ["facebookUrl", "Facebook", "f"], ["linkedinUrl", "LinkedIn", "in"], ["youtubeUrl", "YouTube", "▶"], ["xUrl", "X / Twitter", "X"], ["whatsappUrl", "WhatsApp", "WA"]] as const;
export function PublicSocialLinks({ links }: { links: SocialLinks }) {
  const visible = ITEMS.filter(([key]) => links[key]);
  if (visible.length === 0) return null;
  return <nav aria-label="Social media" className="flex flex-wrap items-center justify-center gap-2">{visible.map(([key, label, icon]) => <a key={key} href={links[key] ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-border bg-bg-raised px-2 text-xs font-bold text-text transition hover:border-accent hover:text-accent"><span aria-hidden="true">{icon}</span><span className="sr-only">{label}</span></a>)}</nav>;
}
