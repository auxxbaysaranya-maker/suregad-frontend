import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Check, Clock3, Heart, Loader2, MapPin, MessageCircle, Phone, ShieldAlert, ShieldCheck, ShoppingBag } from "lucide-react";
import { cn, money, titleCase } from "../lib/utils";
import { api } from "../lib/api";
import { timeAgo } from "../lib/time";
import { distanceKm, formatDistance } from "../lib/cities";
import { useSession } from "../store/session";
import { useLocation } from "../store/location";
import { DeviceFallback } from "./illustrations";
import { SectionHeading } from "./brand";
import { Scroller } from "./Scroller";
import { CallDialog, useStartChat } from "./contact";

export interface Listing {
  id: string;
  title: string;
  slug: string;
  pricePaise: number;
  condition: string;
  city?: string;
  district?: string;
  state?: string;
  sellerType: string;
  sellerUserId?: string;
  images?: { key?: string; url?: string }[];
  specs?: Record<string, string | number | boolean | { available?: boolean }>;
  inspection?: { inspected?: boolean; score?: number; critical?: boolean; reportId?: string };
  status?: string;
  categorySlug?: string;
  featured?: boolean;
  geo?: { lat: number; lng: number };
  /** Exact distance from the active location, computed by the server from the listing's own point. */
  distanceKm?: number;
  /** Sold by an ordinary user: chat and offers only, no cart. */
  chatOnly?: boolean;
  itemType?: "new" | "used" | "refurbished";
  createdAt?: string;
}

export function rememberCompare(id: string) {
  const current = JSON.parse(localStorage.getItem("sg_compare") || "[]") as string[];
  const next = [id, ...current.filter((item) => item !== id)].slice(0, 3);
  localStorage.setItem("sg_compare", JSON.stringify(next));
}

/** Kept for existing imports. */
export function DeviceArt({ laptop = false }: { laptop?: boolean }) {
  return <DeviceFallback laptop={laptop} />;
}

function formatStorage(gb: number) {
  return gb >= 1024 ? `${+(gb / 1024).toFixed(1)} TB` : `${gb} GB`;
}

/** Short spec chips from the listing's category specs (ramGb, storageGb, displayInches, processor). */
export function specChips(product: Pick<Listing, "specs" | "categorySlug">): string[] {
  const specs = product.specs || {};
  const chips: string[] = [];
  const ram = Number(specs.ramGb);
  const storage = Number(specs.storageGb);
  const display = Number(specs.displayInches);
  if (product.categorySlug === "laptops" && typeof specs.processor === "string" && specs.processor.trim()) {
    chips.push(specs.processor.trim().split(/\s+/).slice(0, 3).join(" "));
  }
  if (ram > 0) chips.push(`${ram} GB RAM`);
  if (storage > 0) chips.push(formatStorage(storage));
  if (display > 0 && chips.length < 3) chips.push(`${display}″`);
  return chips.slice(0, 3);
}

/**
 * "3.2 km" from the active discovery location. Prefers the server's exact figure; otherwise
 * estimates from the listing's rounded public area.
 */
export function useDistance(geo?: { lat: number; lng: number }, serverKm?: number) {
  const location = useLocation((state) => state.location);
  if (!location) return null;
  if (typeof serverKm === "number") return formatDistance(serverKm);
  if (!geo) return null;
  return formatDistance(distanceKm(location, geo));
}

function InspectionBadge({ inspection }: { inspection?: Listing["inspection"] }) {
  if (!inspection?.inspected) {
    return <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-muted ring-1 ring-line backdrop-blur">Not inspected</span>;
  }
  if (inspection.critical) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
        <ShieldAlert size={13} /> Report: critical issue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <ShieldCheck size={13} /> Inspected{inspection.score !== undefined ? ` · ${inspection.score}` : ""}
    </span>
  );
}

