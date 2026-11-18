import { Link } from "react-router-dom";
import { ArrowUpRight, ShieldCheck, Sparkles, Store, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { LaptopArt, PhoneArt } from "../illustrations";
import { OrbitRing, SectionHeading } from "../brand";
import { Scroller } from "../Scroller";
import { cn } from "../../lib/utils";

interface Category {
  slug: string;
  name: string;
}

interface Tile {
  key: string;
  to: string;
  eyebrow: string;
  title: string;
  body: string;
  surface: string;
  dark?: boolean;
  art: ReactNode;
}

function Arrow({ dark }: { dark?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full transition duration-300 group-hover:rotate-45",
        dark ? "bg-white/10 text-white ring-1 ring-white/20 group-hover:bg-white group-hover:text-ink" : "bg-white text-ink shadow-card group-hover:bg-ink group-hover:text-white",
      )}
    >
      <ArrowUpRight size={18} />
    </span>
  );
}

function IconArt({ children, halo, solid }: { children: ReactNode; halo: string; solid: string }) {
  return (
    <div className="relative grid h-full place-items-center">
      <span className={cn("absolute h-36 w-36 animate-pulse-ring rounded-full", halo)} />
      <span className={cn("relative grid h-24 w-24 place-items-center rounded-[30px] text-white shadow-lift transition duration-500 group-hover:-rotate-6 group-hover:scale-105", solid)}>{children}</span>
    </div>
  );
}

/** Side-scrolling category cards; each card has its own illustration and surface. */
export function CategoryScroller({ categories }: { categories: Category[] }) {
  const name = (slug: string, fallback: string) => categories.find((category) => category.slug === slug)?.name || fallback;
  const tiles: Tile[] = [
    {
      key: "smartphones",
      to: "/search?category=smartphones",
      eyebrow: "Phones",
      title: name("smartphones", "Smartphones"),
      body: "Flagships to everyday phones",
      surface: "bg-[radial-gradient(110%_90%_at_80%_100%,#c9d8ff_0%,#e6ecff_45%,#f4f6ff_100%)] ring-[#d9e2ff]",
      art: (
        <div className="relative flex h-full items-end justify-center">
          <OrbitRing className="absolute bottom-0 h-[115%] w-[115%] animate-orbit opacity-70 [animation-duration:30s]" />
          <PhoneArt className="relative z-10 h-[92%] transition duration-700 ease-out group-hover:-translate-y-2 group-hover:-rotate-[10deg]" palette="azure" />
          <PhoneArt className="-ml-10 h-[76%] transition duration-700 ease-out group-hover:translate-x-2 group-hover:rotate-[12deg]" palette="brand" />
        </div>
      ),
    },
    {
      key: "laptops",
      to: "/search?category=laptops",
      eyebrow: "Laptops",
      title: name("laptops", "Laptops"),
      body: "Work, study and creative machines",
      surface: "bg-[radial-gradient(120%_120%_at_100%_100%,#dccfff_0%,#ece5ff_50%,#f7f4ff_100%)] ring-brand-100",
      art: (
        <div className="grid h-full place-items-end justify-center pb-2">
          <LaptopArt className="w-[230px] transition duration-700 ease-out group-hover:-translate-y-1.5" palette="violet" />
        </div>
      ),
    },
    {
      key: "inspected",
      to: "/search?inspected=true",
      eyebrow: "Inspected",
      title: "With a report",
      body: "Partner-checked listings",
      surface: "bg-white ring-line",
      art: <IconArt halo="bg-emerald-400/30" solid="bg-emerald-500"><ShieldCheck size={44} /></IconArt>,
    },
    {
      key: "refurbished",
      to: "/search?sellerType=business",
      eyebrow: "Showrooms",
      title: "Refurbished",
      body: "From admin-approved showrooms",
      surface: "bg-ink ring-ink",
      dark: true,
      art: <IconArt halo="bg-brand-500/30" solid="bg-brand-gradient"><Store size={44} /></IconArt>,
    },
    {
      key: "like_new",
      to: "/search?condition=like_new",
      eyebrow: "Condition",
      title: "Like new",
      body: "Looks unused, graded by the seller",
      surface: "bg-[radial-gradient(120%_120%_at_0%_0%,#ffe3f7_0%,#f6ebff_55%,#fbf8ff_100%)] ring-[#f1dcf7]",
      art: <IconArt halo="bg-orchid/30" solid="bg-gradient-to-br from-orchid to-violet"><Sparkles size={44} /></IconArt>,
    },
    {
      key: "deals",
      to: "/search?maxPrice=15000&sort=price_desc",
      eyebrow: "Budget",
      title: "Under ₹15K",
      body: "Great value phones",
      surface: "bg-[radial-gradient(120%_120%_at_100%_0%,#fff1d6_0%,#fff7ea_55%,#fffdf8_100%)] ring-[#f6e6c4]",
      art: <IconArt halo="bg-amber-400/30" solid="bg-gradient-to-br from-amber-400 to-orange-500"><Tag size={44} /></IconArt>,
    },
  ];
  const extra = categories.filter((category) => category.slug !== "smartphones" && category.slug !== "laptops");
  for (const category of extra) {
    tiles.splice(2, 0, {
      key: category.slug,
      to: `/search?category=${category.slug}`,
      eyebrow: "Category",
      title: category.name,
      body: "Browse listings",
      surface: "bg-white ring-line",
      art: <IconArt halo="bg-brand-400/30" solid="bg-brand-500"><Sparkles size={44} /></IconArt>,
    });
  }
  return (
    <section className="py-10">
      <SectionHeading eyebrow="Categories" title={<>Shop by <span className="text-gradient">category</span></>} body="Every listing is a single physical device with its own photos, grade and seller." action={{ to: "/search", label: "All devices" }} />
      <Scroller itemClassName="w-[260px] sm:w-[290px]" autoPlay={3600} label="Categories">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            to={tile.to}
            className={cn("group relative isolate flex h-[340px] flex-col overflow-hidden rounded-[30px] p-6 ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-lift", tile.surface, tile.dark && "text-white")}
          >
            {tile.dark ? <div aria-hidden="true" className="absolute -top-16 -right-16 -z-10 h-48 w-48 rounded-full bg-brand-600/60 blur-3xl transition duration-500 group-hover:bg-orchid/60" /> : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cn("text-[11px] font-semibold tracking-[0.14em] uppercase", tile.dark ? "text-brand-200" : "text-brand-600")}>{tile.eyebrow}</p>
                <h3 className="mt-1.5 text-[24px]">{tile.title}</h3>
                <p className={cn("mt-1 text-[13px]", tile.dark ? "text-white/60" : "text-muted")}>{tile.body}</p>
              </div>
              <Arrow dark={tile.dark} />
            </div>
            <div aria-hidden="true" className="pointer-events-none mt-4 min-h-0 flex-1">{tile.art}</div>
          </Link>
        ))}
      </Scroller>
    </section>
  );
}
