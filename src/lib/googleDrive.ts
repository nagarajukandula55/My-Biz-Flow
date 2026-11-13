import { randomUUID } from "node:crypto";

type DriveUpload = { name: string; mimeType: string; bytes: Uint8Array };

async function accessToken() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Google Drive is not configured");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  if (!response.ok) throw new Error("Google Drive authentication failed");
  return (await response.json() as { access_token: string }).access_token;
}

export async function uploadPrivateDriveFile(file: DriveUpload, folderId: string) {
  const token = await accessToken();
  const boundary = `mbf_${randomUUID()}`;
  const metadata = JSON.stringify({ name: file.name, parents: [folderId] });
  const encoder = new TextEncoder();
  const preamble = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`);
  const ending = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(preamble.length + file.bytes.length + ending.length);
  body.set(preamble); body.set(file.bytes, preamble.length); body.set(ending, preamble.length + file.bytes.length);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` }, body,
  });
  if (!response.ok) throw new Error(`Google Drive upload failed (${response.status})`);
  return await response.json() as { id: string; name: string };
}

export function googleDriveFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
  return id;
}
