import { create } from "zustand";
import { api } from "../lib/api";

export interface SessionProfile {
  id: string;
  displayName: string;
  email?: string;
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
  setToken: (token: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  token: localStorage.getItem("sg_token"),
  profile: null,
  ready: false,
  setToken: async (token) => {
    localStorage.setItem("sg_token", token);
    set({ token });
    const profile = (await api.get("/auth/me")).data.data as SessionProfile;
    set({ profile, ready: true });
  },
  refresh: async () => {
    if (!get().token) {
      set({ ready: true, profile: null });
      return;
    }
    try {
      const profile = (await api.get("/auth/me")).data.data as SessionProfile;
      set({ profile, ready: true });
    } catch {
      localStorage.removeItem("sg_token");
      set({ token: null, profile: null, ready: true });
    }
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* already signed out */
    }
    localStorage.removeItem("sg_token");
    set({ token: null, profile: null });
  },
}));
