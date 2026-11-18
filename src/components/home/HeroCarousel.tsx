import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Store } from "lucide-react";
import type { Listing } from "../ProductCard";
import { LaptopArt, PhoneArt } from "../illustrations";
import { Mark, OrbitRing } from "../brand";
import { cn, money, titleCase } from "../../lib/utils";

export interface Banner {
  title: string;
  body: string;
  to: string;
}

type Visual = "phone" | "report" | "laptop";

const themes: { gradient: string; glow: string; eyebrow: string; visual: Visual }[] = [
  { gradient: "from-[#0a3fd0] via-[#3a3fe0] to-[#6a2fd0]", glow: "bg-[#7fb0ff]", eyebrow: "Used & refurbished", visual: "phone" },
  { gradient: "from-[#2b1690] via-[#6a2fd0] to-[#c065e6]", glow: "bg-[#ff9be9]", eyebrow: "Inspection reports", visual: "report" },
  { gradient: "from-[#0e0f2c] via-[#1c1e62] to-[#0a52e3]", glow: "bg-[#5d55ea]", eyebrow: "Sell on SureGad", visual: "laptop" },
];

const DURATION = 6.5;

function ctaFor(to: string) {
  if (to.includes("inspected")) return "Browse inspected";
  if (to.includes("seller")) return "Start selling";
  return "Shop now";
}

const content = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.25 } },
};
const line = {
  hidden: { opacity: 0, y: 26, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const } },
};

function GlassChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl bg-white/14 px-3.5 py-2.5 text-[13px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/25 backdrop-blur-md", className)}>{children}</div>;
}

function PhoneVisual({ product }: { product?: Listing }) {
  const image = product?.images?.[0]?.url;
  return (
    <div className="relative grid h-full place-items-center">
      <OrbitRing className="absolute h-[125%] w-[125%] animate-orbit opacity-80 [animation-duration:28s]" strokeWidth={1.2} />
      <div className="absolute h-56 w-56 rounded-full bg-white/20 blur-3xl" />
      {image ? (
        <div className="relative grid h-[300px] w-[300px] place-items-center rounded-[40px] bg-white/12 ring-1 ring-white/25 backdrop-blur-sm">
          <img src={image} alt="" className="max-h-[82%] max-w-[82%] animate-float rounded-2xl object-contain shadow-[0_30px_40px_-10px_rgba(0,0,0,0.4)]" />
        </div>
      ) : (
        <div className="relative flex items-end">
          <PhoneArt className="relative z-10 h-[300px] animate-float [--float-rotate:-8deg]" palette="azure" />
          <PhoneArt className="-ml-16 h-[250px] animate-float opacity-90 [--float-rotate:10deg] [animation-delay:-2s]" palette="violet" />
        </div>
      )}
      <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 }} className="absolute top-6 -right-2">
        <GlassChip>
          {product ? (
            <span className="block max-w-[180px]">
              <span className="block truncate text-white/75">{product.title}</span>
              <span className="font-display text-lg font-bold">{money(product.pricePaise)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles size={15} /> Phones & laptops</span>
          )}
        </GlassChip>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="absolute bottom-10 -left-2">
        <GlassChip className="flex items-center gap-2">
          {product?.inspection?.inspected ? <ShieldCheck size={16} /> : <Check size={16} />}
          {product ? `${titleCase(product.condition)} · ${product.sellerType === "business" ? "Refurbished" : "Used"}` : "Graded by condition"}
        </GlassChip>
      </motion.div>
    </div>
  );
}

