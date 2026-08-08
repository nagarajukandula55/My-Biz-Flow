import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

/** Shared header for public (non-vendor-scoped, no AppShell) pages. */
export function PublicHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-5">
      <Link href="/" className="flex items-center gap-2">
        <LogoMark size={22} />
        <span className="font-display text-base font-extrabold text-text">My Biz Flow</span>
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
