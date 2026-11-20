import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_BASE } from "./config";
import { toast } from "../components/Toaster";

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type Rule = { method: string; path: RegExp; message: string | ((body: Record<string, unknown>) => string | null) | null };

/**
 * Toasts for user actions, matched by method + path. `null` = never toast (background calls).
 * Anything not listed gets an error toast on failure and no toast on success.
 */
const RULES: Rule[] = [
  { method: "post", path: /\/products\/[^/]+\/view$/, message: null },
  { method: "post", path: /\/chat\/conversations\/[^/]+\/read$/, message: null },
  { method: "post", path: /\/chat\/conversations\/[^/]+\/messages$/, message: null },
  { method: "post", path: /\/uploads\/(sign|local)/, message: null },
  { method: "post", path: /\/notifications\/fcm-token$/, message: null },
  { method: "post", path: /\/auth\/(dev-login|password-login)$/, message: null },
  { method: "post", path: /\/auth\/session$/, message: "Signed in" },
  { method: "post", path: /\/auth\/logout$/, message: "Signed out" },
  { method: "post", path: /\/cart\/items$/, message: "Added to cart" },
  { method: "delete", path: /\/cart\/items\//, message: "Removed from cart" },
  { method: "post", path: /\/me\/wishlist\//, message: "Saved to your wishlist" },
  { method: "delete", path: /\/me\/wishlist\//, message: "Removed from your wishlist" },
  { method: "post", path: /\/newsletter$/, message: "You're subscribed" },
  { method: "post", path: /\/me\/addresses$/, message: "Address saved" },
  { method: "post", path: /\/support$/, message: "Sent to SureGad support" },
  { method: "post", path: /\/me\/referral$/, message: "Referral code applied" },
  { method: "post", path: /\/payments\/(mock-complete|verify)$/, message: "Payment successful" },
  { method: "post", path: /\/chat\/conversations\/[^/]+\/offers$/, message: "Offer sent" },
  { method: "post", path: /\/chat\/offers\/[^/]+\/respond$/, message: (body) => ({ accept: "Offer accepted", reject: "Offer declined", withdraw: "Offer withdrawn" })[String(body.action)] || "Offer updated" },
  { method: "post", path: /\/chat\/conversations\/[^/]+\/report$/, message: "Reported. Our team will review it." },
  { method: "post", path: /\/chat\/conversations\/[^/]+\/block$/, message: (body) => (body.blocked ? "User blocked" : "User unblocked") },
  { method: "patch", path: /\/chat\/conversations\/[^/]+$/, message: (body) => (body.important ? "Marked as important" : "Removed from important") },
  { method: "delete", path: /\/chat\/conversations\/[^/]+$/, message: "Conversation deleted" },
  { method: "put", path: /\/products\/[^/]+\/images$/, message: "Photos updated" },
  { method: "patch", path: /\/auth\/me$/, message: "Preferences saved" },
  { method: "post", path: /\/orders\/[^/]+\/returns$/, message: "Return requested" },
  { method: "post", path: /\/me\/returns\/[^/]+\/escalate$/, message: "Escalated to SureGad" },
  { method: "post", path: /\/me\/warranty-claims$/, message: "Warranty claim sent" },
  { method: "post", path: /\/confirm-receipt$/, message: "Delivery confirmed" },
  { method: "post", path: /\/notifications\/push-subscription$/, message: "Notifications turned on" },
];

function ruleFor(config?: InternalAxiosRequestConfig) {
  if (!config) return undefined;
  const method = (config.method || "get").toLowerCase();
  const path = (config.url || "").split("?")[0]!;
  return RULES.find((rule) => rule.method === method && rule.path.test(path));
}

function bodyOf(config?: InternalAxiosRequestConfig): Record<string, unknown> {
  const data = config?.data;
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof data === "object" ? (data as Record<string, unknown>) : {};
}

api.interceptors.response.use(
  (response) => {
    const rule = ruleFor(response.config);
    if (rule?.message) {
      const text = typeof rule.message === "function" ? rule.message(bodyOf(response.config)) : rule.message;
      if (text) toast.success(text);
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.error?.message || (error.response ? "Request failed." : "Can't reach SureGad. Check your connection.");
    const code = error.response?.data?.error?.code || "REQUEST_FAILED";
    const method = String(error.config?.method || "get").toLowerCase();
    const rule = ruleFor(error.config);
    // Reads fail quietly (pages show their own empty/error states); actions always explain what went wrong.
    if (method !== "get" && !(rule && rule.message === null && !/auth\//.test(String(error.config?.url)))) {
      toast.error(error.response ? "That didn't work" : "You're offline", message, { id: `api-error-${code}` });
    } else if (!error.response && method === "get") {
      toast.warning("You're offline", "Showing what's saved. We'll reconnect automatically.", { id: "api-offline" });
    }
    return Promise.reject(Object.assign(new Error(message), { code, details: error.response?.data?.error?.details, status: error.response?.status }));
  },
);

export type ApiError = Error & { code?: string; details?: unknown; status?: number };
