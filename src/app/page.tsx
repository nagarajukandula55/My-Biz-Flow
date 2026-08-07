import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

export default function RootPage() {
  return (
    <div className="mbf-page flex min-h-screen flex-col items-start justify-center gap-4 bg-bg">
      <div className="flex items-center gap-3">
        <LogoMark size={40} />
        <h1 className="font-display text-3xl font-extrabold text-text">My Biz Flow</h1>
      </div>
      <p className="mbf-prose text-text-muted">
        Foundational UI system in progress. See the live component &amp; token reference below.
      </p>
      <Link
        href="/design-system"
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast"
      >
        View design system
      </Link>
    </div>
  );
}
