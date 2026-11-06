/**
 * Provider-neutral boundary for large artifacts. The current deployment has
 * no object-storage credentials, so existing inline/data-URL behavior remains
 * the fallback. New integrations should implement this contract rather than
 * proxying arbitrary remote files through a serverless function.
 */
export type ArtifactUpload = {
  key: string;
  contentType: string;
  bytes: Uint8Array;
};

export type StoredArtifact = {
  key: string;
  url: string;
  sizeBytes: number;
  contentType: string;
};

const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

export function validateArtifactUpload(upload: ArtifactUpload): void {
  if (!upload.key || upload.key.length > 512) throw new Error("Artifact key is invalid.");
  if (!upload.contentType || upload.contentType.length > 200) throw new Error("Artifact content type is invalid.");
  if (upload.bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error("Artifact exceeds the 25 MB safety limit.");
}

export function configuredArtifactStorage(): boolean {
  return Boolean(process.env.ARTIFACT_STORAGE_BASE_URL && process.env.ARTIFACT_STORAGE_TOKEN);
}

/** Existing callers can keep using their current URL until storage is configured. */
export function resolveArtifactUrl(existingUrl: string | null | undefined): string | null {
  if (!existingUrl) return null;
  if (existingUrl.startsWith("data:") && existingUrl.length > MAX_ARTIFACT_BYTES * 1.4) throw new Error("Inline artifact exceeds the safety limit.");
  return existingUrl;
}
