import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Horizontal snap-scrolling track with arrow buttons.
 * With `autoPlay` it advances one card at a time and loops; it pauses while hovered,
 * focused or touched, when the tab is hidden, and for reduced-motion users.
 */
export function Scroller({
  children,
  itemClassName,
  autoPlay,
  label,
  className,
}: {
  children: ReactNode;
  itemClassName?: string;
  autoPlay?: number;
  label?: string;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [edges, setEdges] = useState({ start: true, end: false });
  const paused = useRef(false);
  const resumeTimer = useRef<number>(undefined);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);
  const count = Children.count(children);
  useEffect(measure, [measure, count]);

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 0;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.offsetWidth + gap;
  }, []);

  function scroll(direction: 1 | -1, page = true) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * (page ? Math.max(step(), el.clientWidth * 0.85) : step()), behavior: "smooth" });
  }

  // Advance one card every `autoPlay` ms and loop back at the end.
  // Reduced-motion users still get the advance, just without the glide.
  useEffect(() => {
    if (!autoPlay) return;
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || paused.current || document.visibilityState !== "visible") return;
      if (el.scrollWidth <= el.clientWidth + 8) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior });
      else el.scrollTo({ left: el.scrollLeft + step(), behavior });
    }, autoPlay);
    return () => window.clearInterval(timer);
  }, [autoPlay, reduced, step]);

  function pause() {
    paused.current = true;
    window.clearTimeout(resumeTimer.current);
  }
  function resume(delay = 0) {
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      paused.current = false;
    }, delay);
  }
  useEffect(() => () => window.clearTimeout(resumeTimer.current), []);

  return (
    <div
      className={cn("relative", className)}
      onPointerEnter={(event) => event.pointerType === "mouse" && pause()}
      onPointerLeave={(event) => event.pointerType === "mouse" && resume()}
      onTouchStart={pause}
      onTouchEnd={() => resume(5000)}
      onFocusCapture={pause}
      onBlurCapture={() => resume(1500)}
    >
      <div
        ref={track}
        onScroll={measure}
        role="region"
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pt-1 pb-6 sm:gap-6"
      >
        {Children.map(children, (child) => (
          <div className={cn("shrink-0 snap-start", itemClassName)}>{child}</div>
        ))}
      </div>
      {[-1, 1].map((direction) => {
        const hidden = direction === -1 ? edges.start : edges.end;
        return (
          <button
            key={direction}
            type="button"
            aria-label={direction === -1 ? "Scroll left" : "Scroll right"}
            onClick={() => scroll(direction as 1 | -1)}
            className={cn(
              "absolute top-[40%] z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-lift ring-1 ring-line transition hover:bg-ink hover:text-white lg:grid",
              direction === -1 ? "-left-5" : "-right-5",
              hidden && "pointer-events-none scale-75 opacity-0",
            )}
          >
            {direction === -1 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        );
      })}
    </div>
  );
}
