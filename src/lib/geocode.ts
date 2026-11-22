import { CITIES, distanceKm, nearestCity } from "./cities";

/**
 * Free place search and reverse geocoding on OpenStreetMap data through Photon (https://photon.komoot.io),
 * called straight from the browser so each shopper's requests count against their own fair-use allowance.
 * Covers districts, cities, towns, panchayats (local bodies), villages, areas, streets and landmarks in India.
 * Set VITE_PHOTON_URL to use a self-hosted Photon instead of the public one.
 * When Photon can't be reached the app says so and offers its built-in list of major Indian cities.
 */

const PHOTON = (import.meta.env.VITE_PHOTON_URL || "https://photon.komoot.io").replace(/\/$/, "");
/** India bounding box: minLon, minLat, maxLon, maxLat. */
const INDIA_BBOX = "68.1,6.5,97.5,35.7";

export interface Place {
  lat: number;
  lng: number;
  placeId: string | null;
  /** Short display name, e.g. "Edappally, Ernakulam". */
  label: string;
  /** Full address, e.g. "Edappally, Ernakulam, Kanayannur, Ernakulam district, Kerala 682024". */
  formattedAddress: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  /** True when the name is only the nearest major city (place lookup unavailable). */
  approximate?: boolean;
}

export interface Suggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  /** What kind of place this is, e.g. "Village", "Panchayat / local body", "Town", "Street". */
  kind: string;
  types: string[];
  distanceMeters?: number;
  /** Every suggestion already carries its coordinates and address. */
  place: Place;
}

export function cityPlace(city: (typeof CITIES)[number]): Place {
  return { lat: city.lat, lng: city.lng, placeId: null, label: city.city, formattedAddress: `${city.city}, ${city.state}, India`, locality: "", city: city.city, district: city.city, state: city.state, country: "India" };
}

/* ---------------- Kerala taluk → district (OSM "county" is the taluk in Kerala) ---------------- */

const KERALA_TALUKS: Record<string, string[]> = {
  Thiruvananthapuram: ["Thiruvananthapuram", "Neyyattinkara", "Nedumangad", "Chirayinkeezhu", "Varkala", "Kattakada"],
  Kollam: ["Kollam", "Karunagappally", "Kunnathur", "Kottarakkara", "Punalur", "Pathanapuram"],
  Pathanamthitta: ["Thiruvalla", "Mallappally", "Kozhencherry", "Adoor", "Ranni", "Konni"],
  Alappuzha: ["Cherthala", "Ambalappuzha", "Kuttanad", "Karthikappally", "Chengannur", "Mavelikkara"],
  Kottayam: ["Kottayam", "Changanassery", "Vaikom", "Meenachil", "Kanjirappally"],
  Idukki: ["Devikulam", "Udumbanchola", "Thodupuzha", "Peerumade", "Idukki"],
  Ernakulam: ["Kanayannur", "Kochi", "Aluva", "Paravur", "Kunnathunad", "Muvattupuzha", "Kothamangalam"],
  Thrissur: ["Thrissur", "Chavakkad", "Kodungallur", "Mukundapuram", "Thalappilly", "Chalakudy", "Kunnamkulam"],
  Palakkad: ["Palakkad", "Chittur", "Alathur", "Ottappalam", "Mannarkad", "Pattambi", "Attappadi"],
  Malappuram: ["Ernad", "Perinthalmanna", "Tirur", "Ponnani", "Nilambur", "Tirurangadi", "Kondotty"],
  Kozhikode: ["Kozhikode", "Koyilandy", "Vadakara", "Thamarassery"],
  Wayanad: ["Mananthavady", "Sulthan Bathery", "Vythiri"],
  Kannur: ["Kannur", "Thalassery", "Taliparamba", "Iritty", "Payyanur"],
  Kasaragod: ["Kasaragod", "Hosdurg", "Vellarikundu", "Manjeshwaram"],
};
/** Spelling-insensitive key: "Mannarkkad" and "Mannarkad" match. */
const fold = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "").replace(/h/g, "").replace(/(.)\1+/g, "$1");
const TALUK_DISTRICT = new Map<string, string>();
for (const [district, taluks] of Object.entries(KERALA_TALUKS)) {
  TALUK_DISTRICT.set(fold(district), district);
  for (const taluk of taluks) TALUK_DISTRICT.set(fold(taluk), district);
}
function districtOf(county: string, state: string) {
  if (!county) return "";
  if (/kerala/i.test(state)) return TALUK_DISTRICT.get(fold(county)) || county;
  return county.replace(/\s+district$/i, "");
}

