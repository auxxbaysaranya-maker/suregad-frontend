import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, Clock3, Loader2, MapPin, Search, ShieldCheck, Star, Store, UserRound, Wrench } from "lucide-react";
import { api } from "../lib/api";
import { formatDistance } from "../lib/cities";
import { cn } from "../lib/utils";
import { RADIUS_OPTIONS, useDiscovery, useLocation } from "../store/location";
import { NearbyBar } from "../components/NearbyBar";

interface SellerCard {
  id: string;
  kind: "showroom" | "seller";
  name: string;
  path: string;
  city: string | null;
  district: string | null;
  verified: boolean;
  tagline: string | null;
  logoUrl: string | null;
  categories: string[];
  liveListings: number;
  rating: number | null;
  reviews: number;
  distanceKm?: number;
}

interface PartnerCard {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  categories: string[];
  experienceYears: number;
  completed: number;
  rating: number | null;
  serviceRadiusKm: number;
  distanceKm?: number;
  coversYou: boolean | null;
}

type Page<T> = { data: T[]; meta?: { page: number; hasMore: boolean; total?: number } };

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Paged "near me" list. The query key carries the filters and the global location key, so a new
 * place, distance or filter starts again at page 1 and older responses can't replace newer ones.
 */
function useNearby<T>(endpoint: string, filters: Record<string, string>) {
  const discovery = useDiscovery();
  return useInfiniteQuery({
    queryKey: [endpoint, filters, discovery.key],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (await api.get(endpoint, { params: { ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), ...(discovery.params || {}), page: pageParam, limit: 12 } })).data as Page<T>,
    getNextPageParam: (last) => (last.meta?.hasMore ? (last.meta.page || 1) + 1 : undefined),
  });
}

function Toolbar({ q, setQ, children, placeholder }: { q: string; setQ: (value: string) => void; children?: React.ReactNode; placeholder: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="relative min-w-[220px] flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={placeholder} className="h-11 w-full rounded-full bg-white pr-4 pl-11 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
      </label>
      {children}
    </div>
  );
}

function Select({ value, onChange, children, label }: { value: string; onChange: (value: string) => void; children: React.ReactNode; label: string }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className="h-11 rounded-full bg-white px-4 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400">
      {children}
    </select>
  );
}

function Distance({ km }: { km?: number }) {
  if (typeof km !== "number") return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-800"><MapPin size={12} /> {formatDistance(km)}</span>;
}

function ListState({ loading, error, empty, emptyText, onWiden }: { loading: boolean; error: boolean; empty: boolean; emptyText: string; onWiden?: () => void }) {
  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-[24px] bg-white ring-1 ring-line" />)}</div>;
  if (error) return <p className="rounded-[24px] bg-white p-8 text-center text-[14px] text-muted ring-1 ring-line">This list couldn't be loaded. Check your connection and try again.</p>;
  if (!empty) return null;
  return (
    <div className="rounded-[24px] border border-dashed border-brand-200 bg-white p-10 text-center">
      <p className="text-[16px] font-semibold">{emptyText}</p>
      {onWiden ? <button type="button" onClick={onWiden} className="mt-4 rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">Search a wider area</button> : null}
    </div>
  );
}

function useWiden() {
  const radiusKm = useLocation((state) => state.radiusKm);
  const setRadius = useLocation((state) => state.setRadius);
  const location = useLocation((state) => state.location);
  const wider = RADIUS_OPTIONS.find((option) => option > radiusKm);
  return location && wider ? () => setRadius(wider) : undefined;
}

/* ---------------- sellers & showrooms ---------------- */

