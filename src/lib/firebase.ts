import { initializeApp, type FirebaseApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, type Auth, type ConfirmationResult } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseAuth() {
  const firebase = firebaseApp();
  if (!firebase) return null;
  if (!auth) auth = getAuth(firebase);
  return auth;
}

export async function enableFirebaseMessaging(): Promise<string> {
  const firebase = firebaseApp();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!firebase || !vapidKey) {
    throw new Error("Set VITE_FIREBASE_VAPID_KEY in client/.env. It is the Web Push certificate in Firebase Cloud Messaging.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`);
  const messaging = getMessaging(firebase);
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "SureGad";
    void registration.showNotification(title, { body: payload.notification?.body || "" });
  });
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Firebase did not return a push token.");
  return token;
}

export function firebaseApp() {
  if (!firebaseConfigured()) return null;
  if (!app) app = initializeApp(config);
  return app;
}

export async function signUpWithEmail(email: string, password: string) {
  const client = firebaseAuth();
  if (!client) throw new Error("Firebase web config is missing. Set the VITE_FIREBASE_* values in client/.env.");
  const credential = await createUserWithEmailAndPassword(client, email, password);
  return credential.user.getIdToken();
}

export async function signInWithEmail(email: string, password: string) {
  const client = firebaseAuth();
  if (!client) throw new Error("Firebase web config is missing.");
  const credential = await signInWithEmailAndPassword(client, email, password);
  return credential.user.getIdToken();
}

export async function signInWithGoogle() {
  const client = firebaseAuth();
  if (!client) throw new Error("Firebase web config is missing.");
  const credential = await signInWithPopup(client, new GoogleAuthProvider());
  return credential.user.getIdToken();
}

export async function sendPhoneCode(phone: string, containerId: string) {
  const client = firebaseAuth();
  if (!client) throw new Error("Firebase web config is missing.");
  const verifier = new RecaptchaVerifier(client, containerId, { size: "normal" });
  return signInWithPhoneNumber(client, phone, verifier);
}

export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string) {
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}
