import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { PhoneArt } from "../illustrations";
import { SectionHeading } from "../brand";
import { cn } from "../../lib/utils";

const grades = [
  { key: "like_new", name: "Like new", short: "Looks unused", body: "No marks you would notice in normal use. The grade describes cosmetics only." },
  { key: "excellent", name: "Excellent", short: "Light signs of use", body: "Faint marks that are easy to miss. Check the listing photos for close-ups." },
  { key: "good", name: "Good", short: "Visible wear", body: "Scratches or scuffs you can see at a glance. Read the listing before you buy." },
  { key: "fair", name: "Fair", short: "Clear wear", body: "Obvious marks, scuffs or dents. The grade is not a warranty." },
];

/** Scratch paths drawn over the phone screen; higher grades reveal more of them. */
const scratches = [
  "M30 70 l22 -9",
  "M78 150 l18 14",
  "M24 120 q14 -4 26 -14",
  "M70 52 l24 6",
  "M36 186 l30 -8",
  "M84 98 q-6 14 -20 22",
  "M20 160 l18 20",
  "M58 120 l34 -26",
  "M44 34 l-14 18",
];
const visibleScratches = [0, 2, 5, 9];

export function ConditionGuide() {
  const [index, setIndex] = useState(0);
  const grade = grades[index];
  return (
    <section className="py-10">
      <div className="overflow-hidden rounded-[36px] bg-white ring-1 ring-line">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <div className="p-6 sm:p-10">
            <SectionHeading eyebrow="Condition guide" title={<>Know the <span className="text-gradient">grade</span> before you buy</>} body="Sellers grade cosmetic condition. Tap a grade to see what it means." className="mb-7" />
            <div className="space-y-2" role="tablist" aria-label="Condition grades">
              {grades.map((item, itemIndex) => {
                const active = itemIndex === index;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setIndex(itemIndex)}
                    onMouseEnter={() => setIndex(itemIndex)}
                    className={cn("relative flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-left transition", active ? "text-white" : "hover:bg-canvas")}
                  >
                    {active ? <motion.span layoutId="grade-active" className="absolute inset-0 rounded-2xl bg-ink" transition={{ type: "spring", stiffness: 380, damping: 32 }} /> : null}
                    <span className="relative flex gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((bar) => (
                        <span key={bar} className={cn("h-5 w-1.5 rounded-full transition-colors", bar <= itemIndex ? (active ? "bg-orchid" : "bg-brand-400") : active ? "bg-white/20" : "bg-line")} />
                      ))}
                    </span>
                    <span className="relative flex-1">
                      <span className="block font-display text-[18px] font-bold">{item.name}</span>
                      <span className={cn("block text-[13px]", active ? "text-white/70" : "text-muted")}>{item.short}</span>
                    </span>
                    <ArrowRight size={18} className={cn("relative transition", active ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0")} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative isolate flex flex-col justify-between gap-6 overflow-hidden bg-[radial-gradient(110%_90%_at_50%_20%,#f3f0ff_0%,#e4dcff_60%,#d7ccff_100%)] p-6 sm:p-10">
            <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-3xl" />
            <div className="relative mx-auto h-[300px] w-[156px]">
              <PhoneArt className="h-full w-full" palette="night" />
              <svg viewBox="0 0 120 230" className="absolute inset-0 h-full w-full" aria-hidden="true">
                {scratches.map((path, scratch) => (
                  <motion.path
                    key={path}
                    d={path}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={1.3}
                    strokeLinecap="round"
                    initial={false}
                    animate={{ pathLength: scratch < visibleScratches[index] ? 1 : 0, opacity: scratch < visibleScratches[index] ? 0.75 : 0 }}
                    transition={{ duration: 0.5, delay: scratch * 0.04 }}
                  />
                ))}
              </svg>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={grade.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="rounded-3xl bg-white/80 p-5 shadow-card backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[24px]">{grade.name}</h3>
                  <Link to={`/search?condition=${grade.key}`} className="group inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2 text-[13px] font-semibold text-white shadow-glow">
                    Shop {grade.name.toLowerCase()} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <p className="mt-2 text-[14px] text-muted">{grade.body}</p>
              </motion.div>
            </AnimatePresence>
            <p className="flex items-start gap-2 text-[12px] leading-5 text-ink-soft">
              <Info size={14} className="mt-0.5 shrink-0" />
              Condition is the seller's grade, not a refurbishment certificate. Warranty appears only when the seller lists one; SureGad does not add coverage.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
