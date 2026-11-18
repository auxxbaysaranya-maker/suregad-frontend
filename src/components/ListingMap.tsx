import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Navigation } from "lucide-react";
import { distanceKm, formatDistance } from "../lib/cities";
import { useLocation } from "../store/location";

/**
 * Approximate listing location: a pin plus a ~1.5 km area, like OLX.
 * Coordinates arrive from the API already rounded to about 1 km.
 */
export function ListingMap({ lat, lng, label, cityCentre = false, note, exact = false }: { lat: number; lng: number; label: string; cityCentre?: boolean; note?: string; exact?: boolean }) {
  const element = useRef<HTMLDivElement>(null);
  const userLocation = useLocation((state) => state.location);
  useEffect(() => {
    if (!element.current) return;
    const map = L.map(element.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView([lat, lng], exact ? 15 : cityCentre ? 12 : 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    if (!exact) L.circle([lat, lng], { radius: 1500, color: "#3a3fe0", weight: 1.5, fillColor: "#5d55ea", fillOpacity: 0.14 }).addTo(map);
    const pin = L.divIcon({
      className: "",
      iconSize: [44, 52],
      iconAnchor: [22, 50],
      html: `<div style="position:relative;width:44px;height:52px">
        <span style="position:absolute;left:50%;bottom:0;width:18px;height:6px;margin-left:-9px;border-radius:50%;background:rgba(16,17,55,.25);filter:blur(2px)"></span>
        <span style="position:absolute;left:4px;top:0;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#0a52e3,#6a2fd0 70%,#c065e6);box-shadow:0 8px 20px -6px rgba(58,63,224,.7);border:3px solid #fff"></span>
        <span style="position:absolute;left:16px;top:12px;width:12px;height:12px;border-radius:50%;background:#fff"></span>
      </div>`,
    });
    L.marker([lat, lng], { icon: pin, keyboard: false }).addTo(map);
    return () => {
      map.remove();
    };
  }, [lat, lng, cityCentre, exact]);
  const away = userLocation ? distanceKm(userLocation, { lat, lng }) : null;
  return (
    <div className="overflow-hidden rounded-[26px] bg-white ring-1 ring-line">
      <div ref={element} className="relative z-0 h-[260px] w-full bg-brand-50" role="img" aria-label={`Map showing the approximate area of ${label}`} />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-semibold text-ink">{label}</p>
          <p className="text-[13px] text-muted">
            {note || (cityCentre ? "City centre shown; the seller didn't pin an area" : "Approximate area shown for the seller's privacy")}
            {away !== null ? ` · ${formatDistance(away)} from ${userLocation!.city}` : ""}
          </p>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-line transition hover:ring-brand-300"
        >
          <Navigation size={14} /> Directions
        </a>
      </div>
    </div>
  );
}
