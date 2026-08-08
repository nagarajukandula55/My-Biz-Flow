"use client";

import { useState } from "react";
import { Modal } from "./Modal";

/**
 * Click a thumbnail to view it full-size — device appearance photos,
 * uploaded documents, etc. Wrap any thumbnail element in this.
 */
export function ImagePreviewModal({
  src,
  alt,
  thumbnailClassName = "h-16 w-16 rounded-md border border-border object-cover cursor-pointer",
}: {
  src: string;
  alt: string;
  thumbnailClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className={thumbnailClassName} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={alt} size="lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full rounded-md" />
      </Modal>
    </>
  );
}