export function ProductCard({ product, className }: { product: Listing; className?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useSession((state) => state.profile);
  const chat = useStartChat();
  const distance = useDistance(product.geo, product.distanceKm);
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [cart, setCart] = useState<"idle" | "busy" | "done">("idle");
  const [callOpen, setCallOpen] = useState(false);
  const [note, setNote] = useState("");
  const noteTimer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(noteTimer.current), []);
  useEffect(() => {
    if (chat.error) flash(chat.error);
  }, [chat.error]);

  const kind = product.sellerType === "business" ? "Refurbished" : "Used";
  const chips = specChips(product);
  const brand = typeof product.specs?.brand === "string" ? product.specs.brand : undefined;
  const laptop = product.categorySlug === "laptops";
  const unavailable = product.status === "sold" || product.status === "reserved";
  const ownListing = Boolean(profile && product.sellerUserId && profile.id === product.sellerUserId);
  const [primary, secondary] = [product.images?.[0]?.url, product.images?.[1]?.url];

  function flash(message: string) {
    setNote(message);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(""), 3500);
  }

  async function toggleSave() {
    if (!profile) return navigate("/login");
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.post(`/me/wishlist/${product.id}`);
      else await api.delete(`/me/wishlist/${product.id}`);
    } catch (error) {
      setSaved(!next);
      flash(error instanceof Error ? error.message : "Could not update your wishlist.");
    }
  }

  async function addToCart() {
    if (!profile) return navigate("/login");
    if (cart === "busy") return;
    setCart("busy");
    try {
      await api.post("/cart/items", { productId: product.id });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      setCart("done");
      flash("Added to cart.");
      window.setTimeout(() => setCart("idle"), 1800);
    } catch (error) {
      setCart("idle");
      flash(error instanceof Error ? error.message : "Could not add to cart.");
    }
  }

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-[24px] bg-white p-2.5 ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200",
        className,
      )}
    >
      <Link to={`/product/${product.slug}`} className="relative block overflow-hidden rounded-[18px]" aria-label={product.title}>
        <div className="relative grid aspect-[4/3.4] place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_30%_15%,#ffffff_0%,#f3f1ff_45%,#e9e4fb_100%)]">
          {primary ? (
            <>
              <img
                src={primary}
                alt=""
                loading="lazy"
                className={cn("absolute inset-0 m-auto h-[82%] w-[82%] object-contain transition duration-500 group-hover:scale-[1.06]", secondary && "group-hover:opacity-0")}
              />
              {secondary ? <img src={secondary} alt="" loading="lazy" className="absolute inset-0 m-auto h-[82%] w-[82%] object-contain opacity-0 transition duration-500 group-hover:opacity-100" /> : null}
            </>
          ) : (
            <div className="grid h-full w-full place-items-center transition duration-500 group-hover:scale-[1.05]">
              <DeviceFallback laptop={laptop} />
            </div>
          )}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {product.featured ? <span className="rounded-full bg-brand-gradient px-2.5 py-1 text-[11px] font-semibold text-white shadow-glow">Featured</span> : null}
            <InspectionBadge inspection={product.inspection} />
          </div>
          <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">{kind}</span>
          {unavailable ? (
            <div className="absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[2px]">
              <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">{product.status === "sold" ? "Sold" : "Reserved"}</span>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="absolute top-5 right-5 flex flex-col gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.82 }}
          onClick={() => void toggleSave()}
          aria-pressed={saved}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          className="relative grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-card ring-1 ring-line backdrop-blur transition hover:text-[#e5366b]"
        >
          <Heart size={17} className={cn("transition", saved && "scale-110 fill-[#e5366b] text-[#e5366b]")} />
          <AnimatePresence>
            {saved ? (
              <motion.span
                key="burst"
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[#e5366b]"
              />
            ) : null}
          </AnimatePresence>
        </motion.button>
        <button
          type="button"
          onClick={() => {
            rememberCompare(product.id);
            setCompared(true);
            flash("Added to compare.");
          }}
          aria-label="Add to compare"
          className="grid h-9 w-9 translate-x-2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-card ring-1 ring-line backdrop-blur transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 hover:text-brand-600 focus-visible:translate-x-0 focus-visible:opacity-100 max-lg:hidden"
        >
          {compared ? <Check size={16} /> : <ArrowLeftRight size={16} />}
        </button>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-4 pb-1.5">
        <p className="font-display text-[22px] leading-none font-bold tracking-tight text-ink">{money(product.pricePaise)}</p>
        <h3 className="mt-2 line-clamp-2 font-sans text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink">
          <Link to={`/product/${product.slug}`} className="hover:text-brand-700">{product.title}</Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted">
          {brand ? <span className="font-semibold text-brand-700">{brand}</span> : null}
          {brand ? <span className="h-1 w-1 rounded-full bg-line" /> : null}
          <span>{titleCase(product.condition)}</span>
        </p>
        {chips.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">{chip}</span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[12px] text-muted">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{[product.city, distance].filter(Boolean).join(" · ") || "Location not listed"}</span>
          </span>
          {product.createdAt ? (
            <span className="flex shrink-0 items-center gap-1"><Clock3 size={12} /> {timeAgo(product.createdAt)}</span>
          ) : null}
        </div>

        {/* Actions: 40px tap targets. Chat and Call share the width; cart is a tinted square. */}
        <div className={cn("mt-3 grid items-center gap-2 border-t border-line pt-3", product.sellerType === "individual" && !ownListing ? "grid-cols-2" : "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem]")}>
          {ownListing ? (
            <Link to={`/product/${product.slug}`} className="col-span-3 inline-flex h-10 items-center justify-center rounded-full bg-canvas text-[13px] font-semibold text-ink ring-1 ring-line">
              Your listing
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled={chat.pending}
                onClick={() => void chat.start(product.id)}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-brand-gradient px-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgb(58_63_224_/_0.75)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-70"
              >
                {chat.pending ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <MessageCircle size={16} strokeWidth={2.2} className="shrink-0" />}
                <span className="truncate">Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setCallOpen(true)}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full bg-white px-2 text-[13px] font-semibold text-ink ring-1 ring-brand-200 transition hover:bg-ink hover:text-white hover:ring-ink active:scale-[0.97]"
              >
                <Phone size={15} strokeWidth={2.2} className="shrink-0" />
                <span className="truncate">Call</span>
              </button>
              {product.sellerType !== "individual" ? <button
                type="button"
                disabled={unavailable}
                onClick={() => void addToCart()}
                aria-label="Add to cart"
                title="Add to cart"
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full ring-1 transition active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40",
                  cart === "done" ? "bg-success text-white ring-success" : "bg-brand-50 text-brand-700 ring-brand-200 hover:bg-ink hover:text-white hover:ring-ink",
                )}
              >
                {cart === "busy" ? <Loader2 size={16} className="animate-spin" /> : cart === "done" ? <Check size={16} /> : <ShoppingBag size={16} strokeWidth={2.2} />}
              </button> : null}
            </>
          )}
        </div>
        <AnimatePresence>
          {note ? (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[12px] text-brand-700" role="status">
              {note}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
      {callOpen ? <CallDialog open={callOpen} onOpenChange={setCallOpen} productId={product.id} /> : null}
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-[24px] bg-white p-2.5 ring-1 ring-line">
      <div className="skeleton aspect-[4/3.4] rounded-[18px]" />
      <div className="space-y-2.5 px-2 pt-4 pb-2">
        <div className="skeleton h-6 w-2/5 rounded" />
        <div className="skeleton h-4 w-4/5 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="grid grid-cols-[1fr_1fr_2.5rem] gap-2 pt-3"><div className="skeleton h-10 rounded-full" /><div className="skeleton h-10 rounded-full" /><div className="skeleton h-10 rounded-full" /></div>
      </div>
    </div>
  );
}

/** Horizontal product row with arrows; `autoPlay` (ms) makes it advance on its own. */
export function ProductRail({
  title,
  eyebrow,
  body,
  products,
  to,
  loading = false,
  autoPlay,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  body?: string;
  products: Listing[];
  to: string;
  loading?: boolean;
  autoPlay?: number;
}) {
  if (!loading && !products.length) return null;
  return (
    <section className="py-10">
      <SectionHeading eyebrow={eyebrow} title={title} body={body} action={{ to, label: "View all" }} />
      <Scroller itemClassName="w-[248px] sm:w-[270px]" autoPlay={loading ? undefined : autoPlay} label={typeof title === "string" ? title : eyebrow}>
        {loading
          ? Array.from({ length: 5 }, (_, index) => <ProductCardSkeleton key={index} />)
          : products.slice(0, 12).map((product) => <ProductCard key={product.id} product={product} />)}
      </Scroller>
    </section>
  );
}
