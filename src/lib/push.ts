import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import { BellRing } from "lucide-react";
import { createElement } from "react";
import { api } from "./api";
import { firebaseApp, firebaseConfigured } from "./firebase";
import { toast } from "../components/Toaster";

/** Which SureGad app this is, so the server builds notification links for the right site. */
const APP = "marketplace" as const;
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
const TOKEN_KEY = "sg_push_token";
const SNOOZE_KEY = "sg_push_prompt_snoozed_until";
/** Own scope, so Firebase's worker never replaces the app's offline (PWA) service worker. */
const SW_URL = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
const SW_SCOPE = `${import.meta.env.BASE_URL}firebase-cloud-messaging-push-scope`;

let messaging: Messaging | null = null;
let listening = false;

function storage(key: string, value?: string | null) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: push still works for this visit */
  }
  return null;
}

export async function pushSupported(): Promise<boolean> {
  if (!firebaseConfigured() || !VAPID_KEY) return false;
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return false;
  return isSupported().catch(() => false);
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

async function getMessagingInstance() {
  if (!messaging) {
    const app = firebaseApp();
    if (!app) throw new Error("Notifications aren't available right now.");
    messaging = getMessaging(app);
  }
  return messaging;
}

function listenInForeground(instance: Messaging) {
  if (listening) return;
  listening = true;
  onMessage(instance, (payload) => {
    const data = payload.data || {};
    const url = data.url;
    toast({
      tone: "info",
      icon: createElement(BellRing, { size: 20 }),
      title: data.title || payload.notification?.title || "SureGad",
      description: data.body || payload.notification?.body,
      duration: 7000,
      actions: url ? [{ label: "Open", primary: true, onClick: () => window.location.assign(url) }] : undefined,
    });
  });
}

/** Get this device's token and register it with the signed-in account (when it changed or `force`). */
async function registerDevice(force = false) {
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  const instance = await getMessagingInstance();
  const token = await getToken(instance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error("This browser didn't provide a notification token.");
  if (force || storage(TOKEN_KEY) !== token) {
    await api.post("/notifications/fcm-token", { token, app: APP });
    storage(TOKEN_KEY, token);
  }
  listenInForeground(instance);
  return token;
}

/** Ask for permission (call from a button press) and register this device. */
export async function enablePush(): Promise<"enabled" | "denied" | "unsupported"> {
  if (!(await pushSupported())) return "unsupported";
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") return "denied";
  await registerDevice(true);
  return "enabled";
}

/**
 * Called after sign-in. If notifications are already allowed, keep this device's token current
 * (Firebase rotates tokens). Otherwise offer them once, politely, a little after sign-in.
 */
export async function syncPushAfterSignIn() {
  if (!(await pushSupported())) return;
  if (Notification.permission === "granted") {
    await registerDevice().catch(() => undefined);
    return;
  }
  if (Notification.permission === "denied") return;
  if (Number(storage(SNOOZE_KEY) || 0) > Date.now()) return;
  setTimeout(() => {
    toast({
      id: "push-offer",
      tone: "info",
      duration: 0,
      icon: createElement(BellRing, { size: 20 }),
      title: "Turn on notifications?",
      description: "Get seller replies, offers and order updates instantly.",
      actions: [
        {
          label: "Turn on",
          primary: true,
          onClick: async () => {
            toast.dismiss("push-offer");
            const result = await enablePush().catch(() => "error" as const);
            if (result === "enabled") toast.success("Notifications are on");
            else if (result === "denied") toast.warning("Notifications are blocked", "Allow them in your browser's site settings to turn them on.");
            else toast.error("Couldn't turn on notifications", "This browser may not support them.");
          },
        },
        { label: "Not now", onClick: () => { storage(SNOOZE_KEY, String(Date.now() + 14 * 86_400_000)); toast.dismiss("push-offer"); } },
      ],
    });
  }, 6000);
}

/** The token registered from this device (sent with logout so the server forgets it). */
export function devicePushToken(): string | undefined {
  return storage(TOKEN_KEY) || undefined;
}

/**
 * Stop push on this device (sign-out or the user turning it off). On sign-out the token is
 * sent with the logout request instead, so `notifyServer` is false there.
 */
export async function disablePush(options: { notifyServer?: boolean } = {}) {
  const token = storage(TOKEN_KEY);
  storage(TOKEN_KEY, null);
  if (token && options.notifyServer !== false) await api.delete("/notifications/fcm-token", { data: { token } }).catch(() => undefined);
  if (!messaging && (await pushSupported()) && Notification.permission === "granted") messaging = await getMessagingInstance().catch(() => null);
  if (messaging) await deleteToken(messaging).catch(() => undefined);
}
