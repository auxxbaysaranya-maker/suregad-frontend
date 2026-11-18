import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/utils";
import { assetUrl } from "../lib/config";

/** Full wordmark — the S mark with "ure Gad". Height drives size. */
export function Logo({ className }: { className?: string }) {
  return <img src={assetUrl("brand/logo.png")} alt="SureGad" width={600} height={208} className={cn("h-9 w-auto select-none", className)} draggable={false} />;
}

/** The S / phone mark on its own. */
export function Mark({ className }: { className?: string }) {
  return <img src={assetUrl("brand/mark.png")} alt="" width={512} height={512} className={cn("h-10 w-10 select-none", className)} draggable={false} />;
}

/** The orbit swoosh from the logo, as a decorative ring. */
export function OrbitRing({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a52e3" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#6a2fd0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#c065e6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="100" rx="96" ry="38" transform="rotate(-24 100 100)" stroke={`url(#${id}-g)`} strokeWidth={strokeWidth} />
      <circle cx="187" cy="64" r="3.2" fill="#c065e6" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: { to: string; label: string };
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={cn("mb-2 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] uppercase", dark ? "text-brand-200" : "text-brand-600")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-orchid" : "bg-brand-gradient")} />
            {eyebrow}
          </p>
        ) : null}
        <h2 className={cn("text-[clamp(26px,3.4vw,40px)]", dark ? "text-white" : "text-ink")}>{title}</h2>
        {body ? <p className={cn("mt-2 max-w-xl text-[15px]", dark ? "text-white/70" : "text-muted")}>{body}</p> : null}
      </div>
      {action ? (
        <Link
          to={action.to}
          className={cn(
            "group inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
            dark ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-ink shadow-card ring-1 ring-line hover:ring-brand-300",
          )}
        >
          {action.label}
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}