/* ---------------- Photon feature → Place ---------------- */

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
}

const SETTLEMENTS = new Set(["city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter", "locality", "isolated_dwelling", "borough", "municipality"]);
const PLACE_KINDS: Record<string, string> = { city: "City", town: "Town", village: "Village", hamlet: "Hamlet", suburb: "Area", neighbourhood: "Area", quarter: "Area", locality: "Locality", isolated_dwelling: "Hamlet", borough: "Area", municipality: "Municipality" };

function kindOf(p: PhotonFeature["properties"]) {
  if (p.osm_key === "place") return PLACE_KINDS[p.osm_value || ""] || "Place";
  if (p.osm_key === "boundary" && p.osm_value === "local_authority") return "Panchayat / local body";
  if (p.osm_key === "boundary" && p.osm_value === "administrative") return p.type === "state" ? "State" : p.type === "county" ? "District / taluk" : "Area";
  if (p.type === "street") return "Street";
  if (p.type === "house") return p.housenumber ? "Address" : "Landmark";
  return "Place";
}

/** Settlements and local bodies first, then streets, then landmarks. */
function rankOf(p: PhotonFeature["properties"]) {
  if (p.osm_key === "place" && SETTLEMENTS.has(p.osm_value || "")) return 0;
  if (p.osm_key === "boundary") return 1;
  if (p.type === "street") return 2;
  return 3;
}

const IGNORED_KEYS = new Set(["waterway", "water", "natural", "landuse", "power", "barrier"]);

function unique(parts: (string | undefined)[], skip: string[] = []) {
  const seen = new Set(skip.filter(Boolean).map((part) => fold(part)));
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const key = fold(part);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(part);
  }
  return out;
}

function placeFromFeature(feature: PhotonFeature, reverse = false): Place {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const settlement = p.osm_key === "place" || p.osm_key === "boundary";
  const county = p.county || "";
  const state = p.state || "";
  const district = districtOf(county, state) || (p.type === "county" ? p.name || "" : "");
  // In reverse lookups a shop's "locality" is often a mall name; the neighbourhood is in "district".
  const area = reverse ? p.district || "" : p.district || p.locality || "";
  const own = settlement ? p.name || "" : "";
  // City: the OSM city, else the place itself when it is a town, else the taluk name (e.g. Thrissur), else the area.
  const city = p.city || (settlement && p.type === "city" ? own : "") || county || area;
  const locality = own && fold(own) !== fold(city) ? own : area && fold(area) !== fold(city) ? area : "";
  // Reverse lookups use only the postal street, never the name of a nearby footpath or building.
  const streetLine = settlement ? "" : !reverse && p.type === "street" ? p.name || "" : p.street ? [p.housenumber, p.street].filter(Boolean).join(" ") : "";
  const label = unique(reverse ? [locality || area, city || county] : [own || locality || streetLine || p.name, city || county]).slice(0, 2).join(", ") || p.name || "Selected place";
  const address = unique([
    reverse || settlement ? undefined : p.name,
    streetLine,
    locality,
    city,
    county && fold(county) !== fold(district) ? county : undefined,
    district ? `${district} district` : undefined,
    [state, p.postcode].filter(Boolean).join(" "),
  ]).join(", ");
  return {
    lat,
    lng,
    placeId: p.osm_type && p.osm_id ? `osm:${p.osm_type}${p.osm_id}` : null,
    label,
    formattedAddress: address || label,
    locality,
    city: city || district || state,
    district,
    state,
    country: p.country || "India",
    approximate: false,
  };
}

/* ---------------- search ---------------- */

let photonHealthy = true;
const searchCache = new Map<string, Suggestion[]>();

export type SearchResult = { suggestions: Suggestion[]; source: "osm" | "cities"; notice?: string };

function citySuggestions(input: string): Suggestion[] {
  const lower = input.toLowerCase();
  return CITIES.filter((city) => `${city.city} ${city.state}`.toLowerCase().includes(lower))
    .slice(0, 8)
    .map((city) => ({ placeId: `city:${city.city}`, primaryText: city.city, secondaryText: `${city.state}, India`, kind: "City", types: ["city"], place: cityPlace(city) }));
}

