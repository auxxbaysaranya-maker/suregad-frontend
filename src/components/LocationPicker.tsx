import { useEffect, useMemo, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import { Check, ChevronDown, Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { CITIES } from "../lib/cities";
import { useLocation } from "../store/location";
import { cn } from "../lib/utils";
import { Modal } from "./Modal";

/** Nav-bar chip showing the chosen location; opens the picker. */
export function LocationChip({ className, compact = false }: { className?: string; compact?: boolean }) {
  const location = useLocation((state) => state.location);
  const openPicker = useLocation((state) => state.openPicker);
  const locating = useLocation((state) => state.locating);
  return (
    <button
      type="button"
      onClick={() => openPicker(true)}
      className={cn("group flex min-w-0 items-center gap-1.5 rounded-full text-left transition hover:bg-brand-50", compact ? "px-2 py-1.5" : "px-3 py-2", className)}
      aria-label={location ? `Location: ${location.city}. Change location` : "Choose your location"}
    >
      <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-white">
        {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
      </span>
      <span className="min-w-0">
        {!compact ? <span className="block text-[11px] leading-none text-muted">{location ? "Your location" : "Set location"}</span> : null}
        <span className="flex items-center gap-0.5 text-[13px] leading-tight font-semibold text-ink">
          <span className="truncate">{location ? location.city : "Choose city"}</span>
          <ChevronDown size={14} className="shrink-0 text-muted transition group-hover:translate-y-0.5" />
        </span>
      </span>
    </button>
  );
}

export function LocationPicker() {
  const { location, pickerOpen, openPicker, set, detect, locating, error } = useLocation();
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!pickerOpen) setQuery("");
  }, [pickerOpen]);
  const results = useMemo(() => {
    const key = query.trim().toLowerCase();
    if (!key) return CITIES;
    return CITIES.filter((city) => `${city.city} ${city.state}`.toLowerCase().includes(key));
  }, [query]);
  const popular = CITIES.filter((city) => city.popular);
  async function useCurrent() {
    if (await detect()) openPicker(false);
  }
  return (
    <Modal open={pickerOpen} onOpenChange={openPicker} title="Choose your location" description="We use it to show how far listings are and to find devices near you." size="md">
      <button
        type="button"
        onClick={() => void useCurrent()}
        disabled={locating}
        className="flex w-full items-center gap-3 rounded-2xl bg-brand-50 p-4 text-left ring-1 ring-brand-100 transition hover:ring-brand-300 disabled:opacity-70"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow">
          {locating ? <Loader2 size={20} className="animate-spin" /> : <Crosshair size={20} />}
        </span>
        <span>
          <span className="block font-semibold text-brand-800">{locating ? "Finding you…" : "Use current location"}</span>
          <span className="block text-[13px] text-muted">Your browser will ask for permission.</span>
        </span>
      </button>
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}

      <div className="relative mt-4">
        <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search city or state"
          aria-label="Search city"
          className="w-full rounded-full bg-canvas py-3 pr-4 pl-11 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {!query ? (
        <>
          <p className="mt-5 mb-2 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">Popular cities</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {popular.map((city) => {
              const active = location?.city === city.city;
              return (
                <button
                  key={city.city}
                  type="button"
                  onClick={() => {
                    set({ city: city.city, state: city.state, lat: city.lat, lng: city.lng, source: "manual" });
                    openPicker(false);
                  }}
                  className={cn("rounded-2xl px-3 py-2.5 text-left text-[14px] font-semibold ring-1 transition", active ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line hover:ring-brand-300")}
                >
                  {city.city}
                  <span className={cn("block text-[11px] font-medium", active ? "text-white/60" : "text-muted")}>{city.state}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 mb-1 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">All cities</p>
        </>
      ) : null}
      <ul className="divide-y divide-line">
        {results.map((city) => (
          <li key={`${city.city}-${city.state}`}>
            <button
              type="button"
              onClick={() => {
                set({ city: city.city, state: city.state, lat: city.lat, lng: city.lng, source: "manual" });
                openPicker(false);
              }}
              className="flex w-full items-center justify-between gap-3 py-3 text-left text-[14px] hover:text-brand-700"
            >
              <span className="flex items-center gap-2.5"><MapPin size={15} className="text-muted" /> {city.city}<span className="text-muted">· {city.state}</span></span>
              {location?.city === city.city ? <Check size={16} className="text-brand-600" /> : null}
            </button>
          </li>
        ))}
        {!results.length ? <li className="py-6 text-center text-[14px] text-muted">No matching city. Try a nearby larger city.</li> : null}
      </ul>
    </Modal>
  );
}

/** On a first visit, ask the browser for location; fall back to the picker if that fails. */
export function LocationBootstrap() {
  const { pathname } = useRouterLocation();
  const { location, asked, detect, openPicker } = useLocation();
  const panel = /^\/(admin|partner|showroom)/.test(pathname);
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
  return <LocationPicker />;
}
