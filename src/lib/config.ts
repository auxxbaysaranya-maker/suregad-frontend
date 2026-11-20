/**
 * Deployment settings, read at build time.
 *
 * VITE_BASE_PATH — where the site is served from ("/" locally and on suregad.in).
 * VITE_API_URL   — origin of the SureGad API, e.g. https://api.suregad.com. Leave empty when the API is
 *                  served from the same origin (local dev uses the Vite proxy).
 */
export const BASE_PATH = import.meta.env.BASE_URL;
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api/v1`;

/** Path to a file in /public, respecting the base path. */
export function assetUrl(path: string): string {
  return `${BASE_PATH}${path.replace(/^\/+/, "")}`;
}

/** Absolute, shareable URL for an in-app route such as "/product/demo-1". */
export function appUrl(path = window.location.pathname): string {
  const relative = path.startsWith(BASE_PATH) ? path : `${BASE_PATH}${path.replace(/^\/+/, "")}`;
  return new URL(relative, window.location.origin).toString();
}

/** The SureGad Hub (seller, partner and admin panels) — a separate app. */
const defaultAdmin = import.meta.env.DEV ? "http://localhost:5174/" : "https://dashboard.suregad.in/";
export const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || defaultAdmin).replace(/\/?$/, "/");

/** Absolute link into the admin panel, e.g. adminUrl("signup?as=partner"). */
export function adminUrl(path = ""): string {
  return `${ADMIN_URL}${path.replace(/^\/+/, "")}`;
}
