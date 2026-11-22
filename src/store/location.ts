import { useMemo } from "react";
import { create } from "zustand";
import { distanceKm } from "../lib/cities";
import { reversePlace, type Place } from "../lib/geocode";

/**
 * The shopper's ACTIVE DISCOVERY LOCATION — the one place every location-aware part of the
 * marketplace reads from (home, search, categories, product pages, sellers, partners).
 * It is only ever used for searching and distances; it is never saved onto listings or profiles.
 */
export interface UserLocation {
  /** Latitude / longitude of the discovery point. */
  lat: number;
  lng: number;
  /** Short name shown in the header, e.g. "Edappally, Kochi". */
  label: string;
  /** Full address from Google, e.g. "Edappally, Kochi, Kerala 682024, India". */
  formattedAddress: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  /** Google place ID when the place came from search or reverse geocoding. */
  placeId: string | null;
  /** device = follows GPS; manual = chosen by the user and never moved by GPS. */
  mode: "device" | "manual";
  lastUpdatedAt: number;
  /** GPS accuracy radius in metres (device mode). */
  accuracyM?: number;
  /** The name is only the nearest major city; refreshed once exact names are available. */
  approximate?: boolean;
}

export type PermissionStatusValue = "granted" | "denied" | "prompt" | "unsupported" | "unknown";

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200] as const;
export const DEFAULT_RADIUS = 25;
/** GPS movement smaller than this (~500 m) doesn't change the device location. */
const MOVE_THRESHOLD_KM = 0.5;
/** Apply a GPS fix only after the position has settled this long (debounce). */
const SETTLE_MS = 2500;

interface LocationState {
  location: UserLocation | null;
  radiusKm: number;
  /** The browser's geolocation permission, kept current when it changes. */
  permissionStatus: PermissionStatusValue;
  /** True once we asked the browser for permission (so we only auto-prompt on first use). */
  asked: boolean;
  pickerOpen: boolean;
  locating: boolean;
  error: string;
  /** Pick a place by hand (manual mode). */
  choose: (place: Place) => void;
  setRadius: (radiusKm: number) => void;
  openPicker: (open: boolean) => void;
  /** Ask for the device position and switch to device mode. */
  detect: () => Promise<boolean>;
  /** Device mode only: apply a new GPS fix if it moved meaningfully (debounced). */
  devicePosition: (point: { lat: number; lng: number; accuracyM?: number }) => void;
  /** Re-look-up the name of an approximate device location (e.g. once Google is available). */
  refreshName: () => Promise<void>;
  setPermission: (status: PermissionStatusValue) => void;
  clear: () => void;
}

const KEY = "sg_location";
const RADIUS_KEY = "sg_radius";
const ASKED = "sg_location_asked";

function storage(key: string, value?: string | null) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the location lasts for this visit */
  }
  return null;
}

/** Reads the saved location, upgrading the older { city, state, lat, lng, source } shape. */
function read(): UserLocation | null {
  try {
    const value = JSON.parse(storage(KEY) || "null") as (Partial<UserLocation> & { source?: string; updatedAt?: number }) | null;
    if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return null;
    return {
      lat: value.lat!,
      lng: value.lng!,
      label: value.label || value.city || "Selected place",
      formattedAddress: value.formattedAddress || [value.label || value.city, value.state].filter(Boolean).join(", "),
      locality: value.locality || "",
      city: value.city || value.label || "",
      district: value.district || value.city || "",
      state: value.state || "",
      country: value.country || "India",
      placeId: value.placeId || null,
      mode: value.mode || (value.source === "gps" ? "device" : "manual"),
      lastUpdatedAt: value.lastUpdatedAt || value.updatedAt || Date.now(),
      accuracyM: value.accuracyM,
      // Older saved device locations without a Google place ID were nearest-city guesses.
      approximate: value.approximate ?? (!value.placeId && (value.mode === "device" || value.source === "gps")),
    };
  } catch {
    return null;
  }
}

function readRadius() {
  const value = Number(storage(RADIUS_KEY));
  return (RADIUS_OPTIONS as readonly number[]).includes(value) ? value : DEFAULT_RADIUS;
}

