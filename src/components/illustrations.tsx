import { useId } from "react";
import { cn } from "../lib/utils";

type Palette = "brand" | "violet" | "azure" | "night";

const screens: Record<Palette, [string, string, string]> = {
  brand: ["#0a52e3", "#4c3fe0", "#c065e6"],
  violet: ["#5b2fd0", "#8a49e4", "#e08ad6"],
  azure: ["#0a52e3", "#2d7cf0", "#7fd1ff"],
  night: ["#151a52", "#3a3fe0", "#8a76f4"],
};

/** Front view of a phone with a gradient wallpaper. Used when a listing has no photo. */
export function PhoneArt({ className, palette = "brand" }: { className?: string; palette?: Palette }) {
  const id = useId();
  const [a, b, c] = screens[palette];
  return (
    <svg viewBox="0 0 120 230" className={cn("drop-shadow-[0_18px_30px_rgba(28,30,98,0.28)]", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2b4d" />
          <stop offset="0.5" stopColor="#0e0f2c" />
          <stop offset="1" stopColor="#3a3b63" />
        </linearGradient>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.55" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.25" cy="0.2" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="9" y="9" width="102" height="212" rx="17" />
        </clipPath>
      </defs>
      <rect x="2" y="2" width="116" height="226" rx="24" fill={`url(#${id}-frame)`} />
      <rect x="9" y="9" width="102" height="212" rx="17" fill={`url(#${id}-screen)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx="24" cy="40" r="70" fill={`url(#${id}-glow)`} />
        <ellipse cx="60" cy="150" rx="78" ry="26" transform="rotate(-24 60 150)" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.4" />
        <ellipse cx="60" cy="150" rx="58" ry="18" transform="rotate(-24 60 150)" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
        <rect x="22" y="44" width="36" height="5" rx="2.5" fill="#fff" fillOpacity="0.85" />
        <rect x="22" y="54" width="54" height="9" rx="3" fill="#fff" fillOpacity="0.95" />
        <g fill="#fff" fillOpacity="0.22">
          <rect x="22" y="182" width="16" height="16" rx="5" />
          <rect x="43" y="182" width="16" height="16" rx="5" />
          <rect x="64" y="182" width="16" height="16" rx="5" />
          <rect x="85" y="182" width="16" height="16" rx="5" />
        </g>
      </g>
      <rect x="45" y="15" width="30" height="8" rx="4" fill="#0e0f2c" />
      <path d="M118 62v22M2 58v14M2 78v14" stroke="#4a4b72" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Laptop with a gradient screen. The lid tilts slightly when an ancestor with `group` is hovered. */
export function LaptopArt({ className, palette = "violet" }: { className?: string; palette?: Palette }) {
  const id = useId();
  const [a, b, c] = screens[palette];
  return (
    <svg viewBox="0 0 260 170" className={cn("drop-shadow-[0_22px_30px_rgba(28,30,98,0.25)]", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.6" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7e5f2" />
          <stop offset="1" stopColor="#b9b6cf" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2b4d" />
          <stop offset="1" stopColor="#0e0f2c" />
        </linearGradient>
      </defs>
      <g className="origin-[130px_142px] transition-transform duration-700 ease-out group-hover:[transform:perspective(600px)_rotateX(-6deg)]">
        <rect x="38" y="6" width="184" height="136" rx="10" fill={`url(#${id}-lid)`} />
        <rect x="45" y="13" width="170" height="120" rx="5" fill={`url(#${id}-screen)`} />
        <ellipse cx="130" cy="92" rx="96" ry="26" transform="rotate(-14 130 92)" fill="none" stroke="#fff" strokeOpacity="0.32" strokeWidth="1.4" />
        <rect x="58" y="30" width="58" height="7" rx="3.5" fill="#fff" fillOpacity="0.9" />
        <rect x="58" y="42" width="38" height="5" rx="2.5" fill="#fff" fillOpacity="0.6" />
        <g fill="#fff" fillOpacity="0.2">
          <rect x="58" y="100" width="44" height="22" rx="5" />
          <rect x="108" y="100" width="44" height="22" rx="5" />
          <rect x="158" y="100" width="44" height="22" rx="5" />
        </g>
        <circle cx="130" cy="9.5" r="1.6" fill="#4a4b72" />
      </g>
      <path d="M10 146h240l-14 14a10 10 0 0 1-7 3H31a10 10 0 0 1-7-3z" fill={`url(#${id}-base)`} />
      <rect x="108" y="146" width="44" height="4" rx="2" fill="#9b98b6" />
    </svg>
  );
}

/** Small device glyph used inside product image wells when no photo exists. */
export function DeviceFallback({ laptop = false, className }: { laptop?: boolean; className?: string }) {
  return laptop ? <LaptopArt className={cn("w-[72%]", className)} palette="night" /> : <PhoneArt className={cn("h-[72%]", className)} palette="brand" />;
}
