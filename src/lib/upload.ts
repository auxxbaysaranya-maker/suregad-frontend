import imageCompression from "browser-image-compression";
import { api } from "./api";
import { API_BASE } from "./config";

interface SignedUpload {
  key: string;
  uploadUrl: string;
  method: "PUT" | "POST";
  fields?: Record<string, string>;
  publicUrl?: string;
}

/**
 * Upload a file through the API's signed-upload flow (Cloudinary, S3 or the local dev driver).
 * Images are compressed in the browser first.
 */
export async function uploadFile(file: File, purpose: string): Promise<{ key: string; url?: string }> {
  const prepared = file.type.startsWith("image/") ? await imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: true }) : file;
  const contentType = prepared.type || file.type;
  const signed = (await api.post("/uploads/sign", { purpose, contentType, size: prepared.size })).data.data as SignedUpload;
  let response: Response;
  if (signed.fields) {
    const body = new FormData();
    for (const [name, value] of Object.entries(signed.fields)) body.append(name, value);
    body.append("file", prepared, file.name);
    response = await fetch(signed.uploadUrl, { method: "POST", body });
  } else if (signed.method === "PUT") {
    response = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: prepared });
  } else {
    const token = localStorage.getItem("sg_token");
    response = await fetch(`${API_BASE}/uploads/local?key=${encodeURIComponent(signed.key)}`, {
      method: "POST",
      headers: { Authorization: token ? `Bearer ${token}` : "", "Content-Type": contentType },
      body: prepared,
    });
  }
  if (!response.ok) throw new Error(await uploadError(response));
  return { key: signed.key, url: signed.publicUrl };
}

/** Readable reason from Cloudinary ({ error: { message } }), the API ({ error: { message } }) or S3. */
export async function uploadError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } | string } | null;
  const reason = typeof body?.error === "string" ? body.error : body?.error?.message;
  if (response.status === 413) return "This file is too large to upload.";
  if (reason && /file size|too large/i.test(reason)) return "This file is too large to upload.";
  if (reason && /invalid image|unsupported|format/i.test(reason)) return "This file type can't be uploaded. Use JPG, PNG, WebP or PDF.";
  if (response.status === 401 || /signature|api_key|timestamp/i.test(reason || "")) return "Upload link expired. Try again.";
  return reason ? `Upload failed: ${reason}` : "Upload failed. Check your connection and try again.";
}
