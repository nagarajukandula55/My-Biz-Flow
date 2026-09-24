import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export interface PublicHeaderLink {
  href: string;
  label: string;
}

interface PublicHeaderProps {
  /** Plain nav links (e.g. Pricing, Track My Repair), in display order,
   * rendered before "Sign in" and the final CTA. Defaults to none. */
  links?: PublicHeaderLink[];
  /** Set false to omit the "Sign in" link (e.g. the login page itself). */
  showSignIn?: boolean;
  signInHref?: string;
  signInLabel?: string;
  /** Set false to omit the final CTA button entirely (e.g. a page whose
   * only "CTA" is a plain link, like signup's "Already have an account?"). */
  showCta?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
  /** Extra classes appended to the CTA's base `btn-accent`, e.g.
   * "mbf-cta-glow" on pages that want the animated glow treatment. */
  ctaClassName?: string;
}

/**
 * Shared header for public (non-partner-scoped, no AppShell) marketing/auth
 * pages. Every page supplies its own `links` (and, if it differs from the
 * defaults, its Sign in / CTA hrefs/labels) — this component only owns the
 * markup, spacing, and the mobile-wrap fix (flex-wrap on the header +
 * shrink-0 on the logo, so the logo never gets squeezed out at phone width),
 * not any particular page's link set.
 */
export function PublicHeader({
  links = [],
  showSignIn = true,
  signInHref = "/login",
  signInLabel = "Sign in",
  showCta = true,
  ctaHref = "/signup",
  ctaLabel = "Get started",
  ctaClassName = "",
}: PublicHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 border-b border-border px-6 py-5">
      <Link href="/" className="flex shrink-0 items-center gap-2">
        <BrandLogo height={36} />
      </Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-text-muted hover:text-text">
            {link.label}
          </Link>
        ))}
        {showSignIn && (
          <Link href={signInHref} className="text-text-muted hover:text-text">
            {signInLabel}
          </Link>
        )}
        {showCta && (
          <Link href={ctaHref} className={ctaClassName ? `btn-accent ${ctaClassName}` : "btn-accent"}>
            {ctaLabel}
          </Link>
        )}
      </nav>
    </header>
  );
}
