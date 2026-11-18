import { motion } from "framer-motion";
import { BadgeCheck, ClipboardCheck, LockKeyhole, MessageSquareLock } from "lucide-react";
import { rise, stagger } from "./Reveal";

const items = [
  { icon: ClipboardCheck, title: "Reports stay on the listing", body: "Inspected devices show the partner's report." },
  { icon: LockKeyhole, title: "Gateway-verified payments", body: "An order is paid only after the provider confirms it." },
  { icon: BadgeCheck, title: "Approved showrooms", body: "Showrooms publish only after admin approval." },
  { icon: MessageSquareLock, title: "Private seller numbers", body: "Questions and disputes stay on your account." },
];

export function TrustRibbon() {
  return (
    <motion.ul
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-line shadow-card ring-1 ring-line lg:grid-cols-4"
    >
      {items.map((item) => (
        <motion.li key={item.title} variants={rise} className="group flex items-start gap-3 bg-white p-4 transition-colors hover:bg-brand-50/60 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <item.icon size={19} />
          </span>
          <span>
            <span className="block text-[14px] leading-snug font-semibold text-ink">{item.title}</span>
            <span className="mt-0.5 hidden text-[13px] leading-snug text-muted sm:block">{item.body}</span>
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
