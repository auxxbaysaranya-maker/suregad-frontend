import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Twitter,
  UserRound,
  Youtube,
} from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { findCity } from "../lib/cities";
import { timeAgo } from "../lib/time";
import { ProductCard, ProductCardSkeleton, useDistance, type Listing } from "../components/ProductCard";
import { ListingMap } from "../components/ListingMap";
import { BackButton } from "../components/navigation";
import { ShareButton, WhatsAppGlyph } from "../components/share";
import { Mark, OrbitRing } from "../components/brand";
import { Empty } from "../components/ui";

interface StorefrontData {
  kind: "seller" | "store";
  id: string;
  slug: string;
  name: string;
  tagline: string;
  about: string;
  verified: boolean;
  sponsored?: boolean;
  memberSince?: string;
  logo: string | null;
  banner: string | null;
  city?: string;
  district?: string;
  state?: string;
  address: { line1?: string; line2?: string; city?: string; district?: string; state?: string; pincode?: string } | null;
  hours: string | null;
  location: { lat: number; lng: number; exact: boolean } | null;
  contact: { phone: string | null; email: string | null; whatsapp: string | null };
  social: { website?: string; instagram?: string; facebook?: string; youtube?: string; x?: string };
  stats: { activeListings: number; soldListings: number; inspectedListings: number; rating: number | null; reviewCount: number };
  ratingBreakdown: Record<string, number>;
  reviews: { id: string; rating: number; body: string; author: string; verifiedPurchase?: boolean; sellerReply: string | null; about: string; createdAt: string }[];
  listings: Listing[];
}

function whatsappLink(value: string) {
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} size={size} className={index <= Math.round(value) ? "fill-[#f5b400] text-[#f5b400]" : "text-line"} />
      ))}
    </span>
  );
}

function ActionLink({ href, icon, label, primary = false, external = false }: { href: string; icon: ReactNode; label: string; primary?: boolean; external?: boolean }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold transition",
        primary ? "bg-brand-gradient text-white shadow-glow hover:brightness-110" : "bg-white text-ink ring-1 ring-line hover:ring-brand-300",
      )}
    >
      {icon} {label}
    </a>
  );
}

const socialMeta = {
  website: { label: "Website", icon: Globe, tone: "bg-ink" },
  instagram: { label: "Instagram", icon: Instagram, tone: "bg-[linear-gradient(45deg,#f58529,#dd2a7b,#8134af)]" },
  facebook: { label: "Facebook", icon: Facebook, tone: "bg-[#1877f2]" },
  youtube: { label: "YouTube", icon: Youtube, tone: "bg-[#ff0000]" },
  x: { label: "X", icon: Twitter, tone: "bg-ink" },
} as const;

/** Scroll to a page section without changing the URL (keeps Back navigation intact). */
function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

type Filter = "all" | "smartphones" | "laptops" | "inspected" | "sold";

