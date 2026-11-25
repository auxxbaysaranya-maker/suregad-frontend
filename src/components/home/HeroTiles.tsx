import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { Mark, OrbitRing } from "../brand";

/** The two promo tiles beside the hero carousel. */
export function HeroTiles({ checks }: { checks: string[] }) {
  const rows = checks.slice(0, 3);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
      <Link
        to="/search?inspected=true"
        className="group relative isolate flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[28px] bg-[radial-gradient(120%_120%_at_100%_0%,#dcd3ff_0%,#efeaff_45%,#f8f6ff_100%)] p-6 ring-1 ring-brand-100 transition duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <ShieldCheck
          aria-hidden="true"
          size={170}
          strokeWidth={1.1}
          className="absolute -right-8 -bottom-8 -z-10 text-brand-300/50 transition duration-700 group-hover:-rotate-12 group-hover:text-brand-400/60"
        />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-brand-600 uppercase">Inspected</p>
            <h3 className="mt-1.5 max-w-[190px] text-[22px] leading-tight">Devices with a published report</h3>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-card transition duration-300 group-hover:rotate-45 group-hover:bg-ink group-hover:text-white">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <ul className="mt-4 space-y-1.5">
          {rows.map((label, index) => (
            <motion.li
              key={label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.15 }}
              className="flex w-fit items-center gap-2 rounded-full bg-white/80 py-1 pr-3 pl-1 text-[12px] font-medium text-ink shadow-[0_4px_14px_-8px_rgba(58,63,224,0.5)] backdrop-blur"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-gradient text-white">
                <Check size={11} strokeWidth={3} />
              </span>
              {label}
            </motion.li>
          ))}
        </ul>
      </Link>

      <Link
        to="/sell"
        className="group relative isolate flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[28px] bg-ink p-6 text-white transition duration-300 hover:-translate-y-1 hover:shadow-lift"
      >
        <div aria-hidden="true" className="absolute -right-10 -bottom-12 -z-10 h-56 w-56 rounded-full bg-violet/60 blur-3xl transition duration-500 group-hover:bg-orchid/60" />
        <div aria-hidden="true" className="absolute -right-6 -bottom-6 -z-10 grid h-44 w-44 place-items-center">
          <OrbitRing className="absolute h-full w-full animate-orbit [animation-duration:22s]" />
          <Mark className="h-24 w-24 animate-float drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)] [--float-rotate:-8deg]" />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.14em] text-brand-200 uppercase">Sell</p>
            <h3 className="mt-1.5 max-w-[180px] text-[22px] leading-tight">Your old gadget can find a buyer</h3>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 transition duration-300 group-hover:rotate-45 group-hover:bg-white group-hover:text-ink">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <p className="max-w-[160px] text-[13px] text-white/65">List a phone or laptop from the same account you shop with.</p>
      </Link>
    </div>
  );
}
