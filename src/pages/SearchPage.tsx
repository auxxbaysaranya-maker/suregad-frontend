import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, SlidersHorizontal, X } from "lucide-react";
import { api } from "../lib/api";
import { ProductCard, ProductCardSkeleton, type Listing } from "../components/ProductCard";
import { Empty, Input } from "../components/ui";
import { useLocation } from "../store/location";
import { cn } from "../lib/utils";

const RADII = [10, 25, 50, 100, 250];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const location = useLocation((state) => state.location);
  const openPicker = useLocation((state) => state.openPicker);
  // Like OLX, results default to the chosen location. "nearby=0" searches everywhere.
  const nearby = Boolean(location) && query.nearby !== "0" && !query.city;
  const radiusKm = Number(query.radiusKm) || 50;
  const apiParams = { ...query, limit: 12, ...(nearby && location ? { lat: location.lat, lng: location.lng, radiusKm } : {}) };
  delete (apiParams as Record<string, unknown>).nearby;
  const results = useQuery({
    queryKey: ["search", apiParams],
    queryFn: async () => (await api.get("/products", { params: apiParams })).data as { data: Listing[]; meta?: { total?: number; page?: number; hasMore?: boolean } },
  });
  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  }
  const items = results.data?.data || [];
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setFiltersOpen(false);
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);
  const title = query.category === "laptops" ? "Laptops" : query.category === "smartphones" ? "Smartphones" : query.q ? `“${query.q}”` : "All devices";
  const field = "w-full rounded-full bg-canvas px-4 py-2.5 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400";

  const filters = (
    <div className="space-y-3">
      <Input placeholder="Keyword" defaultValue={query.q || ""} onBlur={(event) => set("q", event.target.value)} />
      {location ? (
        <div className="rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
          <label className="flex items-center justify-between gap-2 text-[13px] font-semibold text-brand-800">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> Near {location.city}</span>
            <input type="checkbox" checked={nearby} onChange={(event) => set("nearby", event.target.checked ? "" : "0")} className="h-4 w-4 accent-[#3a3fe0]" />
          </label>
          {nearby ? (
            <select className={cn(field, "mt-2 bg-white")} value={radiusKm} onChange={(event) => set("radiusKm", event.target.value)} aria-label="Distance">
              {RADII.map((radius) => <option key={radius} value={radius}>Within {radius} km</option>)}
            </select>
          ) : null}
        </div>
      ) : (
        <button type="button" onClick={() => openPicker(true)} className="flex w-full items-center gap-2 rounded-2xl bg-brand-50 p-3 text-[13px] font-semibold text-brand-800 ring-1 ring-brand-100"><MapPin size={14} /> Set your location</button>
      )}
      <select className={field} value={query.category || ""} onChange={(event) => set("category", event.target.value)} aria-label="Category">
        <option value="">All categories</option>
        <option value="smartphones">Smartphones</option>
        <option value="laptops">Laptops</option>
      </select>
      <select className={field} value={query.sort || "recommended"} onChange={(event) => set("sort", event.target.value)} aria-label="Sort">
        <option value="recommended">Recommended</option>
        <option value="newest">Recently added</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
        <option value="views">Most viewed</option>
      </select>
      <select className={field} value={query.condition || ""} onChange={(event) => set("condition", event.target.value)} aria-label="Condition">
        <option value="">Any condition</option>
        <option value="like_new">Like new</option>
        <option value="excellent">Excellent</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
      </select>
      <Input placeholder="Brand" defaultValue={query.brand || ""} onBlur={(event) => set("brand", event.target.value)} />
      <Input placeholder="City (overrides location)" defaultValue={query.city || ""} onBlur={(event) => set("city", event.target.value)} />
      <Input placeholder="Max price ₹" inputMode="numeric" defaultValue={query.maxPrice || ""} onBlur={(event) => set("maxPrice", event.target.value)} />
      <select className={field} value={query.sellerType || ""} onChange={(event) => set("sellerType", event.target.value)} aria-label="Seller type">
        <option value="">Used and refurbished</option>
        <option value="individual">Used, individual sellers</option>
        <option value="business">Refurbished showrooms</option>
      </select>
      <label className="flex items-center gap-2.5 px-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#3a3fe0]" checked={query.inspected === "true"} onChange={(event) => set("inspected", event.target.checked ? "true" : "")} /> Inspected only</label>
      <label className="flex items-center gap-2.5 px-1 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#3a3fe0]" checked={query.verifiedSeller === "true"} onChange={(event) => set("verifiedSeller", event.target.checked ? "true" : "")} /> Verified sellers</label>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(28px,3.2vw,38px)]">
            {title} <span className="font-sans text-[15px] font-medium text-muted">({results.data?.meta?.total ?? items.length})</span>
          </h1>
          {nearby && location ? (
            <button type="button" onClick={() => set("nearby", "0")} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pr-2 pl-3 text-[13px] font-semibold text-brand-800 ring-1 ring-brand-100 hover:bg-brand-100">
              <MapPin size={13} /> Within {radiusKm} km of {location.city}
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white" aria-label="Search everywhere"><X size={12} /></span>
            </button>
          ) : null}
        </div>
        <button className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold ring-1 ring-line lg:hidden" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden h-fit rounded-[26px] bg-white p-5 ring-1 ring-line lg:sticky lg:top-36 lg:block">
          <h2 className="mb-4 text-[18px]">Filters</h2>
          {filters}
        </aside>
        <section className="space-y-6">
          {results.isError ? <Empty title="Search failed" body="The catalogue could not be loaded." /> : null}
          {!results.isLoading && !items.length ? (
            <div className="space-y-3">
              <Empty title="No devices match" body={nearby ? `Nothing within ${radiusKm} km of ${location?.city} yet. Try a wider distance or search everywhere.` : "Try another city, brand or price. New listings appear after moderation."} />
              {nearby ? <div className="text-center"><button type="button" onClick={() => set("nearby", "0")} className="rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">Search everywhere</button></div> : null}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {results.isLoading ? Array.from({ length: 6 }, (_, index) => <ProductCardSkeleton key={index} />) : items.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
          {results.data?.meta?.hasMore ? (
            <div className="text-center">
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold ring-1 ring-line hover:ring-brand-300" onClick={() => set("page", String(Number(query.page || 1) + 1))}>Next page</button>
            </div>
          ) : null}
        </section>
      </div>

      <AnimatePresence>
        {filtersOpen ? (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[3px] lg:hidden" onClick={() => setFiltersOpen(false)} />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[28px] bg-white shadow-[0_-20px_60px_-20px_rgba(16,17,55,0.5)] lg:hidden"
            >
              <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line" aria-hidden="true" />
              <div className="flex items-center justify-between px-5 pt-3 pb-3">
                <h2 className="text-[20px]">Filters</h2>
                <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full bg-canvas ring-1 ring-line transition hover:bg-ink hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{filters}</div>
              <div className="border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button type="button" onClick={() => setFiltersOpen(false)} className="w-full rounded-full bg-brand-gradient py-3.5 font-semibold text-white shadow-glow">
                  Show {results.data?.meta?.total ?? items.length} results
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
