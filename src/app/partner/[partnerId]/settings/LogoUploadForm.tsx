"use client";

import { useRef, useState, useTransition } from "react";
import { saveLogoAction, saveShowLogoOnDocumentsAction } from "./actions";

const MAX_SOURCE_FILE_BYTES = 1_500_000; // ~1.5MB — matches updatePartnerLogo's stored-size cap.

/**
 * Real logo upload — replaces the old demo stub that kept the picked
 * filename in local state and never uploaded anywhere. There is no S3/file-
 * storage pipeline anywhere in this app, so the file is read client-side
 * via FileReader into a `data:` URL and handed straight to saveLogoAction,
 * which persists it on Partner.logoDataUrl (see that action +
 * updatePartnerLogo() for the size/format guardrails). Once set, the same
 * logo renders in the sidebar header (Sidebar.tsx) instead of the app's own
 * BrandLogo, and can be used on printed documents.
 */
export function LogoUploadForm({
  partnerId,
  currentLogoDataUrl,
  showLogoOnDocuments,
}: {
  partnerId: string;
  currentLogoDataUrl: string | null;
  /** Partner.showLogoOnDocuments — real, persisted value; see the toggle below. */
  showLogoOnDocuments: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(currentLogoDataUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showOnDocuments, setShowOnDocuments] = useState(showLogoOnDocuments);
  const [savingToggle, setSavingToggle] = useState(false);

  async function toggleShowOnDocuments() {
    const next = !showOnDocuments;
    setShowOnDocuments(next); // optimistic — a failed save reverts below
    setSavingToggle(true);
    try {
      await saveShowLogoOnDocumentsAction(partnerId, next);
    } catch {
      setShowOnDocuments(!next);
    } finally {
      setSavingToggle(false);
    }
  }

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (file.size > MAX_SOURCE_FILE_BYTES) {
      setError("Image is too large — please use a file under ~1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      setPreview(dataUrl);
      startTransition(async () => {
        const result = await saveLogoAction(partnerId, dataUrl);
        if (result && typeof result === "object" && result.error) setError(result.error);
      });
    };
    reader.onerror = () => setError("Could not read that file — please try another image.");
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    setError(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(async () => {
      const result = await saveLogoAction(partnerId, null);
      if (result && typeof result === "object" && result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-8 max-w-2xl">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Logo</label>
      <div className="flex items-center gap-4 rounded-md border border-border bg-bg p-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-sunken text-xs text-text-muted">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a data: URL, not a file next/image can optimise.
            <img src={preview} alt="Business logo" className="h-full w-full object-contain" />
          ) : (
            "—"
          )}
        </div>
        <div className="flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-contrast"
          />
          <p className="mt-1 text-xs text-text-muted">
            {pending
              ? "Saving…"
              : preview
                ? "Shown in the sidebar header and on printed documents."
                : "No logo uploaded yet — the app's default branding is shown instead."}
          </p>
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
          {preview && !pending && (
            <button type="button" onClick={handleRemove} className="mt-1.5 text-xs font-medium text-danger hover:underline">
              Remove logo
            </button>
          )}
        </div>
      </div>

      {preview && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-bg-raised px-3 py-2.5">
          <div>
            <div className="text-sm font-semibold text-text">Show logo on printed documents</div>
            <div className="mt-0.5 text-xs text-text-muted">
              Off: printed documents (e.g. the Service Centre workorder) print without the logo, even though
              it's still uploaded and still shows in the sidebar header.
            </div>
          </div>
          <button
            type="button"
            onClick={toggleShowOnDocuments}
            disabled={savingToggle}
            className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              showOnDocuments ? "bg-accent" : "bg-bg-sunken"
            }`}
            aria-pressed={showOnDocuments}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-bg-raised shadow transition-transform ${
                showOnDocuments ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
