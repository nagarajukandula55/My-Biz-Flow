"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SearchSelectModal } from "@/components/SearchSelectModal";

/** Search-and-select picker over this partner's own BOM catalog (see SearchSelectModal.tsx). `options` is fetched server-side by the parent page — a Client Component can't call the partner-scoped getBomOptionsForPartner itself. */
export function BomSearchButton({ options }: { options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <>
      <button type="button" className="btn-outline flex items-center gap-1.5" onClick={() => setOpen(true)}>
        <Search className="h-3.5 w-3.5" strokeWidth={2.25} />
        Find Material
      </button>
      {picked && <span className="ml-2 text-xs text-text-muted">Picked: {picked}</span>}
      <SearchSelectModal
        open={open}
        onClose={() => setOpen(false)}
        title="Find a material"
        options={options}
        onSelect={(o) => setPicked(o.label)}
        searchPlaceholder="Search by code or description…"
      />
    </>
  );
}
