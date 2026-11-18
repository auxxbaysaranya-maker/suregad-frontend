import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "../brand";
import { Scroller } from "../Scroller";
import { cn } from "../../lib/utils";

const tiers = [
  { amount: 5000, note: "Backup phones", tone: "bg-[#f3f1ff] text-ink", hole: "bg-canvas", sub: "text-muted", arrow: "bg-white text-ink" },
  { amount: 10000, note: "Everyday phones", tone: "bg-[#e6e1ff] text-ink", hole: "bg-canvas", sub: "text-muted", arrow: "bg-white text-ink" },
  { amount: 15000, note: "Best value picks", tone: "bg-[#cfc5fe] text-ink", hole: "bg-canvas", sub: "text-ink-soft", arrow: "bg-white text-ink" },
  { amount: 20000, note: "Mid-range", tone: "bg-[#8a76f4] text-white", hole: "bg-canvas", sub: "text-white/75", arrow: "bg-white/20 text-white" },
  { amount: 30000, note: "Upper mid-range", tone: "bg-[#4f49e6] text-white", hole: "bg-canvas", sub: "text-white/75", arrow: "bg-white/20 text-white" },
  { amount: 50000, note: "Flagships & laptops", tone: "bg-brand-gradient text-white", hole: "bg-canvas", sub: "text-white/80", arrow: "bg-white text-ink" },
];

function short(amount: number) {
  return amount >= 1000 ? `${amount / 1000}K` : String(amount);
}

/** Hanging price tags in an auto-advancing row; they swing on hover and darken as the budget rises. */
export function BudgetTags() {
  return (
    <section className="py-10">
      <SectionHeading eyebrow="Budget" title={<>Shop by <span className="text-gradient">budget</span></>} body="Pick a ceiling and see every device priced at or under it." action={{ to: "/search?sort=price_asc", label: "All prices" }} />
      <Scroller itemClassName="w-[190px] sm:w-[210px]" autoPlay={2800} label="Budgets">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.amount}
            initial={{ opacity: 0, y: -24, rotate: index % 2 ? 4 : -4 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ type: "spring", stiffness: 140, damping: 12, delay: index * 0.07 }}
            className="relative pt-5"
          >
            {/* the string */}
            <svg aria-hidden="true" viewBox="0 0 40 24" className="absolute top-0 left-1/2 h-6 w-10 -translate-x-1/2 text-brand-300">
              <path d="M20 0 C 18 8, 22 14, 20 22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <motion.div whileHover={{ rotate: index % 2 ? 3 : -3, y: 4 }} transition={{ type: "spring", stiffness: 260, damping: 10 }} style={{ transformOrigin: "50% 0%" }}>
              <Link
                to={`/search?maxPrice=${tier.amount}&sort=price_desc`}
                className={cn("group relative flex min-h-[176px] flex-col rounded-[22px] p-5 pt-8 shadow-card transition-shadow hover:shadow-lift", tier.tone)}
              >
                <span aria-hidden="true" className={cn("absolute top-3 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full ring-4 ring-black/5", tier.hole)} />
                <span className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", tier.sub)}>Under</span>
                <span className="mt-1 font-display text-[40px] leading-none font-extrabold tracking-[-0.04em]">
                  <span className="mr-0.5 align-top text-[22px] font-bold">₹</span>
                  {short(tier.amount)}
                </span>
                <span className={cn("mt-2 text-[13px] font-medium", tier.sub)}>{tier.note}</span>
                <span className={cn("mt-auto ml-auto grid h-9 w-9 translate-y-1 place-items-center rounded-full pt-0 transition duration-300 group-hover:translate-x-1", tier.arrow)}>
                  <ArrowRight size={16} />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </Scroller>
    </section>
  );
}
