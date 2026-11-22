import { api } from "./api";
import { CITIES, distanceKm, nearestCity } from "./cities";

/**
 * Place search and address lookup through the SureGad API, which proxies Google Maps Platform
 * (Places API (New) Autocomplete + Place Details, Geocoding API). The Google key stays on the server.
 * When Google is unavailable the app says so and offers its built-in list of major Indian cities;
 * no other third-party service is used.
 */

export interface Place {
  lat: number;
  lng: number;
  placeId: string | null;
  /** Short display name, e.g. "Edappally, Kochi". */
  label: string;
  /** Full address, e.g. "Edappally, Kochi, Kerala 682024, India". */
  formattedAddress: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  /** True when the name is only the nearest major city (Google place names unavailable). */
  approximate?: boolean;
}

export interface Suggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  types: string[];
  distanceMeters?: number;
  /** Built-in city (used when Google is unavailable): already has coordinates. */
  city?: Place;
}

export function cityPlace(city: (typeof CITIES)[number]): Place {
  return { lat: city.lat, lng: city.lng, placeId: null, label: city.city, formattedAddress: `${city.city}, ${city.state}, India`, locality: "", city: city.city, district: city.city, state: city.state, country: "India" };
}

/* ---------------- autocomplete sessions (Google billing) ---------------- */

const SESSION_MAX_AGE_MS = 3 * 60 * 1000;

function uuidv4(): string {
  const source = globalThis.crypto as Crypto;
  if (typeof source.randomUUID === "function") return source.randomUUID();
  // Older browsers: build a v4 UUID from secure random bytes.
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * One session = the keystrokes of one search plus the final Place Details call.
 * Reused while typing, ended on selection, replaced when stale.
 */
export class AutocompleteSession {
  private token: string | null = null;
  private startedAt = 0;
  current(): string {
    if (!this.token || Date.now() - this.startedAt > SESSION_MAX_AGE_MS) {
      this.token = uuidv4();
      this.startedAt = Date.now();
    }
    return this.token;
  }
  /** The token for the closing Place Details call; the next search gets a new one. */
  end(): string | undefined {
    const token = this.token && Date.now() - this.startedAt <= SESSION_MAX_AGE_MS ? this.token : undefined;
    this.token = null;
    return token;
  }
}

export type SearchResult = { suggestions: Suggestion[]; source: "google" | "cities"; notice?: string };

/** Live suggestions for the typed text. Pass an AbortSignal so superseded keystrokes are cancelled. */
export async function searchPlaces(text: string, session: AutocompleteSession, near: { lat: number; lng: number } | null, signal?: AbortSignal): Promise<SearchResult> {
  const input = text.trim();
  if (input.length < 2) return { suggestions: [], source: "google" };
  try {
    const response = await api.post("/geo/autocomplete", { input, sessionToken: session.current(), ...(near ? { lat: near.lat, lng: near.lng } : {}) }, { signal });
    return { suggestions: response.data.data as Suggestion[], source: "google" };
  } catch (error) {
    if ((error as { name?: string; code?: string }).name === "CanceledError" || (error as { code?: string }).code === "ERR_CANCELED") throw error;
    const code = (error as { code?: string }).code;
    const lower = input.toLowerCase();
    const cities = CITIES.filter((city) => `${city.city} ${city.state}`.toLowerCase().includes(lower)).slice(0, 8);
    return {
      suggestions: cities.map((city) => ({ placeId: `city:${city.city}`, primaryText: city.city, secondaryText: `${city.state}, India`, types: ["locality"], city: cityPlace(city) })),
      source: "cities",
      notice:
        code === "GEO_QUOTA" || code === "GEO_RATE_LIMITED"
          ? "Place search is busy right now — showing major cities."
          : "Detailed place search is unavailable — showing major cities.",
    };
  }
}

/** Coordinates and address for a chosen suggestion (ends the autocomplete session). */
export async function resolveSuggestion(suggestion: Suggestion, session: AutocompleteSession): Promise<Place> {
  if (suggestion.city) {
    session.end();
    return suggestion.city;
  }
  const token = session.end();
  const response = await api.get(`/geo/place/${encodeURIComponent(suggestion.placeId)}`, { params: token ? { sessionToken: token } : {} });
  return response.data.data as Place;
}

const reverseCache = new Map<string, Place>();

let statusPromise: Promise<boolean> | null = null;
/** Whether the server has Google Maps configured (exact place names and live search). */
export function placeNamesAvailable(refresh = false): Promise<boolean> {
  if (!statusPromise || refresh) {
    statusPromise = api
      .get("/geo/status")
      .then((response) => Boolean(response.data.data?.configured))
      .catch(() => false);
  }
  return statusPromise;
}

export function formatCoordinates(point: { lat: number; lng: number }) {
  return `${Math.abs(point.lat).toFixed(5)}° ${point.lat >= 0 ? "N" : "S"}, ${Math.abs(point.lng).toFixed(5)}° ${point.lng >= 0 ? "E" : "W"}`;
}

/** Readable address for a device position (Geocoding API via the server), or the nearest major city. */
export async function reversePlace(point: { lat: number; lng: number }): Promise<Place> {
  const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
  const cached = reverseCache.get(key);
  if (cached) return { ...cached, lat: point.lat, lng: point.lng };
  try {
    const place = (await api.get("/geo/reverse", { params: point })).data.data as Place;
    reverseCache.set(key, place);
    return { ...place, lat: point.lat, lng: point.lng, approximate: false };
  } catch {
    // No exact address available: keep the real GPS coordinates and say which major city is nearest.
    const city = nearestCity(point);
    const km = Math.round(distanceKm(point, city));
    return {
      ...cityPlace(city),
      lat: point.lat,
      lng: point.lng,
      placeId: null,
      label: `Near ${city.city}`,
      formattedAddress: `${formatCoordinates(point)} · about ${km} km from ${city.city}, ${city.state}`,
      approximate: true,
    };
  }
}
