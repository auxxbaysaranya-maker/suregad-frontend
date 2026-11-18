import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Laptop, Smartphone } from "lucide-react";
import { ProductCard, ProductCardSkeleton, type Listing } from "../ProductCard";
import { SectionHeading } from "../brand";
import { cn } from "../../lib/utils";

/** "New this week" grid with category tabs and an animated tab indicator. */
export function TabbedArrivals({ fresh, laptops, loading }: { fresh: Listing[]; laptops: Listing[]; loading: boolean }) {
  const phones = fresh.filter((item) => item.categorySlug === "smartphones");
  const tabs = [
    { key: "fresh", label: "Just listed", icon: Clock3, items: fresh, to: "/search?sort=newest" },
    { key: "phones", label: "Phones", icon: Smartphone, items: phones, to: "/search?category=smartphones&sort=newest" },
    { key: "laptops", label: "Laptops", icon: Laptop, items: laptops, to: "/search?category=laptops&sort=newest" },
  ].filter((tab) => tab.key === "fresh" || tab.items.length);
  const [active, setActive] = useState("fresh");
  const current = tabs.find((tab) => tab.key === active) || tabs[0];
  if (!loading && !fresh.length && !laptops.length) return null;
  return (
    <section className="py-10">
      <SectionHeading eyebrow="New arrivals" title={<>Fresh on <span className="text-gradient">SureGad</span></>} body="The latest devices, straight from sellers and showrooms." />
      <div className="no-scrollbar mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-card ring-1 ring-line" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={current.key === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn("relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition", current.key === tab.key ? "text-white" : "text-ink-soft hover:text-ink")}
          >
            {current.key === tab.key ? <motion.span layoutId="arrivals-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
            <tab.icon size={16} className="relative" />
            <span className="relative">{tab.label}</span>
            <span className={cn("relative rounded-full px-1.5 text-[11px]", current.key === tab.key ? "bg-white/20" : "bg-brand-50 text-brand-700")}>{tab.items.length}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 gap-x-5 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
        >
          {loading
            ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)
            : current.items.slice(0, 8).map((product, index) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
        </motion.div>
      </AnimatePresence>
      <ViewMore to={current.to} label={`View more ${current.key === "laptops" ? "laptops" : current.key === "phones" ? "phones" : "new arrivals"}`} />
    </section>
  );
}

/** Centred "View more" button shown under a card collection. */
export function ViewMore({ to, label }: { to: string; label: string }) {
  return (
    <div className="mt-10 flex justify-center">
      <Link
        to={to}
        className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-ink shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-300"
      >
        {label}
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-white transition-transform duration-300 group-hover:translate-x-1">
          <ArrowRight size={15} />
        </span>
      </Link>
    </div>
  );
}
