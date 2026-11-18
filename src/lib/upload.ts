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
  if (!response.ok) throw new Error("Upload failed. Try again.");
  return { key: signed.key, url: signed.publicUrl };
}