/** Live suggestions for the typed text (any place in India). Pass an AbortSignal so superseded keystrokes are cancelled. */
export async function searchPlaces(text: string, near: { lat: number; lng: number } | null, signal?: AbortSignal): Promise<SearchResult> {
  const input = text.trim();
  if (input.length < 2) return { suggestions: [], source: "osm" };
  const cacheKey = `${input.toLowerCase()}|${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return { suggestions: cached, source: "osm" };
  const query = new URLSearchParams({ q: input, limit: "15", lang: "en", bbox: INDIA_BBOX });
  if (near) {
    query.set("lat", String(near.lat));
    query.set("lon", String(near.lng));
    query.set("location_bias_scale", "0.3");
  }
  try {
    const response = await fetch(`${PHOTON}/api/?${query}`, { signal });
    if (!response.ok) throw new Error(`Photon ${response.status}`);
    const body = (await response.json()) as { features?: PhotonFeature[] };
    photonHealthy = true;
    const seen = new Set<string>();
    const ranked = (body.features || [])
      .filter((feature) => (feature.properties.countrycode || "IN").toUpperCase() === "IN" && feature.properties.name && !IGNORED_KEYS.has(feature.properties.osm_key || ""))
      .map((feature, order) => ({ feature, order, rank: rankOf(feature.properties) }))
      .sort((a, b) => a.rank - b.rank || a.order - b.order);
    const suggestions: Suggestion[] = [];
    for (const { feature } of ranked) {
      const place = placeFromFeature(feature);
      const p = feature.properties;
      const primaryText = p.type === "house" && p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.name!;
      const secondaryText = unique([p.type === "house" || p.type === "street" ? place.locality : undefined, place.city, p.county, place.district ? `${place.district} district` : undefined, place.state], [primaryText]).join(", ");
      // The same place listed as a village and as its panchayat boundary is shown once.
      const dedupe = `${fold(primaryText)}|${fold(place.district || p.county || "")}|${p.type === "street" ? "street" : ""}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      suggestions.push({
        placeId: place.placeId || `${place.lat},${place.lng}`,
        primaryText,
        secondaryText,
        kind: kindOf(p),
        types: [p.osm_key || "", p.osm_value || ""],
        distanceMeters: near ? Math.round(distanceKm(near, place) * 1000) : undefined,
        place,
      });
      if (suggestions.length >= 8) break;
    }
    if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value as string);
    searchCache.set(cacheKey, suggestions);
    return { suggestions, source: "osm" };
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    photonHealthy = false;
    return { suggestions: citySuggestions(input), source: "cities", notice: "Place search is unavailable right now — showing major cities." };
  }
}

/** Coordinates and address for a chosen suggestion (already included in the suggestion). */
export async function resolveSuggestion(suggestion: Suggestion): Promise<Place> {
  return suggestion.place;
}

/** Whether detailed place names are currently available. */
export async function placeNamesAvailable(): Promise<boolean> {
  return photonHealthy;
}

export function formatCoordinates(point: { lat: number; lng: number }) {
  return `${Math.abs(point.lat).toFixed(5)}° ${point.lat >= 0 ? "N" : "S"}, ${Math.abs(point.lng).toFixed(5)}° ${point.lng >= 0 ? "E" : "W"}`;
}

/* ---------------- reverse geocoding ---------------- */

const reverseCache = new Map<string, Place>();

/** Readable address for a GPS position (area, city, taluk, district), or the nearest major city. */
export async function reversePlace(point: { lat: number; lng: number }): Promise<Place> {
  const key = `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`;
  const cached = reverseCache.get(key);
  if (cached) return { ...cached, lat: point.lat, lng: point.lng };
  try {
    const query = new URLSearchParams({ lat: String(point.lat), lon: String(point.lng), lang: "en", limit: "5", radius: "2" });
    const response = await fetch(`${PHOTON}/reverse?${query}`);
    if (!response.ok) throw new Error(`Photon ${response.status}`);
    const features = ((await response.json()) as { features?: PhotonFeature[] }).features || [];
    if (!features.length) throw new Error("No address");
    photonHealthy = true;
    // Prefer a result that names the neighbourhood and the city; a settlement is next best.
    const best =
      features.find((feature) => feature.properties.district && (feature.properties.city || feature.properties.county)) ||
      features.find((feature) => feature.properties.osm_key === "place") ||
      features[0]!;
    const place = { ...placeFromFeature(best, true), lat: point.lat, lng: point.lng, placeId: null };
    reverseCache.set(key, place);
    return place;
  } catch {
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
