import { create } from "zustand";
import { nearestCity } from "../lib/cities";

export interface UserLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
  source: "gps" | "manual";
}

interface LocationState {
  location: UserLocation | null;
  /** True once we asked the browser for permission (so we only auto-prompt on first use). */
  asked: boolean;
  pickerOpen: boolean;
  locating: boolean;
  error: string;
  set: (location: UserLocation | null) => void;
  openPicker: (open: boolean) => void;
  detect: () => Promise<boolean>;
}

const KEY = "sg_location";
const ASKED = "sg_location_asked";

function read(): UserLocation | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "null") as UserLocation | null;
    return value && Number.isFinite(value.lat) && Number.isFinite(value.lng) ? value : null;
  } catch {
    return null;
  }
}

export const useLocation = create<LocationState>((set, get) => ({
  location: read(),
  asked: localStorage.getItem(ASKED) === "1",
  pickerOpen: false,
  locating: false,
  error: "",
  set: (location) => {
    if (location) localStorage.setItem(KEY, JSON.stringify(location));
    else localStorage.removeItem(KEY);
    set({ location, error: "" });
  },
  openPicker: (open) => set({ pickerOpen: open, error: "" }),
  /** Ask the browser for the device position and name it after the nearest known city. */
  detect: () =>
    new Promise<boolean>((resolve) => {
      localStorage.setItem(ASKED, "1");
      set({ asked: true });
      if (!("geolocation" in navigator)) {
        set({ error: "This browser can't share your location. Pick a city instead." });
        resolve(false);
        return;
      }
      set({ locating: true, error: "" });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          const city = nearestCity(point);
          get().set({ city: city.city, state: city.state, lat: point.lat, lng: point.lng, source: "gps" });
          set({ locating: false });
          resolve(true);
        },
        (error) => {
          set({
            locating: false,
            error: error.code === error.PERMISSION_DENIED ? "Location permission was blocked. Pick a city instead." : "We couldn't find your location. Pick a city instead.",
          });
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
      );
    }),
}));
