"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { SearchSelectModal } from "@/components/SearchSelectModal";
import { getBomOptions } from "@/lib/sample-data/bom";

/** Live proof of the search-and-select picker (see SearchSelectModal.tsx). */
export function BomSearchButton() {
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
        options={getBomOptions()}
        onSelect={(o) => setPicked(o.label)}
        searchPlaceholder="Search by code or description…"
      />
    </>
  );
}