export function StorefrontPage({ kind }: { kind: "seller" | "store" }) {
  const { slug = "" } = useParams();
  const query = useQuery({
    queryKey: ["storefront", kind, slug],
    queryFn: async () => (await api.get(kind === "seller" ? `/sellers/${slug}` : `/stores/${slug}`)).data.data as StorefrontData,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("newest");
  const [shown, setShown] = useState(12);
  const data = query.data;
  const storeDistance = useDistance(data?.location || undefined);

  const listings = useMemo(() => {
    let rows = data?.listings || [];
    if (filter === "smartphones" || filter === "laptops") rows = rows.filter((row) => row.categorySlug === filter && row.status !== "sold");
    else if (filter === "inspected") rows = rows.filter((row) => row.inspection?.inspected && row.status !== "sold");
    else if (filter === "sold") rows = rows.filter((row) => row.status === "sold");
    else rows = rows.filter((row) => row.status !== "sold");
    const sorted = [...rows];
    if (sort === "price_asc") sorted.sort((a, b) => a.pricePaise - b.pricePaise);
    if (sort === "price_desc") sorted.sort((a, b) => b.pricePaise - a.pricePaise);
    if (sort === "newest") sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return sorted;
  }, [data, filter, sort]);

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6">
        <div className="skeleton h-[260px] rounded-[36px]" />
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}</div>
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <BackButton className="mb-5" />
        <Empty title={kind === "store" ? "Showroom unavailable" : "Seller unavailable"} body="This page is visible once the account exists and, for showrooms, after admin approval." />
      </div>
    );
  }

  const place = [...new Set([data.city, data.district, data.state].filter(Boolean))].join(", ");
  // Distance from the shopper's active location to the store's own registered point (not a city guess).
  const distance = storeDistance;
  const mapPoint = data.location || (() => {
    const city = findCity(data.city);
    return city ? { lat: city.lat, lng: city.lng, exact: false } : null;
  })();
  const directions = mapPoint ? `https://www.google.com/maps/dir/?api=1&destination=${mapPoint.lat},${mapPoint.lng}` : null;
  const socials = (Object.keys(socialMeta) as (keyof typeof socialMeta)[]).filter((key) => data.social[key]);
  const isStore = data.kind === "store";
  const counts: Record<Filter, number> = {
    all: data.listings.filter((row) => row.status !== "sold").length,
    smartphones: data.listings.filter((row) => row.categorySlug === "smartphones" && row.status !== "sold").length,
    laptops: data.listings.filter((row) => row.categorySlug === "laptops" && row.status !== "sold").length,
    inspected: data.listings.filter((row) => row.inspection?.inspected && row.status !== "sold").length,
    sold: data.stats.soldListings,
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-10">
      <div className="mb-4 flex items-center justify-between">
        <BackButton />
        <ShareButton title={data.name} text={`${data.name} on SureGad${data.tagline ? ` — ${data.tagline}` : ""}`} url={`/${isStore ? "store" : "seller"}/${data.slug}`} label="Share page" />
      </div>

      {/* cover */}
      <div className="relative isolate h-[200px] overflow-hidden rounded-[36px] bg-brand-gradient sm:h-[280px]">
        {data.banner ? (
          <img src={data.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden="true" className="absolute inset-0">
            <div className="absolute -top-24 left-1/4 h-80 w-80 animate-aurora rounded-full bg-white/20 blur-[100px]" />
            <div className="absolute -right-20 -bottom-28 h-96 w-96 animate-aurora rounded-full bg-orchid/50 blur-[110px] [animation-delay:-6s]" />
            <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(70%_80%_at_70%_40%,#000,transparent)]" />
            <div className="absolute top-1/2 right-10 hidden h-56 w-56 -translate-y-1/2 sm:block">
              <OrbitRing className="absolute inset-0 animate-orbit [animation-duration:26s]" strokeWidth={1.2} />
              <Mark className="absolute inset-0 m-auto h-28 w-28 animate-float opacity-90 drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* identity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative mx-2 -mt-20 rounded-[30px] bg-white p-5 shadow-lift ring-1 ring-line sm:mx-6 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <span className="-mt-16 grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[28px] bg-brand-gradient text-white shadow-lift ring-4 ring-white sm:-mt-20 sm:h-28 sm:w-28">
              {data.logo ? <img src={data.logo} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-[40px] font-extrabold">{data.name.slice(0, 1).toUpperCase()}</span>}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[clamp(26px,3.2vw,38px)]">{data.name}</h1>
                {data.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700"><BadgeCheck size={14} /> {isStore ? "Approved showroom" : "Verified seller"}</span>
                ) : null}
                {data.sponsored ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">Featured</span> : null}
              </div>
              {data.tagline ? <p className="mt-1 text-[15px] text-ink-soft">{data.tagline}</p> : null}
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                <span className="flex items-center gap-1">{isStore ? <Store size={14} /> : <UserRound size={14} />} {isStore ? "Showroom" : "Individual seller"}</span>
                {place ? <span className="flex items-center gap-1"><MapPin size={14} /> {place}{distance ? ` · ${distance} from you` : ""}</span> : null}
                {data.memberSince ? <span className="flex items-center gap-1"><CalendarDays size={14} /> On SureGad since {new Date(data.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span> : null}
                {data.stats.rating !== null ? (
                  <span className="flex items-center gap-1.5"><Stars value={data.stats.rating} size={13} /> <span className="font-semibold text-ink">{data.stats.rating}</span> ({data.stats.reviewCount})</span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.contact.phone ? <ActionLink primary href={`tel:${data.contact.phone.replace(/\s+/g, "")}`} icon={<Phone size={16} />} label="Call" /> : null}
            {data.contact.whatsapp ? <ActionLink external href={whatsappLink(data.contact.whatsapp)} icon={<WhatsAppGlyph size={16} />} label="WhatsApp" /> : null}
            {data.contact.email ? <ActionLink href={`mailto:${data.contact.email}`} icon={<Mail size={16} />} label="Email" /> : null}
            {directions ? <ActionLink external href={directions} icon={<Navigation size={16} />} label="Directions" /> : null}
            {data.social.website ? <ActionLink external href={data.social.website} icon={<Globe size={16} />} label="Website" /> : null}
            {!data.contact.phone && !data.contact.whatsapp && !data.contact.email ? (
              <button type="button" onClick={() => jumpTo("listings")} className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-[14px] font-semibold text-white shadow-glow">
                <Package size={16} /> Chat from any listing
              </button>
            ) : null}
          </div>
        </div>

        {/* stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Package, label: "Active listings", value: data.stats.activeListings },
            { icon: PackageCheck, label: "Devices sold", value: data.stats.soldListings },
            { icon: ShieldCheck, label: "Inspected listings", value: data.stats.inspectedListings },
            { icon: Star, label: "Overall rating", value: data.stats.rating !== null ? `${data.stats.rating} / 5` : "New" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl bg-canvas p-4 ring-1 ring-line">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-card"><stat.icon size={18} /></span>
              <span>
                <span className="block font-display text-[22px] leading-none font-bold">{stat.value}</span>
                <span className="mt-1 block text-[12px] text-muted">{stat.label}</span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* section nav */}
      <nav className="sticky top-[132px] z-20 mt-8 mb-2 flex justify-center lg:top-[128px]" aria-label="Page sections">
        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-card ring-1 ring-line backdrop-blur">
          {[["listings", `Listings · ${counts.all}`], ["about", "About"], ["reviews", `Reviews · ${data.stats.reviewCount}`]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => jumpTo(id)} className="rounded-full px-4 py-2 text-[13px] font-semibold text-ink-soft transition hover:bg-canvas hover:text-ink">{label}</button>
          ))}
        </div>
      </nav>

      {/* listings */}
      <section id="listings" className="scroll-mt-48 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[clamp(24px,2.8vw,32px)]">{isStore ? "Shop this showroom" : `Listings by ${data.name.split(" ")[0]}`}</h2>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort listings" className="rounded-full bg-white px-4 py-2.5 text-[13px] font-semibold ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400">
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
          {([["all", "All"], ["smartphones", "Phones"], ["laptops", "Laptops"], ["inspected", "Inspected"], ["sold", "Sold"]] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setFilter(key); setShown(12); }}
              className={cn("relative shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ring-1 transition", filter === key ? "text-white ring-ink" : "bg-white text-ink-soft ring-line hover:ring-brand-200")}
            >
              {filter === key ? <motion.span layoutId="store-filter" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <span className="relative">{label} <span className="opacity-60">{counts[key]}</span></span>
            </button>
          ))}
        </div>
        {listings.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {listings.slice(0, shown).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <Empty title="Nothing here yet" body={filter === "sold" ? "No devices have been sold here yet." : "New listings appear here after moderation."} />
        )}
        {listings.length > shown ? (
          <div className="mt-10 text-center">
            <button type="button" onClick={() => setShown((value) => value + 12)} className="rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-brand-300">
              View more ({listings.length - shown} more)
            </button>
          </div>
        ) : null}
      </section>

      {/* about */}
      <section id="about" className="scroll-mt-48 py-8">
        <h2 className="mb-6 text-[clamp(24px,2.8vw,32px)]">About {isStore ? "the showroom" : data.name.split(" ")[0]}</h2>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-[28px] bg-white p-6 ring-1 ring-line">
              <p className="text-[15px] leading-7 whitespace-pre-wrap text-ink-soft">{data.about || `${data.name} hasn't added a description yet.`}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {data.verified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700"><BadgeCheck size={14} /> {isStore ? "Approved by the SureGad team" : "Verified seller"}</span> : null}
                {data.stats.inspectedListings ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700"><ShieldCheck size={14} /> {data.stats.inspectedListings} inspected listing{data.stats.inspectedListings === 1 ? "" : "s"}</span> : null}
                {data.stats.soldListings ? <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-soft ring-1 ring-line"><Sparkles size={14} /> {data.stats.soldListings} sold on SureGad</span> : null}
              </div>
            </div>
            {socials.length ? (
              <div className="rounded-[28px] bg-white p-6 ring-1 ring-line">
                <p className="text-[15px] font-semibold">Follow {data.name}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {socials.map((key) => {
                    const meta = socialMeta[key];
                    return (
                      <a key={key} href={data.social[key]} target="_blank" rel="noreferrer" className="group flex items-center gap-2.5 rounded-2xl bg-canvas p-3 ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-brand-300">
                        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white", meta.tone)}><meta.icon size={18} /></span>
                        <span className="text-[14px] font-semibold">{meta.label}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-5">
            <div className="rounded-[28px] bg-white p-6 ring-1 ring-line">
              <p className="text-[15px] font-semibold">Contact & location</p>
              <ul className="mt-4 space-y-3.5 text-[14px]">
                {data.address?.line1 || place ? (
                  <li className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-brand-600" /><span>{[data.address?.line1, data.address?.line2].filter(Boolean).join(", ")}{data.address?.line1 ? <br /> : null}{place}{data.address?.pincode ? ` ${data.address.pincode}` : ""}</span></li>
                ) : null}
                {data.hours ? <li className="flex items-start gap-3"><Clock3 size={17} className="mt-0.5 shrink-0 text-brand-600" /><span>{data.hours}</span></li> : null}
                {data.contact.phone ? <li className="flex items-center gap-3"><Phone size={17} className="shrink-0 text-brand-600" /><a href={`tel:${data.contact.phone.replace(/\s+/g, "")}`} className="font-semibold hover:text-brand-700">{data.contact.phone}</a></li> : null}
                {data.contact.whatsapp ? <li className="flex items-center gap-3"><span className="shrink-0 text-[#25d366]"><WhatsAppGlyph size={17} /></span><a href={whatsappLink(data.contact.whatsapp)} target="_blank" rel="noreferrer" className="font-semibold hover:text-brand-700">{data.contact.whatsapp}</a></li> : null}
                {data.contact.email ? <li className="flex items-center gap-3"><Mail size={17} className="shrink-0 text-brand-600" /><a href={`mailto:${data.contact.email}`} className="font-semibold hover:text-brand-700">{data.contact.email}</a></li> : null}
                {!data.contact.phone && !data.contact.email && !data.contact.whatsapp ? <li className="text-muted">This seller prefers to be contacted through chat on a listing.</li> : null}
              </ul>
            </div>
            {mapPoint ? (
              <ListingMap
                lat={mapPoint.lat}
                lng={mapPoint.lng}
                exact={mapPoint.exact}
                cityCentre={!data.location}
                label={isStore && data.address?.line1 ? `${data.address.line1}, ${place}` : place || data.name}
                note={mapPoint.exact ? "Showroom address" : undefined}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section id="reviews" className="scroll-mt-48 py-8">
        <h2 className="mb-6 text-[clamp(24px,2.8vw,32px)]">Reviews</h2>
        {data.stats.reviewCount ? (
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="h-fit rounded-[28px] bg-white p-6 ring-1 ring-line lg:sticky lg:top-48">
              <p className="font-display text-[52px] leading-none font-extrabold">{data.stats.rating}</p>
              <div className="mt-2"><Stars value={data.stats.rating || 0} size={18} /></div>
              <p className="mt-1 text-[13px] text-muted">{data.stats.reviewCount} review{data.stats.reviewCount === 1 ? "" : "s"} on the seller and their listings</p>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = data.ratingBreakdown[stars] || 0;
                  const width = data.stats.reviewCount ? (count / data.stats.reviewCount) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-[12px]">
                      <span className="w-3 font-semibold">{stars}</span>
                      <Star size={12} className="fill-[#f5b400] text-[#f5b400]" />
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                        <motion.span initial={{ width: 0 }} whileInView={{ width: `${width}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="block h-full rounded-full bg-brand-gradient" />
                      </span>
                      <span className="w-6 text-right text-muted">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              {data.reviews.map((review) => (
                <article key={review.id} className="rounded-[24px] bg-white p-5 ring-1 ring-line">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient font-display font-bold text-white">{review.author.slice(0, 1)}</span>
                      <div>
                        <p className="flex items-center gap-1.5 text-[14px] font-semibold">{review.author}{review.verifiedPurchase ? <BadgeCheck size={14} className="text-emerald-500" aria-label="Verified purchase" /> : null}</p>
                        <p className="text-[12px] text-muted">{timeAgo(review.createdAt)} · about {review.about === "product" ? "a listing" : "the seller"}</p>
                      </div>
                    </div>
                    <Stars value={review.rating} size={14} />
                  </div>
                  {review.body ? <p className="mt-3 text-[14px] leading-6 text-ink-soft">{review.body}</p> : null}
                  {review.sellerReply ? <p className="mt-3 rounded-2xl bg-canvas px-4 py-3 text-[13px] text-muted"><span className="font-semibold text-ink">Reply:</span> {review.sellerReply}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <Empty title="No reviews yet" body="Reviews appear after buyers complete a delivered order." />
        )}
      </section>
    </div>
  );
}
