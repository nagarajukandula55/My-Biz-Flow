import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <LogoMark size={32} />
      <h1 className="font-display text-2xl font-bold text-text">Page not found</h1>
      <p className="max-w-md text-sm text-text-muted">
        Nothing lives at this address. If you followed a link to get here,
        it may be stale — check{" "}
        <Link href="/admin/designer" className="font-semibold text-teal hover:underline">
          the page registry
        </Link>{" "}
        for what actually exists.
      </p>
      <Link href="/help" className="btn-outline mt-2">
        Go to Help
      </Link>
    </div>
  );
}