function fromPlace(place: Place, mode: UserLocation["mode"], accuracyM?: number): UserLocation {
  return {
    lat: place.lat,
    lng: place.lng,
    label: place.label,
    formattedAddress: place.formattedAddress,
    locality: place.locality,
    city: place.city,
    district: place.district,
    state: place.state,
    country: place.country,
    placeId: place.placeId,
    mode,
    lastUpdatedAt: Date.now(),
    accuracyM: mode === "device" && accuracyM ? Math.round(accuracyM) : undefined,
    approximate: Boolean(place.approximate),
  };
}

let settleTimer: ReturnType<typeof setTimeout> | null = null;

export const useLocation = create<LocationState>((set, get) => {
  const save = (location: UserLocation | null) => {
    storage(KEY, location ? JSON.stringify(location) : null);
    set({ location, error: "" });
  };
  return {
    location: read(),
    radiusKm: readRadius(),
    permissionStatus: typeof navigator !== "undefined" && "geolocation" in navigator ? "unknown" : "unsupported",
    asked: storage(ASKED) === "1",
    setPermission: (permissionStatus) => set({ permissionStatus }),
    pickerOpen: false,
    locating: false,
    error: "",
    choose: (place) => save(fromPlace(place, "manual")),
    setRadius: (radiusKm) => {
      storage(RADIUS_KEY, String(radiusKm));
      set({ radiusKm });
    },
    openPicker: (open) => set({ pickerOpen: open, error: "" }),
    clear: () => save(null),
    detect: () =>
      new Promise<boolean>((resolve) => {
        storage(ASKED, "1");
        set({ asked: true });
        if (!("geolocation" in navigator)) {
          set({ error: "This browser can't share your location. Search for a place instead." });
          resolve(false);
          return;
        }
        set({ locating: true, error: "" });
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const point = { lat: position.coords.latitude, lng: position.coords.longitude };
            const place = await reversePlace(point);
            save(fromPlace(place, "device", position.coords.accuracy));
            set({ locating: false, permissionStatus: "granted" });
            resolve(true);
          },
          (error) => {
            set({
              locating: false,
              ...(error.code === error.PERMISSION_DENIED ? { permissionStatus: "denied" as const } : {}),
              error: error.code === error.PERMISSION_DENIED ? "Location permission is blocked. Search for a place instead." : "We couldn't find your location. Search for a place instead.",
            });
            resolve(false);
          },
          // Fresh, GPS-grade fix: Wi-Fi/IP positions can be several kilometres off.
          { enableHighAccuracy: true, timeout: 20_000, maximumAge: 15_000 },
        );
      }),
    devicePosition: (point) => {
      const current = get().location;
      // Manual choices are never overridden by GPS.
      if (!current || current.mode !== "device") return;
      if (distanceKm(current, point) < MOVE_THRESHOLD_KM) return;
      // Debounce: wait for the position to settle, then apply only the latest fix.
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(async () => {
        settleTimer = null;
        const latest = get().location;
        if (!latest || latest.mode !== "device" || distanceKm(latest, point) < MOVE_THRESHOLD_KM) return;
        const place = await reversePlace(point);
        // The user may have switched to a manual place while we were looking up the address.
        if (get().location?.mode !== "device") return;
        save(fromPlace(place, "device", point.accuracyM));
      }, SETTLE_MS);
    },
    refreshName: async () => {
      const current = get().location;
      if (!current?.approximate) return;
      const place = await reversePlace(current);
      const latest = get().location;
      if (place.approximate || !latest || latest.lat !== current.lat || latest.lng !== current.lng) return;
      save({ ...fromPlace(place, latest.mode, latest.accuracyM), lastUpdatedAt: latest.lastUpdatedAt });
    },
  };
});

export interface DiscoveryParams {
  lat: number;
  lng: number;
  radiusKm: number;
}

/**
 * Query parameters for location-aware API calls (null when no location is set), plus a stable key.
 * Put `key` in React Query keys so a location change refetches and older responses can't overwrite newer ones.
 */
export function useDiscovery(): { params: DiscoveryParams | null; key: string; location: UserLocation | null; radiusKm: number } {
  const location = useLocation((state) => state.location);
  const radiusKm = useLocation((state) => state.radiusKm);
  return useMemo(() => {
    if (!location) return { params: null, key: "everywhere", location, radiusKm };
    // ~11 m precision keeps keys stable against GPS jitter.
    const lat = Math.round(location.lat * 1e4) / 1e4;
    const lng = Math.round(location.lng * 1e4) / 1e4;
    return { params: { lat, lng, radiusKm }, key: `${lat},${lng},${radiusKm}`, location, radiusKm };
  }, [location, radiusKm]);
}
