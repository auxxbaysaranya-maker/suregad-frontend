import { ArrowRight, BadgeCheck, Briefcase, Camera, ClipboardCheck, IndianRupee, LogIn, MapPinned, MessageCircle, Store } from "lucide-react";
import { adminUrl } from "../lib/config";
import { Link } from "react-router-dom";
import { Mark, OrbitRing } from "../components/brand";

const CONTENT = {
  seller: {
    eyebrow: "Sell on SureGad",
    title: "Your devices deserve the right buyer.",
    body: "Sellers and showrooms run their listings, orders and storefront page from SureGad Hub.",
    signup: "signup?as=seller",
    cta: "Create a seller account",
    icon: Store,
    steps: [
      { icon: Camera, title: "List with photos", body: "Add several photos, specs and your price. Listings go live after a quick review." },
      { icon: MessageCircle, title: "Chat with buyers", body: "Buyers message you, make offers and can book an inspection before paying." },
      { icon: BadgeCheck, title: "Get approved, get seen", body: "Showrooms are approved by our team and get a public storefront page." },
    ],
  },
  partner: {
    eyebrow: "Become an inspection partner",
    title: "Inspect devices near you and earn per job.",
    body: "Partners take inspection jobs, visit the device and file a checklist report from SureGad Hub.",
    signup: "signup?as=partner",
    cta: "Apply as a partner",
    icon: Briefcase,
    steps: [
      { icon: BadgeCheck, title: "Get approved", body: "Our team reviews your profile before any job is offered." },
      { icon: MapPinned, title: "Accept nearby jobs", body: "Jobs are offered inside your service area. Pause any time." },
      { icon: ClipboardCheck, title: "File the report, get paid", body: "Complete the checklist with evidence. A payout is recorded for each report." },
    ],
  },
} as const;

/** Landing page that sends sellers and partners to sign up in SureGad Hub (the admin panel app). */
export function JoinPage({ kind }: { kind: "seller" | "partner" }) {
  const content = CONTENT[kind];
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <section className="relative isolate grid items-center gap-8 overflow-hidden rounded-[36px] bg-brand-gradient px-6 py-12 text-white sm:px-10 md:grid-cols-[1.2fr_1fr] md:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 right-1/4 h-80 w-80 animate-aurora rounded-full bg-white/20 blur-[100px]" />
          <div className="grid-pattern absolute inset-0 [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
        </div>
        <div>
          <p className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-white/75 uppercase"><content.icon size={15} /> {content.eyebrow}</p>
          <h1 className="mt-3 max-w-xl text-[clamp(32px,4.4vw,52px)] leading-[1.03] font-extrabold">{content.title}</h1>
          <p className="mt-4 max-w-md text-[16px] text-white/80">{content.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={adminUrl(content.signup)} className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-ink shadow-[0_14px_30px_-10px_rgba(0,0,0,0.4)] transition hover:-translate-y-0.5">
              {content.cta} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a href={adminUrl("login")} className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold ring-1 ring-white/40 transition hover:bg-white/10">
              <LogIn size={16} /> Sign in to SureGad Hub
            </a>
          </div>
        </div>
        <div className="relative mx-auto hidden h-[260px] w-full max-w-[360px] md:block">
          <div className="absolute inset-0 grid place-items-center">
            <div className="absolute h-56 w-56 rounded-full bg-white/25 blur-3xl" />
            <OrbitRing className="absolute h-[115%] w-[115%] animate-orbit opacity-90 [animation-duration:24s]" strokeWidth={1.4} />
            <div className="relative grid h-36 w-36 place-items-center rounded-[40px] bg-white shadow-[0_40px_60px_-20px_rgba(16,17,55,0.55)]">
              <Mark className="h-24 w-24 animate-float" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {content.steps.map((step, index) => (
          <div key={step.title} className="rounded-[28px] bg-white p-6 ring-1 ring-line">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"><step.icon size={22} /></span>
            <p className="mt-4 text-[12px] font-semibold text-brand-600">Step {index + 1}</p>
            <h2 className="mt-1 text-[20px]">{step.title}</h2>
            <p className="mt-1.5 text-[14px] text-muted">{step.body}</p>
          </div>
        ))}
      </section>
      {kind === "seller" ? (
        <p className="mt-6 rounded-2xl bg-white p-4 text-[14px] ring-1 ring-line">
          Selling just your own phone or laptop? You don't need a seller account. <Link to="/sell" className="font-semibold text-brand-700">List it from your SureGad account</Link>
        </p>
      ) : null}
      {kind === "seller" ? (
        <p className="mt-6 flex items-center gap-2 text-[13px] text-muted"><IndianRupee size={14} /> Plans and listing limits are shown in SureGad Hub before you publish.</p>
      ) : null}
    </div>
  );
}