export function SellersPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const query = useNearby<SellerCard>("/discovery/sellers", { q: useDebounced(q), type, category, sort });
  const widen = useWiden();
  const items = query.data?.pages.flatMap((page) => page.data) || [];
  const location = useLocation((state) => state.location);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <h1 className="mt-3 text-[clamp(26px,3vw,36px)]">Sellers <span className="text-gradient">near you</span></h1>
      <p className="mt-1 text-[14px] text-muted">Verified showrooms and individual sellers, nearest first.</p>
      <NearbyBar className="mt-5" links={false} />
      <div className="mt-5">
        <Toolbar q={q} setQ={setQ} placeholder="Search by name, city or brand">
          <Select value={type} onChange={setType} label="Seller type">
            <option value="all">All sellers</option>
            <option value="showroom">Showrooms</option>
            <option value="seller">Individual sellers</option>
          </Select>
          <Select value={category} onChange={setCategory} label="Category">
            <option value="">All devices</option>
            <option value="smartphones">Smartphones</option>
            <option value="laptops">Laptops</option>
          </Select>
          <Select value={sort} onChange={setSort} label="Sort">
            {location ? <option value="">Nearest first</option> : <option value="">Top rated</option>}
            {location ? <option value="rating">Top rated</option> : null}
            <option value="name">Name</option>
          </Select>
        </Toolbar>
      </div>
      <div className="mt-5">
        <ListState loading={query.isLoading} error={query.isError} empty={!items.length} emptyText={location ? "No sellers found in this area." : "No sellers match."} onWiden={widen} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((seller) => (
            <Link key={`${seller.kind}-${seller.id}`} to={seller.path} className="group flex flex-col rounded-[24px] bg-white p-5 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-brand-200">
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-600">
                  {seller.logoUrl ? <img src={seller.logoUrl} alt="" className="h-full w-full object-cover" /> : seller.kind === "showroom" ? <Building2 size={24} /> : <UserRound size={24} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[16px] font-semibold group-hover:text-brand-700">{seller.name}</span>{seller.verified ? <BadgeCheck size={16} className="shrink-0 text-brand-600" aria-label="Verified" /> : null}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{seller.kind === "showroom" ? "Showroom" : "Individual seller"}{seller.city ? ` · ${seller.city}` : ""}</span>
                </span>
                <Distance km={seller.distanceKm} />
              </div>
              {seller.tagline ? <p className="mt-3 line-clamp-2 text-[13px] text-ink-soft">{seller.tagline}</p> : null}
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1"><Store size={14} /> {seller.liveListings} live listing{seller.liveListings === 1 ? "" : "s"}</span>
                {seller.rating ? <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {seller.rating} ({seller.reviews})</span> : null}
              </div>
            </Link>
          ))}
        </div>
        {query.hasNextPage ? (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300">
              {query.isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null} Load more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- inspection partners (service providers) ---------------- */

export function PartnersPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const query = useNearby<PartnerCard>("/discovery/partners", { q: useDebounced(q), category, sort });
  const widen = useWiden();
  const items = query.data?.pages.flatMap((page) => page.data) || [];
  const location = useLocation((state) => state.location);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <h1 className="mt-3 text-[clamp(26px,3vw,36px)]">Inspection partners <span className="text-gradient">near you</span></h1>
      <p className="mt-1 text-[14px] text-muted">Verified technicians who inspect devices before you buy. Book one from any listing.</p>
      <NearbyBar className="mt-5" links={false} />
      <div className="mt-5">
        <Toolbar q={q} setQ={setQ} placeholder="Search by name or city">
          <Select value={category} onChange={setCategory} label="Expertise">
            <option value="">Phones and laptops</option>
            <option value="smartphones">Phone experts</option>
            <option value="laptops">Laptop experts</option>
          </Select>
          <Select value={sort} onChange={setSort} label="Sort">
            {location ? <option value="">Nearest first</option> : <option value="">Most inspections</option>}
            {location ? <option value="rating">Most inspections</option> : null}
            <option value="name">Name</option>
          </Select>
        </Toolbar>
      </div>
      <div className="mt-5">
        <ListState loading={query.isLoading} error={query.isError} empty={!items.length} emptyText={location ? "No verified partners in this area yet." : "No partners match."} onWiden={widen} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((partner) => (
            <article key={partner.id} className="flex flex-col rounded-[24px] bg-white p-5 ring-1 ring-line">
              <div className="flex items-start gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Wrench size={24} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><span className="truncate text-[16px] font-semibold">{partner.name}</span><ShieldCheck size={16} className="shrink-0 text-success" aria-label="Verified partner" /></span>
                  <span className="mt-0.5 block text-[13px] text-muted">{partner.city || partner.district || "Kerala"}</span>
                </span>
                <Distance km={partner.distanceKm} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {partner.categories.map((category) => <span key={category} className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-semibold ring-1 ring-line">{category === "smartphones" ? "Phones" : category === "laptops" ? "Laptops" : category}</span>)}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1"><Clock3 size={14} /> {partner.experienceYears} yrs experience</span>
                <span>{partner.completed} inspections</span>
                {partner.rating ? <span className="inline-flex items-center gap-1"><Star size={14} className="fill-amber-400 text-amber-400" /> {partner.rating}</span> : null}
              </div>
              {partner.coversYou !== null ? (
                <p className={cn("mt-3 rounded-xl px-3 py-2 text-[12px] font-semibold", partner.coversYou ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800")}>
                  {partner.coversYou ? "Covers your area" : `Usually works within ${partner.serviceRadiusKm} km of ${partner.city || "their base"}`}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        {query.hasNextPage ? (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300">
              {query.isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null} Load more
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
