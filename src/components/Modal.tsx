"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * The one modal primitive every other modal in the app builds on
 * (ConfirmDeleteDialog, ConfirmDialog, SearchSelectModal, ImagePreviewModal
 * — see DESIGN_SYSTEM.md §8). Handles backdrop, Escape-to-close,
 * backdrop-click-to-close, and consistent sizing — nothing else should
 * hand-roll a `fixed inset-0 ... bg-black/50` wrapper.
 */
export function Modal({ open, onClose, title, size = "md", children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${SIZE_CLASS[size]} rounded-lg border border-border bg-bg-raised shadow-xl`}>
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display text-base font-bold text-text">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-text-muted hover:bg-bg-sunken hover:text-text"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
