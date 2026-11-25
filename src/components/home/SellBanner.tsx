import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Camera, MessagesSquare, Store } from "lucide-react";
import { Mark, OrbitRing } from "../brand";
import { adminUrl } from "../../lib/config";

// Chips sit above and below the central tile (which spans roughly y 78–222 of the 300px stage) so they never cover it.
const chips = [
  { icon: Camera, text: "Your own photos", position: "top-1 left-0", delay: 0.2 },
  { icon: MessagesSquare, text: "Chat with buyers", position: "bottom-9 right-0", delay: 0.35 },
  { icon: Store, text: "Showroom storefronts", position: "bottom-0 left-0", delay: 0.5 },
];

export function SellBanner() {
  return (
    <section className="py-10">
      <div className="relative isolate grid items-center gap-8 overflow-hidden rounded-[36px] bg-brand-gradient px-6 py-12 text-white sm:px-10 md:grid-cols-[1.1fr_1fr] md:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 right-1/4 h-80 w-80 animate-aurora rounded-full bg-white/20 blur-[100px]" />
          <div className="absolute -bottom-32 -left-20 h-96 w-96 animate-aurora rounded-full bg-[#0a2fa8]/50 blur-[110px] [animation-delay:-5s]" />
          <div className="grid-pattern absolute inset-0 [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
        </div>
        <div>
          <p className="text-[12px] font-semibold tracking-[0.14em] text-white/75 uppercase">Sell on SureGad</p>
          <h2 className="mt-3 max-w-lg text-[clamp(32px,4.4vw,52px)] leading-[1.03] font-extrabold">Your old gadget deserves a new owner.</h2>
          <p className="mt-4 max-w-md text-[16px] text-white/80">Individuals list from the same account they shop with. Showrooms register their business and publish once our team approves it.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sell" className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-[0_14px_30px_-10px_rgba(0,0,0,0.4)] transition hover:-translate-y-0.5">
              Start selling <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a href={adminUrl("signup?as=seller")} className="inline-flex items-center rounded-full px-6 py-3.5 text-[15px] font-semibold ring-1 ring-white/40 backdrop-blur transition hover:bg-white/10">
              Register a showroom
            </a>
          </div>
        </div>
        <div className="relative mx-auto h-[300px] w-full max-w-[420px]">
          <div className="absolute inset-0 grid place-items-center">
            <div className="absolute h-64 w-64 rounded-full bg-white/25 blur-3xl" />
            <OrbitRing className="absolute h-[115%] w-[115%] animate-orbit opacity-90 [animation-duration:24s]" strokeWidth={1.4} />
            <div className="relative grid h-40 w-40 place-items-center rounded-[40px] bg-white shadow-[0_40px_60px_-20px_rgba(16,17,55,0.55)]">
              <Mark className="h-28 w-28 animate-float" />
            </div>
          </div>
          {chips.map((chip) => (
            <motion.div
              key={chip.text}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: chip.delay, type: "spring", stiffness: 200, damping: 16 }}
              className={`absolute ${chip.position} flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[13px] font-medium shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/30 backdrop-blur-md`}
            >
              <chip.icon size={16} /> {chip.text}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
