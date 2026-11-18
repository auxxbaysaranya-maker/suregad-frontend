import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Check, FileCheck2, Laptop, MapPinned, Smartphone } from "lucide-react";
import { ProductCard, type Listing } from "../ProductCard";
import { SectionHeading } from "../brand";
import { cn, money } from "../../lib/utils";
import { rise, stagger } from "./Reveal";

export interface InspectionPlanSummary {
  code: string;
  name: string;
  categorySlug: string;
  tier?: string;
  pricePaise: number;
  checklist: { key: string; label: string; critical?: boolean }[];
}

/** Used only if the plans endpoint is unavailable; mirrors the seeded checklists. */
const FALLBACK: Record<string, { label: string; critical: boolean }[]> = {
  smartphones: [
    ["IMEI", true], ["Display", true], ["Touchscreen", true], ["Battery", true], ["Charging", true], ["Network", true],
    ["Camera", false], ["Speaker", false], ["Microphone", false], ["Face unlock", false], ["Water damage indicators", true], ["Activation lock", true],
  ].map(([label, critical]) => ({ label: label as string, critical: critical as boolean })),
  laptops: [
    ["Serial number", true], ["Display", true], ["Battery", true], ["Charging", true], ["Keyboard", false], ["Touchpad", false],
    ["Ports", false], ["Webcam", false], ["Thermal condition", false], ["Performance", false], ["BIOS / firmware lock", true], ["Physical condition", false],
  ].map(([label, critical]) => ({ label: label as string, critical: critical as boolean })),
};

function largest(plans: InspectionPlanSummary[], category: string) {
  return plans.filter((plan) => plan.categorySlug === category).sort((a, b) => b.checklist.length - a.checklist.length)[0];
}
function cheapest(plans: InspectionPlanSummary[], category: string) {
  const prices = plans.filter((plan) => plan.categorySlug === category).map((plan) => plan.pricePaise);
  return prices.length ? Math.min(...prices) : undefined;
}

export function InspectionShowcase({ plans, products }: { plans: InspectionPlanSummary[]; products: Listing[] }) {
  const [tab, setTab] = useState<"smartphones" | "laptops">("smartphones");
  const summary = useMemo(() => {
    const plan = largest(plans, tab);
    const items = plan ? plan.checklist.map((item) => ({ label: item.label, critical: Boolean(item.critical) })) : FALLBACK[tab];
    return { items, total: plan?.checklist.length, from: cheapest(plans, tab), planName: plan?.name };
  }, [plans, tab]);
  const phoneFrom = cheapest(plans, "smartphones");
  const steps = [
    { icon: CalendarCheck, title: "Book an inspection", body: phoneFrom ? `Choose a plan for the device. Phone checks start at ${money(phoneFrom)}.` : "Choose a plan for the device on its listing page." },
    { icon: MapPinned, title: "An approved partner visits", body: "The job goes to an approved partner whose service area covers the listing." },
    { icon: FileCheck2, title: "The report stays on the listing", body: "Critical failures stay visible on the report even when the overall score is high." },
  ];
  const visible = summary.items.slice(0, 12);
  return (
    <section className="py-10">
      <div className="relative isolate overflow-hidden rounded-[36px] bg-ink px-5 py-10 text-white sm:px-8 md:px-12 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-24 h-96 w-96 animate-aurora rounded-full bg-azure/45 blur-[110px]" />
          <div className="absolute -right-24 -bottom-40 h-[28rem] w-[28rem] animate-aurora rounded-full bg-violet/45 blur-[120px] [animation-delay:-8s]" />
          <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000,transparent)]" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div>
            <SectionHeading
              tone="dark"
              eyebrow="Physical inspection"
              title={<>Buy with a report, <span className="bg-gradient-to-r from-[#9ec2ff] via-[#c7b8ff] to-[#f0b4ff] bg-clip-text text-transparent">not a guess.</span></>}
              body="Book an independent check before you pay. A report records the device on the day of the visit; it is not a warranty."
            />
            <ol className="relative mt-2 space-y-7 pl-14">
              <span aria-hidden="true" className="absolute top-3 bottom-3 left-[21px] w-px bg-white/12" />
              <motion.span
                aria-hidden="true"
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
                className="absolute top-3 bottom-3 left-[21px] w-px origin-top bg-gradient-to-b from-azure via-violet to-orchid"
              />
              {steps.map((step, index) => (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.25 + index * 0.35, duration: 0.5 }}
                  className="relative"
                >
                  <span className="absolute top-0 -left-14 grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient shadow-glow ring-4 ring-ink">
                    <step.icon size={19} />
                  </span>
                  <p className="text-[12px] font-semibold text-brand-200">Step {index + 1}</p>
                  <h3 className="mt-0.5 text-[19px]">{step.title}</h3>
                  <p className="mt-1 max-w-sm text-[14px] text-white/65">{step.body}</p>
                </motion.li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/search?inspected=true" className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5">
                Shop inspected devices <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/how-it-works" className="inline-flex items-center rounded-full px-5 py-3 text-[14px] font-semibold ring-1 ring-white/25 transition hover:bg-white/10">
                How verification works
              </Link>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotate: 1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="self-start rounded-[30px] bg-white/[0.06] p-5 ring-1 ring-white/12 backdrop-blur-xl sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex rounded-full bg-white/8 p-1 ring-1 ring-white/10" role="tablist" aria-label="Checklist by category">
                {([["smartphones", "Phones", Smartphone], ["laptops", "Laptops", Laptop]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn("relative flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition", tab === key ? "text-ink" : "text-white/70 hover:text-white")}
                  >
                    {tab === key ? <motion.span layoutId="inspect-tab" className="absolute inset-0 rounded-full bg-white" transition={{ type: "spring", stiffness: 400, damping: 32 }} /> : null}
                    <Icon size={15} className="relative" />
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
              {summary.from !== undefined ? (
                <p className="text-right text-[12px] text-white/60">
                  from <span className="font-display text-[22px] font-bold text-white">{money(summary.from)}</span>
                </p>
              ) : null}
            </div>
            <p className="mt-5 text-[13px] text-white/60">
              {summary.total ? `${summary.planName}: ${summary.total} checks.` : "What partners check."} Items marked critical decide the verdict.
            </p>
            <AnimatePresence mode="wait">
              <motion.ul key={`${tab}-${plans.length}`} variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {visible.map((item) => (
                  <motion.li key={item.label} variants={rise} className="flex items-center justify-between gap-2 rounded-2xl bg-white/[0.06] px-3.5 py-2.5 ring-1 ring-white/8">
                    <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-gradient">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.critical ? <span className="shrink-0 rounded-full bg-orchid/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#f3c4ff] uppercase">Critical</span> : null}
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
            {summary.items.length > visible.length ? <p className="mt-3 text-[12px] text-white/50">+ {summary.items.length - visible.length} more checks on the full report</p> : null}
          </motion.div>
        </div>

        {products.length ? (
          <div className="mt-12">
            <div className="mb-5 flex items-end justify-between">
              <h3 className="text-[22px]">Recently inspected</h3>
              <Link to="/search?inspected=true" className="text-[13px] font-semibold text-brand-200 hover:text-white">See all</Link>
            </div>
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[460px]:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, 4).map((product, index) => (
                // Mounts after data loads, so it animates on mount instead of waiting for an in-view trigger.
                <motion.div key={product.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: index * 0.08 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
