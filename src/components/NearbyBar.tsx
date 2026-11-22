import { Link } from "react-router-dom";
import { MapPin, Navigation, Store, Wrench } from "lucide-react";
import { RADIUS_OPTIONS, useLocation } from "../store/location";
import { cn } from "../lib/utils";

/**
 * Shows which area the page is showing, with a one-tap way to change place or distance.
 * `matched` is false when nothing was found within the radius and the page fell back to everywhere.
 */
export function NearbyBar({ matched = true, className, links = true }: { matched?: boolean; className?: string; links?: boolean }) {
  const location = useLocation((state) => state.location);
  const radiusKm = useLocation((state) => state.radiusKm);
  const setRadius = useLocation((state) => state.setRadius);
  const openPicker = useLocation((state) => state.openPicker);
  const wider = RADIUS_OPTIONS.find((option) => option > radiusKm);

  if (!location) {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-[22px] bg-white p-3.5 ring-1 ring-line", className)}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MapPin size={19} /></span>
        <p className="min-w-[180px] flex-1 text-[14px]"><span className="font-semibold">Set your location</span> to see devices, sellers and inspection partners near you.</p>
        <button type="button" onClick={() => openPicker(true)} className="h-10 rounded-full bg-brand-gradient px-5 text-[13px] font-semibold text-white shadow-glow">Choose location</button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[22px] bg-white p-3.5 ring-1 ring-line", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">{location.mode === "device" ? <Navigation size={18} /> : <MapPin size={19} />}</span>
        <div className="min-w-[160px] flex-1">
          <p className="text-[14px] font-semibold">
            {matched ? "Near" : "Nothing listed near"} <button type="button" onClick={() => openPicker(true)} className="text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-500">{location.city || location.label}</button>
          </p>
          <p className="text-[12px] text-muted">{matched ? `Within ${radiusKm} km · nearest first` : `No listings within ${radiusKm} km yet — showing devices from everywhere.`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Search distance">
          {RADIUS_OPTIONS.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={radiusKm === option} onClick={() => setRadius(option)} className={cn("h-8 rounded-full px-3 text-[12px] font-semibold ring-1 transition", radiusKm === option ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-brand-300", option > 50 && "hidden sm:inline-flex sm:items-center")}>
              {option} km
            </button>
          ))}
        </div>
      </div>
      {!matched && wider ? (
        <button type="button" onClick={() => setRadius(wider)} className="mt-3 h-9 rounded-full bg-brand-50 px-4 text-[13px] font-semibold text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100">Search within {wider} km instead</button>
      ) : null}
      {links ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/sellers" className="flex items-center justify-center gap-2 rounded-full bg-canvas py-2.5 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300"><Store size={15} /> Sellers nearby</Link>
          <Link to="/partners" className="flex items-center justify-center gap-2 rounded-full bg-canvas py-2.5 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300"><Wrench size={15} /> Inspection partners</Link>
        </div>
      ) : null}
    </div>
  );
}