function ReportVisual({ checks }: { checks: string[] }) {
  const rows = checks.slice(0, 5);
  return (
    <div className="relative grid h-full place-items-center">
      <div className="absolute h-64 w-64 rounded-full bg-white/25 blur-3xl" />
      <motion.div
        initial={{ rotate: -6, y: 20, opacity: 0 }}
        animate={{ rotate: -3, y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[300px] rounded-[28px] bg-white/95 p-5 text-ink shadow-[0_40px_80px_-24px_rgba(20,10,60,0.55)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mark className="h-8 w-8" />
            <div>
              <p className="font-display text-[15px] leading-tight font-bold">Inspection report</p>
              <p className="text-[11px] text-muted">Partner visit · checklist</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">On listing</span>
        </div>
        <ul className="mt-4 space-y-2">
          {rows.map((label, index) => (
            <motion.li
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + index * 0.12 }}
              className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-[13px]"
            >
              <span className="font-medium">{label}</span>
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55 + index * 0.12, type: "spring", stiffness: 500, damping: 18 }} className="grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white">
                <Check size={12} strokeWidth={3} />
              </motion.span>
            </motion.li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-4 text-muted">Critical failures stay visible on the report even when the score is high.</p>
      </motion.div>
    </div>
  );
}

function LaptopVisual({ product }: { product?: Listing }) {
  const image = product?.images?.[0]?.url;
  return (
    <div className="group relative grid h-full place-items-center">
      <div className="absolute h-60 w-72 rounded-full bg-[#5d55ea]/50 blur-3xl" />
      {image ? (
        <img src={image} alt="" className="relative max-h-[280px] w-[88%] animate-float object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)]" />
      ) : (
        <LaptopArt className="relative w-[92%] max-w-[380px] animate-float" palette="brand" />
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="absolute top-8 left-0">
        <GlassChip className="flex items-center gap-2"><Store size={15} /> Showrooms need approval</GlassChip>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="absolute right-0 bottom-8">
        <GlassChip>
          <span className="block text-white/75">Your device, your price</span>
          <span className="font-display text-[15px] font-bold">List from your account</span>
        </GlassChip>
      </motion.div>
    </div>
  );
}

export function HeroCarousel({ banners, products, checks }: { banners: Banner[]; products: (Listing | undefined)[]; checks: string[] }) {
  const reduced = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const go = useCallback((next: number) => setSlide(((next % count) + count) % count), [count]);
  useEffect(() => {
    if (slide >= count) setSlide(0);
  }, [count, slide]);
  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -70) go(slide + 1);
    else if (info.offset.x > 70) go(slide - 1);
  }
  const banner = banners[slide] || banners[0];
  if (!banner) return null;
  const theme = themes[slide % themes.length];
  return (
    <div
      className="relative isolate min-h-[560px] overflow-hidden rounded-[32px] text-white shadow-[0_40px_80px_-40px_rgba(28,30,98,0.6)] md:min-h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={`bg-${slide}`}
          className={cn("absolute inset-0 -z-10 bg-gradient-to-br", theme.gradient)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className={cn("absolute -top-24 -left-20 h-80 w-80 animate-aurora rounded-full opacity-50 blur-[90px] transition-colors duration-1000", theme.glow)} />
        <div className="absolute -right-24 -bottom-32 h-96 w-96 animate-aurora rounded-full bg-orchid/40 blur-[110px] [animation-delay:-6s]" />
        <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(70%_70%_at_70%_40%,#000,transparent)]" />
      </div>

      <motion.div
        drag={reduced ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={onDragEnd}
        className="grid h-full min-h-[inherit] cursor-grab gap-6 p-7 pb-24 active:cursor-grabbing md:grid-cols-[1.05fr_0.95fr] md:p-12 md:pb-24"
      >
        <AnimatePresence mode="wait">
          <motion.div key={`copy-${slide}`} variants={content} initial="hidden" animate="show" exit="exit" className="flex flex-col justify-center">
            <motion.p variants={line} className="inline-flex w-fit items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-[12px] font-semibold tracking-wide ring-1 ring-white/25 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-white" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {theme.eyebrow}
            </motion.p>
            <motion.h1 variants={line} className="mt-5 max-w-xl text-[clamp(36px,5.2vw,64px)] leading-[1.02] font-extrabold tracking-[-0.035em]">
              {banner.title}
            </motion.h1>
            <motion.p variants={line} className="mt-4 max-w-md text-[16px] leading-relaxed text-white/80">
              {banner.body}
            </motion.p>
            <motion.div variants={line} className="mt-8 flex flex-wrap gap-3">
              <Link
                to={banner.to}
                draggable={false}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-[0_14px_30px_-10px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5"
              >
                {ctaFor(banner.to)}
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-gradient text-white transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight size={14} />
                </span>
              </Link>
              <Link to="/how-it-works" draggable={false} className="inline-flex items-center rounded-full px-5 py-3.5 text-[15px] font-semibold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/10">
                How it works
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        <div className="relative hidden min-h-[340px] md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={`visual-${slide}`}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {theme.visual === "phone" ? <PhoneVisual product={products[0]} /> : theme.visual === "report" ? <ReportVisual checks={checks} /> : <LaptopVisual product={products[1]} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="absolute inset-x-7 bottom-7 flex items-center justify-between gap-4 md:inset-x-12">
        <div className="flex items-center gap-2">
          {banners.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => go(index)}
              aria-label={`Show slide ${index + 1}: ${item.title}`}
              aria-current={index === slide}
              className={cn("relative h-1.5 overflow-hidden rounded-full bg-white/25 transition-all duration-500", index === slide ? "w-14" : "w-6 hover:bg-white/45")}
            >
              {index === slide ? (
                reduced ? (
                  <span className="absolute inset-0 bg-white" />
                ) : (
                  <span
                    key={`progress-${slide}`}
                    className="absolute inset-0 origin-left animate-progress bg-white"
                    style={{ ["--progress-duration" as string]: `${DURATION}s`, animationPlayState: paused ? "paused" : "running" }}
                    onAnimationEnd={() => go(slide + 1)}
                  />
                )
              ) : null}
            </button>
          ))}
          <span className="ml-2 font-display text-[13px] font-semibold text-white/70 tabular-nums">
            {String(slide + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>
        <div className="flex gap-2">
          {[-1, 1].map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => go(slide + direction)}
              aria-label={direction === -1 ? "Previous slide" : "Next slide"}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/12 ring-1 ring-white/30 backdrop-blur transition hover:bg-white hover:text-ink"
            >
              {direction === -1 ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
