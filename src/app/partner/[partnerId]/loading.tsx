import { Loader2 } from "lucide-react";

/**
 * Shared loading UI for every /partner/[partnerId]/* route (rendered inside
 * PartnerLayout, in place of `children`, while a page segment's Server
 * Component is still fetching data). Pairs with the Sidebar's own
 * per-link pending indicator (src/components/Sidebar.tsx) so a nav click
 * gets two layers of feedback: the clicked link dims + spins immediately,
 * and once the new route starts rendering this fills the content area
 * instead of a blank/frozen page — the "feels unresponsive" report this
 * was added for.
 */
export default function PartnerRouteLoading() {
  return (
    <div className="flex min-h-screen min-w-0 flex-1 items-center justify-center bg-bg">
      <Loader2 className="h-6 w-6 animate-spin text-teal" strokeWidth={2.5} />
    </div>
  );
}
