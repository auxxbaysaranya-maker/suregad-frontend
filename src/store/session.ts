import { create } from "zustand";
import { api } from "../lib/api";
import { firebaseSignOut } from "../lib/firebase";
import { devicePushToken, disablePush, syncPushAfterSignIn } from "../lib/push";

export interface SessionProfile {
  id: string;
  displayName: string;
  email?: string;
  emailVerified?: boolean;
  roles: string[];
  locale?: string;
  seller?: { slug?: string; displayName?: string; verified?: boolean } | null;
  businesses?: { _id: string; name: string; slug: string; verificationStatus: string }[];
  partner?: { _id: string; verificationStatus: string; name: string } | null;
  subscription?: { status?: string; planId?: string } | null;
}

interface SessionState {
  token: string | null;
  profile: SessionProfile | null;
  ready: boolean;
  /** Development sign-in: stores the API token and loads the profile. */
  setToken: (token: string) => Promise<void>;
  /** Firebase sign-in: creates or links the SureGad account for this Firebase user. */
  startSession: (idToken: string, name?: string) => Promise<SessionProfile>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

function signedIn(profile: SessionProfile) {
  void syncPushAfterSignIn();
  return profile;
}

export const useSession = create<SessionState>((set, get) => ({
  token: localStorage.getItem("sg_token"),
  profile: null,
  ready: false,
  setToken: async (token) => {
    localStorage.setItem("sg_token", token);
    set({ token });
    const profile = (await api.get("/auth/me")).data.data as SessionProfile;
    set({ profile: signedIn(profile), ready: true });
  },
  startSession: async (idToken, name) => {
    localStorage.setItem("sg_token", idToken);
    set({ token: idToken });
    const profile = (await api.post("/auth/session", { token: idToken, name })).data.data as SessionProfile;
    set({ profile: signedIn(profile), ready: true });
    return profile;
  },
  refresh: async () => {
    if (!get().token && !localStorage.getItem("sg_token")) {
      set({ ready: true, profile: null });
      return;
    }
    try {
      const profile = (await api.get("/auth/me")).data.data as SessionProfile;
      const first = !get().profile;
      set({ profile, ready: true, token: localStorage.getItem("sg_token") });
      if (first) void syncPushAfterSignIn();
    } catch {
      localStorage.removeItem("sg_token");
      set({ token: null, profile: null, ready: true });
    }
  },
  logout: async () => {
    const pushToken = devicePushToken();
    try {
      await api.post("/auth/logout", { pushToken });
    } catch {
      /* already signed out on the server */
    }
    await disablePush({ notifyServer: false });
    await firebaseSignOut().catch(() => undefined);
    localStorage.removeItem("sg_token");
    set({ token: null, profile: null });
  },
}));
