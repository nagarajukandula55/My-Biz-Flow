import Link from "next/link";

/** Links to the real cart-based checkout (pos/checkout) — a multi-item sale
 * doesn't fit the generic RecordFormModal pattern other modules use. */
export function PosNewButton({ partnerId }: { partnerId: string }) {
  return (
    <Link href={`/partner/${partnerId}/pos/checkout`} className="btn-accent">
      + New Sale
    </Link>
  );
}
