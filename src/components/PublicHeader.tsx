import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

/** Shared header for public (non-partner-scoped, no AppShell) pages. */
export function PublicHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-5">
      <Link href="/" className="flex items-center gap-2">
        <BrandLogo height={36} />
      </Link>
      <nav className="flex items-center gap-4 text-sm font-semibold">
        <Link href="/pricing" className="text-text-muted hover:text-text">
          Pricing
        </Link>
        <Link href="/login" className="text-text-muted hover:text-text">
          Sign in
        </Link>
        <Link href="/signup" className="btn-accent">
          Get started
        </Link>
      </nav>
    </header>
  );
}
