import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "../lib/utils";
import { DeviceFallback } from "./illustrations";

interface GalleryImage {
  url?: string;
}

/** Tracks which slide of a horizontal snap-scroller is in view, and scrolls to a slide. */
function useSnapScroller(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / el.clientWidth))));
  }, [count]);
  const goTo = useCallback(
    (next: number, smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const target = (next + count) % count;
      el.scrollTo({ left: target * el.clientWidth, behavior: smooth ? "smooth" : ("instant" as ScrollBehavior) });
      setIndex(target);
    },
    [count],
  );
  return { ref, index, onScroll, goTo };
}

function ArrowButton({ direction, onClick, className, dark = false }: { direction: -1 | 1; onClick: () => void; className?: string; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={direction === -1 ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full transition",
        dark ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white hover:text-ink" : "bg-white/90 text-ink shadow-lift ring-1 ring-line hover:bg-ink hover:text-white",
        direction === -1 ? "left-3" : "right-3",
        className,
      )}
    >
      {direction === -1 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}

/** Full-screen photo viewer: swipe or arrow keys between photos, double-tap or the zoom button to zoom, Esc or ✕ to close. */
function Lightbox({ images, title, open, start, onClose }: { images: string[]; title: string; open: boolean; start: number; onClose: () => void }) {
  const { ref, index, onScroll, goTo } = useSnapScroller(images.length);
  const [zoomed, setZoomed] = useState(false);
  const zoomBox = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  // Jump straight to the photo that was tapped.
  useLayoutEffect(() => {
    if (!open) return;
    setZoomed(false);
    const frame = requestAnimationFrame(() => goTo(start, false));
    return () => cancelAnimationFrame(frame);
  }, [open, start, goTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") { setZoomed(false); goTo(index + 1); }
      if (event.key === "ArrowLeft") { setZoomed(false); goTo(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, goTo]);

  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  function toggleZoom(point?: { x: number; y: number }) {
    const next = !zoomed;
    setZoomed(next);
    if (next) {
      // Centre the zoomed view on the point that was tapped.
      requestAnimationFrame(() => {
        const box = zoomBox.current;
        if (!box) return;
        const fx = point ? point.x : 0.5;
        const fy = point ? point.y : 0.5;
        box.scrollTo({ left: box.scrollWidth * fx - box.clientWidth / 2, top: box.scrollHeight * fy - box.clientHeight / 2 });
      });
    }
  }

  const lastTap = useRef(0);
  function onImageTap(event: React.MouseEvent<HTMLElement>) {
    const now = Date.now();
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
    if (now - lastTap.current < 320) toggleZoom(point);
    lastTap.current = now;
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/95 data-[state=open]:animate-[fade-in_0.2s_ease]" />
        <Dialog.Content className="fixed inset-0 z-[81] flex flex-col bg-black text-white outline-none data-[state=open]:animate-[fade-in_0.2s_ease]">
          <Dialog.Title className="sr-only">{title} photos</Dialog.Title>
          <Dialog.Description className="sr-only">Swipe or use the arrow keys to see more photos. Double-tap to zoom.</Dialog.Description>
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{title}</p>
              <p className="text-[12px] text-white/60">{index + 1} of {images.length}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => toggleZoom()} aria-label={zoomed ? "Zoom out" : "Zoom in"} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition hover:bg-white hover:text-ink">
                {zoomed ? <ZoomOut size={19} /> : <ZoomIn size={19} />}
              </button>
              <Dialog.Close aria-label="Close photos" className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink transition hover:bg-white/80">
                <X size={21} />
              </Dialog.Close>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            <div ref={ref} onScroll={onScroll} className={cn("no-scrollbar flex h-full snap-x snap-mandatory", zoomed ? "overflow-hidden" : "overflow-x-auto")}>
              {images.map((url, slide) => (
                <div key={url + slide} className="relative h-full w-full shrink-0 snap-center">
                  {zoomed && slide === index ? (
                    <div ref={zoomBox} className="no-scrollbar h-full w-full cursor-zoom-out overflow-auto" onClick={onImageTap}>
                      <img src={url} alt="" className="max-w-none" style={{ width: "220%", height: "auto", margin: "auto", display: "block" }} draggable={false} />
                    </div>
                  ) : (
                    <div className="grid h-full w-full cursor-zoom-in place-items-center p-2 sm:p-6" onClick={onImageTap}>
                      <img src={url} alt={`${title}, photo ${slide + 1}`} className="max-h-full max-w-full object-contain select-none" draggable={false} loading={Math.abs(slide - index) <= 1 ? "eager" : "lazy"} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {images.length > 1 && !zoomed ? (
              <>
                <ArrowButton dark direction={-1} onClick={() => goTo(index - 1)} className="hidden sm:grid" />
                <ArrowButton dark direction={1} onClick={() => goTo(index + 1)} className="hidden sm:grid" />
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div ref={thumbs} className="no-scrollbar flex shrink-0 justify-start gap-2 overflow-x-auto px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:justify-center">
              {images.map((url, slide) => (
                <button
                  key={url + slide}
                  type="button"
                  onClick={() => { setZoomed(false); goTo(slide); }}
                  aria-label={`Photo ${slide + 1}`}
                  aria-current={slide === index}
                  className={cn("h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 transition sm:h-16 sm:w-16", slide === index ? "opacity-100 ring-white" : "opacity-50 ring-transparent hover:opacity-80")}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="h-6 shrink-0" />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Product photos: swipe (touch or trackpad), arrows, dots and thumbnails.
 * Tapping a photo or the expand button opens the full-screen viewer.
 */
export function ProductGallery({ images, title, laptop = false, badge }: { images: GalleryImage[]; title: string; laptop?: boolean; badge?: ReactNode }) {
  const urls = images.map((image) => image.url).filter((url): url is string => Boolean(url));
  const { ref, index, onScroll, goTo } = useSnapScroller(Math.max(urls.length, 1));
  const [viewer, setViewer] = useState<{ open: boolean; start: number }>({ open: false, start: 0 });
  const thumbs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  if (!urls.length) {
    return (
      <div className="relative grid aspect-[4/3.2] place-items-center overflow-hidden rounded-[30px] bg-[radial-gradient(120%_90%_at_30%_15%,#ffffff_0%,#f3f1ff_45%,#e5ddff_100%)] ring-1 ring-line">
        <DeviceFallback laptop={laptop} className="max-h-[70%]" />
        {badge ? <div className="absolute top-4 left-4">{badge}</div> : null}
        <p className="absolute bottom-4 rounded-full bg-white/80 px-3 py-1 text-[12px] text-muted">The seller hasn't added photos yet</p>
      </div>
    );
  }

  const open = (start: number) => setViewer({ open: true, start });
  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-[30px] bg-[radial-gradient(120%_90%_at_30%_15%,#ffffff_0%,#f3f1ff_45%,#e5ddff_100%)] ring-1 ring-line"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} photos`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(index + 1);
          if (event.key === "ArrowLeft") goTo(index - 1);
          if (event.key === "Enter") open(index);
        }}
      >
        <div ref={ref} onScroll={onScroll} className="no-scrollbar flex aspect-[4/3.2] snap-x snap-mandatory overflow-x-auto">
          {urls.map((url, slide) => (
            <button
              key={url + slide}
              type="button"
              onClick={() => open(slide)}
              aria-label={`Open photo ${slide + 1} of ${urls.length} full screen`}
              className="relative h-full w-full shrink-0 cursor-zoom-in snap-center"
            >
              <img
                src={url}
                alt={slide === 0 ? title : ""}
                loading={slide === 0 ? "eager" : "lazy"}
                draggable={false}
                className="absolute inset-0 m-auto h-[86%] w-[86%] object-contain transition duration-500 select-none group-hover:scale-[1.02]"
              />
            </button>
          ))}
        </div>

        {badge ? <div className="pointer-events-none absolute top-4 left-4">{badge}</div> : null}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {urls.length > 1 ? <span className="rounded-full bg-ink/75 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">{index + 1} / {urls.length}</span> : null}
          <button type="button" onClick={() => open(index)} aria-label="View photos full screen" className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-card ring-1 ring-line transition hover:bg-ink hover:text-white">
            <Maximize2 size={17} />
          </button>
        </div>

        {urls.length > 1 ? (
          <>
            <ArrowButton direction={-1} onClick={() => goTo(index - 1)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 max-sm:hidden" />
            <ArrowButton direction={1} onClick={() => goTo(index + 1)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 max-sm:hidden" />
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
              {urls.map((url, dot) => (
                <span key={url + dot} className={cn("h-1.5 rounded-full transition-all duration-300", dot === index ? "w-6 bg-ink" : "w-1.5 bg-ink/25")} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {urls.length > 1 ? (
        <div ref={thumbs} className="no-scrollbar relative mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, slide) => (
            <button
              key={url + slide}
              type="button"
              onClick={() => goTo(slide)}
              aria-label={`Show photo ${slide + 1}`}
              aria-current={slide === index}
              className={cn("grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 ring-2 transition", slide === index ? "ring-brand-500" : "ring-transparent opacity-75 hover:opacity-100 hover:ring-brand-200")}
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <Lightbox images={urls} title={title} open={viewer.open} start={viewer.start} onClose={() => setViewer((current) => ({ ...current, open: false }))} />
    </div>
  );
}
