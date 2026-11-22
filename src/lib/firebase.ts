import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  applyActionCode,
  browserLocalPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getAuth,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
  type Auth,
  type ConfirmationResult,
  type User,
} from "firebase/auth";

/** Public Firebase web config (identifies the project; access is controlled by Firebase rules and authorised domains). */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export function firebaseConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function firebaseApp() {
  if (!firebaseConfigured()) return null;
  if (!app) app = initializeApp(config);
  return app;
}

export function firebaseAuth() {
  const firebase = firebaseApp();
  if (!firebase) return null;
  if (!auth) {
    auth = getAuth(firebase);
    void setPersistence(auth, browserLocalPersistence);
  }
  return auth;
}

function requireAuth() {
  const client = firebaseAuth();
  if (!client) throw new Error("Sign-in is not available right now. Please try again later.");
  return client;
}

/** Fresh ID token for the signed-in Firebase user (Firebase refreshes it before it expires). */
export async function currentIdToken(forceRefresh = false): Promise<string | null> {
  const user = firebaseAuth()?.currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
}

export function currentFirebaseUser(): User | null {
  return firebaseAuth()?.currentUser || null;
}

/** At least 8 characters with a letter and a number. Returns a message, or null when it's fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use letters and at least one number.";
  if (/^(.)\1+$/.test(password) || /^(password|12345678|qwerty)/i.test(password)) return "That password is too easy to guess.";
  return null;
}

export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}

/** Where Firebase sends people after verification / reset (handled by /auth/action). */
function continueUrl(path = "/login") {
  return new URL(`${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`, window.location.origin).toString();
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  const credential = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
  if (name) await updateProfile(credential.user, { displayName: name }).catch(() => undefined);
  await sendEmailVerification(credential.user, { url: continueUrl("/account") }).catch(() => undefined);
  return credential.user.getIdToken(true);
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
  return credential.user.getIdToken();
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(requireAuth(), provider);
  return credential.user.getIdToken();
}

export async function sendResetEmail(email: string) {
  await sendPasswordResetEmail(requireAuth(), email.trim(), { url: continueUrl("/login") });
}

/** Checks a reset link's code and returns the account email it belongs to. */
export async function checkResetCode(code: string) {
  return verifyPasswordResetCode(requireAuth(), code);
}

export async function completePasswordReset(code: string, password: string) {
  await confirmPasswordReset(requireAuth(), code, password);
}

export async function confirmEmailVerification(code: string) {
  await applyActionCode(requireAuth(), code);
  const user = requireAuth().currentUser;
  if (user) {
    await reload(user);
    await user.getIdToken(true);
  }
}

export async function resendVerificationEmail() {
  const user = requireAuth().currentUser;
  if (!user) throw new Error("Sign in again to resend the email.");
  await sendEmailVerification(user, { url: continueUrl("/account") });
}

/** Reloads the Firebase user; true when the email is now verified (and forces a fresh token). */
export async function refreshEmailVerified(): Promise<boolean> {
  const user = requireAuth().currentUser;
  if (!user) return false;
  await reload(user);
  await user.getIdToken(true);
  return user.emailVerified;
}

export async function firebaseSignOut() {
  const client = firebaseAuth();
  if (client) await signOut(client);
}

export async function sendPhoneCode(phone: string, containerId: string) {
  const verifier = new RecaptchaVerifier(requireAuth(), containerId, { size: "normal" });
  return signInWithPhoneNumber(requireAuth(), phone, verifier);
}

export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string) {
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}

/** Plain-language messages for Firebase errors; never reveals whether an email is registered. */
export function authMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead, or reset your password.",
    "auth/weak-password": "Choose a stronger password (at least 8 characters with letters and a number).",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/user-disabled": "This account has been disabled. Contact SureGad support.",
    "auth/popup-closed-by-user": "The Google window was closed before you finished signing in.",
    "auth/cancelled-popup-request": "The Google window was closed before you finished signing in.",
    "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    "auth/account-exists-with-different-credential": "This email already has an account with another sign-in method. Sign in with email and password.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code": "This link is invalid or has already been used. Request a new one.",
    "auth/missing-email": "Enter your email address.",
    "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  };
  if (map[code]) return map[code];
  return error instanceof Error ? error.message.replace(/^Firebase: /, "").replace(/\s*\(auth\/[^)]+\)\.?$/, "") : "Something went wrong. Try again.";
}
