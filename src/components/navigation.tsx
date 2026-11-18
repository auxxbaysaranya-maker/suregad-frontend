import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";

const positions = new Map<string, number>();

/**
 * New pages open at the top. Going back (browser or Back button) returns to where you were,
 * retrying briefly while the previous page's data renders.
 */
export function ScrollManager() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);
  useEffect(() => {
    const key = location.key;
    const save = () => positions.set(key, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [location.key]);
  useLayoutEffect(() => {
    // In-page anchors (#reviews) scroll to their section instead of the top.
    if (location.hash) {
      const element = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    const target = type === "POP" ? positions.get(location.key) ?? 0 : 0;
    let frame = 0;
    let tries = 0;
    const jump = () => {
      window.scrollTo({ top: target, left: 0, behavior: "instant" as ScrollBehavior });
      // The page may still be loading; keep trying until it is tall enough (about one second).
      if (Math.abs(window.scrollY - target) > 2 && tries++ < 60) frame = requestAnimationFrame(jump);
    };
    jump();
    return () => cancelAnimationFrame(frame);
  }, [location.key, location.hash, type]);
  return null;
}

/** Goes to the previous in-app page, or to `fallback` when the page was opened directly. */
export function BackButton({ fallback = "/", label = "Back", className, variant = "pill" }: { fallback?: string; label?: string; className?: string; variant?: "pill" | "icon" }) {
  const navigate = useNavigate();
  const go = () => {
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) navigate(-1);
    else navigate(fallback);
  };
  if (variant === "icon") {
    return (
      <button type="button" onClick={go} aria-label={label} className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-card ring-1 ring-line transition hover:bg-ink hover:text-white", className)}>
        <ArrowLeft size={19} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={go}
      className={cn("group inline-flex items-center gap-2 rounded-full bg-white py-1.5 pr-4 pl-1.5 text-[13px] font-semibold text-ink shadow-card ring-1 ring-line transition hover:ring-brand-300", className)}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-canvas transition group-hover:bg-ink group-hover:text-white">
        <ArrowLeft size={15} />
      </span>
      {label}
    </button>
  );
}
