import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import { Check, ChevronDown, Crosshair, Hand, Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import { CITIES } from "../lib/cities";
import { AutocompleteSession, cityPlace, formatCoordinates, placeNamesAvailable, resolveSuggestion, searchPlaces, type Place, type Suggestion } from "../lib/geocode";
import { RADIUS_OPTIONS, useLocation } from "../store/location";
import { cn } from "../lib/utils";
import { Modal } from "./Modal";
import { toast } from "./Toaster";

/** Nav-bar chip showing the active discovery location and radius; opens the picker. */
export function LocationChip({ className, compact = false }: { className?: string; compact?: boolean }) {
  const location = useLocation((state) => state.location);
  const radiusKm = useLocation((state) => state.radiusKm);
  const openPicker = useLocation((state) => state.openPicker);
  const locating = useLocation((state) => state.locating);
  // The short Google name (e.g. "Edappally, Kochi"), or "Near Thrissur" when only the nearest city is known.
  const name = location ? location.label || location.city : "";
  return (
    <button
      type="button"
      onClick={() => openPicker(true)}
      className={cn("group flex min-w-0 items-center gap-1.5 rounded-full text-left transition hover:bg-brand-50", compact ? "px-2 py-1.5" : "px-3 py-2", className)}
      aria-label={location ? `Location: ${location.label}, within ${radiusKm} km. Change location` : "Choose your location"}
    >
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-white">
        {locating ? <Loader2 size={15} className="animate-spin" /> : location?.mode === "device" ? <Navigation size={14} /> : <MapPin size={15} />}
      </span>
      <span className="min-w-0">
        {!compact ? <span className="block text-[11px] leading-none text-muted">{location ? `Within ${radiusKm} km of` : "Set location"}</span> : null}
        <span className="flex items-center gap-0.5 text-[13px] leading-tight font-semibold text-ink">
          <span className="truncate">{location ? name : "Choose city"}</span>
          <ChevronDown size={14} className="shrink-0 text-muted transition group-hover:translate-y-0.5" />
        </span>
      </span>
    </button>
  );
}

function formatMeters(meters?: number) {
  if (meters === undefined) return null;
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${meters < 10_000 ? (meters / 1000).toFixed(1) : Math.round(meters / 1000)} km`;
}

/**
 * Google-powered place search (through the SureGad API). Live suggestions for cities, towns,
 * villages, localities, streets and addresses in India, with keyboard navigation.
 */
export function PlaceSearch({ onPick, near, autoFocus }: { onPick: (place: Place) => void; near: { lat: number; lng: number } | null; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [source, setSource] = useState<"google" | "cities">("google");
  const [notice, setNotice] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [active, setActive] = useState(-1);
  const [resolving, setResolving] = useState<string | null>(null);
  const session = useRef(new AutocompleteSession());
  const controller = useRef<AbortController | null>(null);
  const listId = useId();
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2) {
      controller.current?.abort();
      setSuggestions([]);
      setState("idle");
      setNotice("");
      return;
    }
    const timer = setTimeout(() => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setState("loading");
      searchPlaces(query, session.current, nearRef.current, current.signal)
        .then((result) => {
          if (current.signal.aborted) return;
          setSuggestions(result.suggestions);
          setSource(result.source);
          setNotice(result.notice || "");
          setActive(result.suggestions.length ? 0 : -1);
          setState("done");
        })
        .catch(() => {
          if (!current.signal.aborted) setState("error");
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => () => controller.current?.abort(), []);

  async function choose(suggestion: Suggestion) {
    setResolving(suggestion.placeId);
    try {
      const place = await resolveSuggestion(suggestion, session.current);
      setText("");
      setSuggestions([]);
      setState("idle");
      onPick(place);
    } catch {
      toast.error("Couldn't load that place", "Try another suggestion or pick a city.");
    } finally {
      setResolving(null);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0 && suggestions[active]) {
      event.preventDefault();
      void choose(suggestions[active]);
    } else if (event.key === "Escape" && text) {
      event.preventDefault();
      event.stopPropagation();
      setText("");
    }
  }

  const open = text.trim().length >= 2;
  return (
    <div>
      <div className="relative">
        <MapPin size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-brand-600" />
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder="Search area, street, town or city"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search for a place"
          autoComplete="off"
          className="h-12 w-full rounded-2xl bg-canvas pr-11 pl-11 text-[15px] ring-1 ring-line outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400"
        />
        {state === "loading" ? (
          <Loader2 size={17} className="absolute top-1/2 right-4 -translate-y-1/2 animate-spin text-muted" aria-label="Searching" />
        ) : text ? (
          <button type="button" onClick={() => setText("")} aria-label="Clear search" className="absolute top-1/2 right-2.5 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-white hover:text-ink">
            <X size={16} />
          </button>
        ) : (
          <Search size={16} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
        )}
      </div>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {notice ? <p className="border-b border-line bg-amber-50 px-4 py-2 text-[12px] text-amber-900">{notice}</p> : null}
          {state === "error" ? <p className="px-4 py-5 text-center text-[14px] text-muted">Couldn't search places. Check your connection and try again.</p> : null}
          {state === "done" && !suggestions.length ? <p className="px-4 py-5 text-center text-[14px] text-muted">No places found for “{text.trim()}”. Try a nearby town or check the spelling.</p> : null}
          <ul id={listId} role="listbox" aria-label="Place suggestions" className="max-h-[50vh] overflow-y-auto overscroll-contain">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => void choose(suggestion)}
                  disabled={Boolean(resolving)}
                  className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition", index === active ? "bg-brand-50" : "hover:bg-canvas")}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-canvas text-muted">
                    {resolving === suggestion.placeId ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{suggestion.primaryText}</span>
                    {suggestion.secondaryText ? <span className="block truncate text-[12px] text-muted">{suggestion.secondaryText}</span> : null}
                  </span>
                  {formatMeters(suggestion.distanceMeters) ? <span className="mt-1 shrink-0 text-[11px] font-semibold text-muted">{formatMeters(suggestion.distanceMeters)}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {source === "google" && suggestions.length ? (
            // Attribution required by the Google Maps Platform terms when results are shown without a Google map.
            <p className="border-t border-line px-4 py-2 text-right text-[11px] text-muted">
              Powered by <span className="font-semibold"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function LocationPicker() {
  const { location, radiusKm, pickerOpen, openPicker, choose, setRadius, detect, locating, error, permissionStatus } = useLocation();
  const [exactNames, setExactNames] = useState<boolean | null>(null);
  useEffect(() => {
    if (pickerOpen) void placeNamesAvailable(true).then(setExactNames);
  }, [pickerOpen]);

  function pick(place: Place) {
    choose(place);
    openPicker(false);
    toast.success(`Showing results near ${place.city || place.label}`, `Within ${radiusKm} km. You can change the distance any time.`);
  }

  async function locateMe() {
    if (await detect()) {
      openPicker(false);
      const current = useLocation.getState().location;
      if (current) toast.success(`Using your location: ${current.label}`, current.approximate ? formatCoordinates(current) : current.formattedAddress);
    }
  }

  const popular = CITIES.filter((city) => city.popular);
  return (
    <Modal open={pickerOpen} onOpenChange={openPicker} title="Your location" description="We show devices, sellers and inspection partners near this place." size="md">
      {location ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-canvas p-3 ring-1 ring-line">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 ring-1 ring-line">{location.mode === "device" ? <Navigation size={17} /> : <Hand size={17} />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[14px] font-semibold">{location.label}</span>
              {location.approximate ? <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">Approximate name</span> : null}
            </span>
            {!location.approximate && location.formattedAddress !== location.label ? <span className="block text-[12px] leading-snug text-ink-soft">{location.formattedAddress}</span> : null}
            <span className="block text-[12px] text-muted">
              {formatCoordinates(location)}
              {location.mode === "device" && location.accuracyM ? ` · ±${location.accuracyM >= 1000 ? `${(location.accuracyM / 1000).toFixed(1)} km` : `${location.accuracyM} m`}` : ""}
            </span>
            <span className="block text-[11px] text-muted">{location.mode === "device" ? "Following your device location (GPS)" : "Chosen by you — GPS won't change it"}</span>
          </span>
        </div>
      ) : null}

      {exactNames === false ? (
        <p className="mb-3 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12px] leading-snug text-amber-900 ring-1 ring-amber-200">
          Exact place names and street search are unavailable right now, so we show your GPS coordinates with the nearest major city. Distances still use your exact position.
        </p>
      ) : null}
      <PlaceSearch onPick={pick} near={location} autoFocus />

      <button
        type="button"
        onClick={() => void locateMe()}
        disabled={locating}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-3.5 text-left ring-1 ring-brand-100 transition hover:ring-brand-300 disabled:opacity-70"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow">
          {locating ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
        </span>
        <span>
          <span className="block text-[14px] font-semibold text-brand-800">{locating ? "Finding you…" : "Use my current location"}</span>
          <span className="block text-[12px] text-muted">{permissionStatus === "denied" ? "Location is blocked for this site — allow it in your browser settings." : "Follows you as you move. Your browser asks for permission."}</span>
        </span>
      </button>
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}

      <div className="mt-5">
        <p className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Search distance</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Search distance">
          {RADIUS_OPTIONS.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={radiusKm === option} onClick={() => setRadius(option)} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition", radiusKm === option ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-brand-300")}>
              {option} km
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 mb-2 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Popular cities</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {popular.map((city) => {
          const activeCity = location?.mode === "manual" && location.city === city.city && !location.locality;
          return (
            <button
              key={city.city}
              type="button"
              onClick={() => pick(cityPlace(city))}
              className={cn("rounded-2xl px-3 py-2.5 text-left text-[14px] font-semibold ring-1 transition", activeCity ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-brand-300")}
            >
              <span className="flex items-center justify-between gap-1">{city.city}{activeCity ? <Check size={14} /> : null}</span>
              <span className={cn("block text-[11px] font-medium", activeCity ? "text-white/60" : "text-muted")}>{city.state}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * Mounted once: asks for location on a first visit (falls back to the picker), keeps the browser's
 * permission status current, and in device mode follows meaningful GPS movement while the tab is
 * visible. Manual locations are never moved.
 */
export function LocationBootstrap() {
  const { pathname } = useRouterLocation();
  const { location, asked, detect, openPicker, devicePosition, setPermission, refreshName } = useLocation();
  const approximate = Boolean(location?.approximate);

  // A nearest-city guess gets its real name as soon as exact names are available.
  useEffect(() => {
    if (!approximate) return;
    void placeNamesAvailable().then((ok) => (ok ? refreshName() : undefined));
  }, [approximate, refreshName]);
  const panel = /^\/(admin|partner|showroom)/.test(pathname);
  const deviceMode = location?.mode === "device";

  useEffect(() => {
    if (!("permissions" in navigator) || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const update = () => status && setPermission(status.state as "granted" | "denied" | "prompt");
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        status = result;
        update();
        result.addEventListener("change", update);
      })
      .catch(() => undefined);
    return () => status?.removeEventListener("change", update);
  }, [setPermission]);

  useEffect(() => {
    if (location || asked || panel) return;
    // Wait until the preloader has faded so the permission prompt has context.
    const timer = window.setTimeout(() => {
      void detect().then((ok) => {
        if (!ok) openPicker(true);
      });
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [location, asked, panel, detect, openPicker]);

  useEffect(() => {
    if (!deviceMode || !("geolocation" in navigator)) return;
    let watch: number | null = null;
    const start = () => {
      if (watch !== null || document.visibilityState !== "visible") return;
      watch = navigator.geolocation.watchPosition(
        (position) => devicePosition({ lat: position.coords.latitude, lng: position.coords.longitude, accuracyM: position.coords.accuracy }),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) setPermission("denied");
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 },
      );
    };
    const stop = () => {
      if (watch !== null) navigator.geolocation.clearWatch(watch);
      watch = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [deviceMode, devicePosition, setPermission]);

  return <LocationPicker />;
}
