import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDiscovery } from "../store/location";
import { Link, useLocation as useRouterLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ImagePlus,
  BadgeCheck,
  SendHorizontal,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  HandCoins,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { api } from "../lib/api";
import { money, titleCase, cn } from "../lib/utils";
import { timeAgo } from "../lib/time";
import { findCity } from "../lib/cities";
import { settlePayment } from "../lib/payments";
import { Button, Empty, ErrorNote, Field } from "../components/ui";
import { ProductCard, specChips, useDistance, type Listing } from "../components/ProductCard";
import { Scroller } from "../components/Scroller";
import { ListingMap } from "../components/ListingMap";
import { InspectionModal } from "../components/InspectionModal";
import { CallDialog, useStartChat } from "../components/contact";
import { ShareButton } from "../components/share";
import { ProductGallery } from "../components/ProductGallery";
import { PhotoUploader, photosFromListing, readyKeys, type Photo } from "../components/PhotoUploader";
import { Modal } from "../components/Modal";
import { BackButton } from "../components/navigation";
import { useSession } from "../store/session";

export { settlePayment };

interface ProductPayload {
  product: Listing & { description?: string; businessId?: string };
  seller?: { slug: string; displayName: string; city?: string; verified?: boolean; memberSince?: string } | null;
  business?: { slug: string; name: string; verified?: boolean; city?: string; hours?: string } | null;
  reviews: { rating: number; body: string; verifiedPurchase?: boolean; inspectionOnly?: boolean; sellerReply?: string }[];
  similar: Listing[];
  history?: { id: string; title: string; status: string; city?: string; createdAt: string }[];
}

const QUICK_QUESTIONS = ["Is it still available?", "Is the price negotiable?", "Can I see it today?", "Any repairs or scratches?"];

/** Lets the seller add, remove and reorder photos on their own listing. */
function ManagePhotos({ product, open, onOpenChange }: { product: Listing & { images?: { key?: string; url?: string }[] }; open: boolean; onOpenChange: (open: boolean) => void }) {
  const client = useQueryClient();
  const [photos, setPhotos] = useState<Photo[]>(() => photosFromListing(product.images));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setPhotos(photosFromListing(product.images));
      setError("");
    }
  }, [open, product.images]);
  const uploading = photos.some((photo) => photo.status === "uploading");
  async function save() {
    const keys = readyKeys(photos);
    if (!keys.length) {
      setError("Keep at least one photo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put(`/products/${product.id}/images`, { imageKeys: keys });
      await client.invalidateQueries({ queryKey: ["product", product.slug] });
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save photos.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Manage photos" description="Add, remove or reorder photos. The first photo is the cover." size="lg">
      <PhotoUploader photos={photos} setPhotos={setPhotos} max={20} />
      {product.status === "active" ? <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800 ring-1 ring-amber-200">Changing photos sends the listing back for a quick review before it shows again.</p> : null}
      {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="rounded-full bg-white py-3 font-semibold ring-1 ring-line">Cancel</button>
        <button type="button" disabled={uploading || saving} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 font-semibold text-white shadow-glow disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : null} {uploading ? "Uploading…" : "Save photos"}
        </button>
      </div>
    </Modal>
  );
}

/** Inspection status, or a prominent prompt to book one with the cheapest plan price. */
function InspectionCard({ item, onRequest }: { item: Listing; onRequest: () => void }) {
  const inspection = item.inspection;
  const plans = useQuery({
    queryKey: ["inspection-plans", item.categorySlug],
    enabled: !inspection?.inspected,
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get("/inspection-plans", { params: { category: item.categorySlug } })).data.data as { pricePaise: number; checklist: unknown[] }[],
  });
  if (inspection?.inspected) {
    return (
      <div className={cn("flex items-start gap-3 rounded-[30px] p-5 ring-1", inspection.critical ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200")}>
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white", inspection.critical ? "bg-amber-500" : "bg-emerald-500")}>
          {inspection.critical ? <ShieldAlert size={21} /> : <ShieldCheck size={21} />}
        </span>
        <div className="flex-1 text-[13px]">
          <p className={cn("text-[15px] font-semibold", inspection.critical ? "text-amber-900" : "text-emerald-900")}>
            {inspection.critical ? "Inspection found a critical issue" : `Inspected by a partner${inspection.score !== undefined ? ` · score ${inspection.score}` : ""}`}
          </p>
          <p className="mt-0.5 text-muted">The report records the device on the day of the visit. It is not a warranty.</p>
          {inspection.reportId ? <Link to={`/account/inspections/${inspection.reportId}`} className="mt-2 inline-flex font-semibold text-brand-700">View report →</Link> : null}
        </div>
      </div>
    );
  }
  const prices = (plans.data || []).map((plan) => plan.pricePaise);
  const from = prices.length ? Math.min(...prices) : null;
  const checks = Math.max(0, ...(plans.data || []).map((plan) => plan.checklist.length));
  return (
    <div className="relative isolate overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#e9fbf2_0%,#f4fdf8_60%,#ffffff_100%)] p-5 ring-1 ring-emerald-200">
      <ShieldCheck aria-hidden="true" size={120} strokeWidth={1} className="absolute -right-6 -bottom-8 -z-10 text-emerald-200" />
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-[0_10px_24px_-10px_rgba(16,160,90,0.7)]"><ShieldCheck size={21} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-emerald-950">Not sure about the condition?</p>
          <p className="mt-0.5 text-[13px] text-emerald-900/70">
            An approved partner checks the device in person{checks ? ` (up to ${checks} points)` : ""} and files a report before you pay.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        {from !== null ? (
          <p className="text-[12px] text-emerald-900/70">from <span className="font-display text-[22px] font-bold text-emerald-950">{money(from)}</span></p>
        ) : <span />}
        <button type="button" onClick={onRequest} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(16,160,90,0.8)] transition hover:bg-emerald-700">
          <ShieldCheck size={16} /> Request inspection
        </button>
      </div>
    </div>
  );
}

/** Quick questions plus a free-text box; either opens the chat with that first message. */
function AskSeller({ productId }: { productId: string }) {
  const chat = useStartChat();
  const [text, setText] = useState("");
  return (
    <div className="rounded-[30px] bg-white p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-[15px] font-semibold"><MessageCircle size={17} className="text-brand-600" /> Ask the seller</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_QUESTIONS.map((question) => (
          <button key={question} type="button" disabled={chat.pending} onClick={() => void chat.start(productId, { message: question })} className="rounded-full bg-brand-50 px-3 py-1.5 text-[12px] font-medium text-brand-800 ring-1 ring-brand-100 transition hover:bg-brand-100">
            {question}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) void chat.start(productId, { message: text.trim() });
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write your own question…" aria-label="Message to seller" className="min-w-0 flex-1 rounded-full bg-canvas px-4 py-2.5 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
        <button type="submit" disabled={!text.trim() || chat.pending} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow disabled:opacity-40">
          {chat.pending ? <Loader2 size={16} className="animate-spin" /> : <SendHorizontal size={17} />}
        </button>
      </form>
      {chat.error ? <p className="mt-2 text-[13px] text-danger">{chat.error}</p> : null}
    </div>
  );
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const profile = useSession((state) => state.profile);
  const chat = useStartChat();
  const [callOpen, setCallOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [cartState, setCartState] = useState<"idle" | "busy" | "done">("idle");
  const [cartError, setCartError] = useState<unknown>(null);
  // The active location only shapes distance and "similar near you"; it is never saved on the listing.
  const discovery = useDiscovery();
  const product = useQuery({
    queryKey: ["product", slug, discovery.key],
    queryFn: async () => (await api.get(`/products/${slug}`, { params: discovery.params || {} })).data.data as ProductPayload,
    placeholderData: keepPreviousData,
  });
  const item = product.data?.product;
  const distance = useDistance(item?.geo, item?.distanceKm);
  useEffect(() => {
    if (!item?.id) return;
    const current = JSON.parse(localStorage.getItem("sg_viewed") || "[]") as string[];
    localStorage.setItem("sg_viewed", JSON.stringify([item.id, ...current.filter((id) => id !== item.id)].slice(0, 8)));
    void api.post(`/products/${item.slug}/view`).catch(() => undefined);
  }, [item?.id, item?.slug]);
  const mapPoint = useMemo(() => {
    if (item?.geo) return { ...item.geo, cityCentre: false };
    const city = findCity(item?.city);
    return city ? { lat: city.lat, lng: city.lng, cityCentre: true } : null;
  }, [item?.geo, item?.city]);

  if (product.isLoading) {
    return (
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="skeleton aspect-[4/3.2] rounded-[30px]" />
        <div className="space-y-4"><div className="skeleton h-8 w-2/3 rounded" /><div className="skeleton h-12 w-1/3 rounded" /><div className="skeleton h-40 rounded-3xl" /></div>
      </div>
    );
  }
  if (product.isError || !product.data || !item) return <div className="mx-auto max-w-[1280px] px-4 py-10"><Empty title="Listing unavailable" body="This device is not public." /></div>;

  const unavailable = item.status === "sold" || item.status === "reserved";
  const ownListing = Boolean(profile && item.sellerUserId === profile.id);
  const chips = specChips(item);
  const sellerName = product.data.business?.name || product.data.seller?.displayName || "Seller";
  const sellerVerified = product.data.business?.verified || product.data.seller?.verified;

  async function addToCart() {
    if (!profile) return navigate("/login");
    setCartState("busy");
    setCartError(null);
    try {
      await api.post("/cart/items", { productId: item!.id });
      await client.invalidateQueries({ queryKey: ["cart"] });
      setCartState("done");
    } catch (reason) {
      setCartState("idle");
      setCartError(reason);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-24 lg:pb-10">
      <div className="mb-5 flex items-center gap-3">
        <BackButton variant="icon" />
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-[13px] text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-ink">Home</Link>
        <ChevronRight size={14} />
        <Link to={`/search?category=${item.categorySlug}`} className="hover:text-ink">{item.categorySlug === "laptops" ? "Laptops" : "Phones"}</Link>
        <ChevronRight size={14} />
        <span className="truncate text-ink">{item.title}</span>
        </nav>
      </div>

      {/* grid-cols-1 = minmax(0,1fr): keeps the single phone column exactly screen-wide */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
        <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">
          <ProductGallery
            images={item.images || []}
            title={item.title}
            laptop={item.categorySlug === "laptops"}
            badge={<span className="rounded-full bg-ink/80 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">{item.sellerType === "business" ? "Refurbished" : "Used"}</span>}
          />
        </div>

        <div className="order-3 min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">

          <section className="rounded-[28px] bg-white p-6 ring-1 ring-line">
            <h2 className="text-[22px]">Description</h2>
            <p className="mt-3 text-[15px] leading-7 whitespace-pre-wrap text-ink-soft">{item.description}</p>
            {(product.data.history || []).length ? (
              <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-[13px] text-muted">Earlier listings of this device on SureGad: {product.data.history!.map((row) => titleCase(row.status)).join(", ")}</p>
            ) : null}
          </section>

          <section className="rounded-[28px] bg-white p-6 ring-1 ring-line">
            <h2 className="text-[22px]">Specifications</h2>
            <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
              {Object.entries(item.specs || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 border-b border-line py-3 text-[14px]">
                  <dt className="text-muted">{titleCase(key.replace(/Gb$/, " (GB)").replace(/Inches$/, " (in)"))}</dt>
                  <dd className="text-right font-semibold">{specText(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {mapPoint ? (
            <section>
              <h2 className="mb-4 text-[22px]">Location</h2>
              <ListingMap lat={mapPoint.lat} lng={mapPoint.lng} cityCentre={mapPoint.cityCentre} label={[...new Set([item.city, item.district, item.state].filter(Boolean))].join(", ") || "Listing area"} />
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-[22px]">Reviews</h2>
            <div className="space-y-3">
              {product.data.reviews.length ? (
                product.data.reviews.map((review, index) => (
                  <article key={index} className="rounded-3xl bg-white p-5 text-[14px] ring-1 ring-line">
                    <p className="font-semibold">
                      {"★".repeat(review.rating)}<span className="text-line">{"★".repeat(5 - review.rating)}</span>
                      {review.verifiedPurchase ? <span className="ml-2 text-[12px] font-semibold text-emerald-700">Verified purchase</span> : null}
                    </p>
                    <p className="mt-2 text-ink-soft">{review.body}</p>
                    {review.sellerReply ? <p className="mt-3 rounded-2xl bg-canvas px-4 py-2.5 text-muted">Seller: {review.sellerReply}</p> : null}
                  </article>
                ))
              ) : (
                <Empty title="No reviews yet" body="Purchase reviews open only after a delivered order." />
              )}
            </div>
          </section>
        </div>

        {/* action panel: right column on desktop, directly under the photos on phones */}
        <aside className="order-2 min-w-0 space-y-4 lg:sticky lg:top-36 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* 1 · summary + contact */}
          <div className="rounded-[30px] bg-white p-6 shadow-card ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">{titleCase(item.condition)}</span>
                {chips.map((chip) => <span key={chip} className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-medium text-ink-soft ring-1 ring-line">{chip}</span>)}
              </div>
              <ShareButton iconOnly title={item.title} text={`${item.title} for ${money(item.pricePaise)} on SureGad`} url={`/product/${item.slug}`} className="shrink-0" />
            </div>
            <h1 className="mt-3 text-[clamp(24px,2.6vw,32px)] leading-tight">{item.title}</h1>
            <p className="mt-3 font-display text-[36px] leading-none font-extrabold tracking-tight">{money(item.pricePaise)}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="flex items-center gap-1"><MapPin size={14} /> {item.city || "City not listed"}{distance ? ` · ${distance} away` : ""}</span>
              {item.createdAt ? <span className="flex items-center gap-1"><Clock3 size={14} /> Posted {timeAgo(item.createdAt).toLowerCase()}</span> : null}
            </p>
            {unavailable ? <p className="mt-3 rounded-2xl bg-canvas px-4 py-2.5 text-[13px] font-semibold text-ink">This device is {item.status}.</p> : null}

            {ownListing ? (
              <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-[14px] text-brand-800 ring-1 ring-brand-100">
                This is your listing. Buyer messages arrive in <Link to="/chat?box=selling" className="font-semibold underline">your chats</Link>.
                <button type="button" onClick={() => setPhotosOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-[14px] font-semibold text-ink ring-1 ring-brand-200 transition hover:ring-brand-400">
                  <ImagePlus size={16} /> Manage photos ({(item.images || []).length})
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] bg-canvas p-2 ring-1 ring-line">
                <p className="px-2 pt-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Contact the seller</p>
                <button
                  type="button"
                  disabled={chat.pending}
                  onClick={() => void chat.start(item.id)}
                  className="group flex w-full items-center gap-3 rounded-[20px] bg-brand-gradient p-3 pr-4 text-left text-white shadow-glow transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
                    {chat.pending ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">Chat with seller</span>
                    <span className="block truncate text-[12px] text-white/75">Ask questions, see more photos, agree a price</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCallOpen(true)} className="group flex items-center gap-2.5 rounded-[18px] bg-white p-3 text-left ring-1 ring-line transition hover:ring-brand-300">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition group-hover:bg-ink group-hover:text-white"><Phone size={17} /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink">Call</span>
                      <span className="block truncate text-[11px] text-muted">View number</span>
                    </span>
                  </button>
                  <button type="button" disabled={unavailable || chat.pending} onClick={() => void chat.start(item.id, { offer: true })} className="group flex items-center gap-2.5 rounded-[18px] bg-white p-3 text-left ring-1 ring-line transition hover:ring-brand-300 disabled:opacity-50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 transition group-hover:bg-ink group-hover:text-white"><HandCoins size={17} /></span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink">Make an offer</span>
                      <span className="block truncate text-[11px] text-muted">Name your price</span>
                    </span>
                  </button>
                </div>
                {chat.error ? <p className="px-2 pt-2 text-[13px] text-danger">{chat.error}</p> : null}
              </div>
            )}
          </div>

          {/* 2 · buy (highlighted) */}
          {!ownListing ? (
            <div className="relative isolate overflow-hidden rounded-[30px] bg-ink p-6 text-white shadow-lift">
              <div aria-hidden="true" className="absolute -top-20 -right-16 -z-10 h-56 w-56 rounded-full bg-violet/50 blur-3xl" />
              <div aria-hidden="true" className="absolute -bottom-24 -left-16 -z-10 h-56 w-56 rounded-full bg-azure/40 blur-3xl" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-200 ring-1 ring-white/15">
                    <ShieldCheck size={13} /> BUY SECURELY ON SUREGAD
                  </p>
                  <p className="mt-3 font-display text-[30px] leading-none font-extrabold">{money(item.pricePaise)}</p>
                </div>
                <ShoppingBag size={34} className="shrink-0 text-white/25" />
              </div>
              <ul className="mt-4 space-y-2 text-[13px] text-white/80">
                {["Marked paid only after the gateway verifies payment", "Pickup, or delivery arranged with the seller", "Request a refund from your orders if something's wrong"].map((perk) => (
                  <li key={perk} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" /> {perk}</li>
                ))}
              </ul>
              <div className="mt-5 grid grid-cols-[1.3fr_1fr] gap-2">
                <button
                  type="button"
                  disabled={unavailable}
                  onClick={() => (profile ? navigate("/checkout", { state: { productIds: [item.id] } }) : navigate("/login"))}
                  className="flex items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-40"
                >
                  Buy now <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  disabled={unavailable || cartState === "busy"}
                  onClick={() => void addToCart()}
                  className={cn("flex items-center justify-center gap-1.5 rounded-full py-3.5 text-[14px] font-semibold transition disabled:opacity-40", cartState === "done" ? "bg-success text-white" : "bg-white text-ink hover:bg-brand-50")}
                >
                  {cartState === "busy" ? <Loader2 size={15} className="animate-spin" /> : cartState === "done" ? <Check size={15} /> : <ShoppingBag size={15} />}
                  {cartState === "done" ? "In cart" : "Add to cart"}
                </button>
              </div>
              {cartState === "done" ? <Link to="/cart" className="mt-3 block text-center text-[13px] font-semibold text-brand-200 hover:text-white">Go to cart →</Link> : null}
              {cartError ? <div className="mt-3"><ErrorNote error={cartError} /></div> : null}
            </div>
          ) : null}

          {/* 3 · inspection */}
          <InspectionCard item={item} onRequest={() => setInspectOpen(true)} />

          {/* 4 · ask the seller */}
          {!ownListing ? <AskSeller productId={item.id} /> : null}

          <div className="rounded-[30px] bg-white p-5 ring-1 ring-line">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-white">
                {product.data.business ? <Store size={20} /> : <UserRound size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold">
                  {sellerName}
                  {sellerVerified ? <BadgeCheck size={16} className="shrink-0 text-brand-600" aria-label="Verified" /> : null}
                </p>
                <p className="text-[12px] text-muted">
                  {product.data.business ? "Showroom" : "Individual seller"}
                  {product.data.seller?.memberSince ? ` · on SureGad since ${new Date(product.data.seller.memberSince).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
            </div>
            {product.data.business || product.data.seller ? (
              <Link
                to={product.data.business ? `/store/${product.data.business.slug}` : `/seller/${product.data.seller!.slug}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-full bg-canvas py-2.5 text-[13px] font-semibold ring-1 ring-line transition hover:ring-brand-300"
              >
                {product.data.business ? "Visit showroom page" : "See seller's page"} <ArrowRight size={14} />
              </Link>
            ) : null}
            {!sellerVerified ? <p className="mt-3 text-[12px] text-muted">This seller isn't verified yet.</p> : null}
          </div>

          {profile && !ownListing ? <PriceAlert productId={item.id} /> : null}
        </aside>
      </div>

      {product.data.similar.length ? (
        <section className="mt-14">
          <h2 className="mb-5 text-[26px]">Similar devices</h2>
          <Scroller itemClassName="w-[248px] sm:w-[270px]" label="Similar devices">
            {product.data.similar.map((entry) => <ProductCard key={entry.id} product={entry} />)}
          </Scroller>
        </section>
      ) : null}

      {/* phone action bar (replaces the tab bar on this page) */}
      {!ownListing ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
            <button type="button" disabled={chat.pending} onClick={() => void chat.start(item.id)} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand-gradient text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgb(58_63_224_/_0.7)]">
              {chat.pending ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />} Chat
            </button>
            <button type="button" onClick={() => setCallOpen(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold ring-1 ring-line">
              <Phone size={14} /> Call
            </button>
            <button type="button" onClick={() => setInspectOpen(true)} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-emerald-50 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <ShieldCheck size={14} /> Inspect
            </button>
          </div>
        </div>
      ) : null}

      {ownListing ? <ManagePhotos product={item} open={photosOpen} onOpenChange={setPhotosOpen} /> : null}
      <CallDialog open={callOpen} onOpenChange={setCallOpen} productId={item.id} sellerName={sellerName} />
      <InspectionModal open={inspectOpen} onOpenChange={setInspectOpen} product={{ id: item.id, title: item.title, categorySlug: item.categorySlug, city: item.city, geo: item.geo }} />
    </div>
  );
}

function specText(value: unknown): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.available === "boolean") return record.available ? "Yes" : "No";
    return Object.values(record).map(String).join(", ");
  }
  return String(value);
}

function PriceAlert({ productId }: { productId: string }) {
  const [rupees, setRupees] = useState("");
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  return (
    <div className="rounded-[30px] bg-white p-5 ring-1 ring-line">
      <p className="flex items-center gap-2 text-[14px] font-semibold"><Bell size={16} className="text-brand-600" /> Price alert</p>
      <p className="mt-0.5 text-[12px] text-muted">Get notified if the price drops to your target.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void api
            .post("/me/price-alerts", { productId, targetPaise: Math.round(Number(rupees) * 100) })
            .then(() => setState("saved"))
            .catch(() => setState("error"));
        }}
      >
        <input value={rupees} onChange={(event) => setRupees(event.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="Target price ₹" aria-label="Target price in rupees" className="min-w-0 flex-1 rounded-full bg-canvas px-4 py-2.5 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
        <button disabled={!rupees} className="rounded-full bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-40">{state === "saved" ? "Saved" : "Watch"}</button>
      </form>
      {state === "error" ? <p className="mt-2 text-[12px] text-danger">Could not save the alert.</p> : null}
    </div>
  );
}

export function CartPage() {
  const cart = useQuery({ queryKey: ["cart"], queryFn: async () => (await api.get("/cart")).data.data as { items: { productId: string; title: string; pricePaise: number; available: boolean; city?: string; image?: string }[] } });
  const navigate = useNavigate();
  if (cart.isLoading) return <p className="mx-auto max-w-[1280px] px-4 py-8">Loading cart…</p>;
  const items = cart.data?.items || [];
  const total = items.reduce((sum, item) => sum + (item.available ? item.pricePaise : 0), 0);
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-[34px]">Your cart</h1>
      {!items.length ? <Empty title="Cart is empty" body="Add a device from its listing page." /> : null}
      {items.map((item) => (
        <div key={item.productId} className="flex items-center gap-4 rounded-3xl bg-white p-4 ring-1 ring-line">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50">{item.image ? <img src={item.image} alt="" className="h-[85%] w-[85%] object-contain" /> : null}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.title}</p>
            <p className="text-sm text-muted">{item.city} · {item.available ? "Available" : "Unavailable"}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold">{money(item.pricePaise)}</p>
            <button className="text-sm text-danger" onClick={() => api.delete(`/cart/items/${item.productId}`).then(() => cart.refetch())}>Remove</button>
          </div>
        </div>
      ))}
      {items.length ? <Button onClick={() => navigate("/checkout")}>Checkout · {money(total)}</Button> : null}
    </div>
  );
}

export function CheckoutPage() {
  const routerState = (useRouterLocation().state || {}) as { productIds?: string[]; offerId?: string };
  const direct = Boolean(routerState.productIds?.length);
  const cart = useQuery({ queryKey: ["cart"], enabled: !direct, queryFn: async () => (await api.get("/cart")).data.data as { items: { productId: string; available: boolean }[] } });
  const ids = direct ? routerState.productIds! : (cart.data?.items || []).filter((item) => item.available).map((item) => item.productId);
  const products = useQuery({
    queryKey: ["checkout-products", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => (await api.get("/products", { params: { ids: ids.join(",") } })).data.data as Listing[],
  });
  const offer = useQuery({
    queryKey: ["checkout-offer", routerState.offerId],
    enabled: Boolean(routerState.offerId),
    // The server re-checks the offer at checkout; this only drives the summary.
    queryFn: async () => (await api.get(`/chat/offers/${routerState.offerId}`)).data.data as { id: string; amountPaise: number; status: string },
  });
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: async () => (await api.get("/me/addresses")).data.data as { _id: string; label: string; city: string; line1: string }[] });
  const [addressId, setAddressId] = useState("");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("pickup");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const listTotal = (products.data || []).reduce((sum, item) => sum + item.pricePaise, 0);
  const total = offer.data ? offer.data.amountPaise : listTotal;
  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const response = await api.post("/checkout", { fulfillment, addressId: addressId || undefined, productIds: ids, offerId: routerState.offerId });
      await settlePayment(response.data.data.payment, Boolean(response.data.data.mock || response.data.data.payment.provider === "mock"));
      setDone(response.data.data.number);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  const select = "w-full rounded-full bg-canvas px-4 py-3 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400";
  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white"><Check size={38} strokeWidth={3} /></span>
        <h1 className="mt-5 text-[30px]">Order {done} is paid</h1>
        <p className="mt-2 text-muted">Payment was verified by the server. The seller will confirm pickup or delivery.</p>
        <Link to="/account/orders" className="mt-6 inline-flex rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow">View orders</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_1fr]">
      <div className="space-y-4">
        <h1 className="text-[34px]">Checkout</h1>
        <div className="space-y-3 rounded-[28px] bg-white p-5 ring-1 ring-line">
          <Field label="Fulfilment">
            <select className={select} value={fulfillment} onChange={(event) => setFulfillment(event.target.value as "delivery" | "pickup")}>
              <option value="pickup">Pickup from the seller</option>
              <option value="delivery">Delivery request</option>
            </select>
          </Field>
          {fulfillment === "delivery" ? <p className="text-xs text-muted">Delivery is a request to the seller. SureGad has not booked a courier.</p> : null}
          {fulfillment === "delivery" ? (
            <Field label="Saved address">
              <select className={select} value={addressId} onChange={(event) => setAddressId(event.target.value)}>
                <option value="">Choose</option>
                {(addresses.data || []).map((address) => <option key={address._id} value={address._id}>{address.label} · {address.line1}, {address.city}</option>)}
              </select>
            </Field>
          ) : null}
        </div>
      </div>
      <div className="h-fit space-y-4 rounded-[28px] bg-white p-5 shadow-card ring-1 ring-line md:mt-14">
        <p className="font-display text-[18px] font-bold">Order summary</p>
        {(products.data || []).map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50">{item.images?.[0]?.url ? <img src={item.images[0].url} alt="" className="h-[85%] w-[85%] object-contain" /> : null}</span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{item.title}</span>
            <span className={cn("text-[14px] font-semibold", offer.data && "text-muted line-through")}>{money(item.pricePaise)}</span>
          </div>
        ))}
        {!ids.length && !cart.isLoading ? <p className="text-[14px] text-muted">Nothing to check out.</p> : null}
        {offer.data ? (
          <p className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-2.5 text-[13px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <span className="flex items-center gap-1.5"><HandCoins size={15} /> Accepted offer price</span> {money(offer.data.amountPaise)}
          </p>
        ) : null}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-muted">Total</span>
          <span className="font-display text-[26px] font-extrabold">{money(total)}</span>
        </div>
        <Button className="w-full" disabled={busy || !ids.length} onClick={() => void pay()}>{busy ? "Processing…" : `Pay ${money(total)}`}</Button>
        {error ? <ErrorNote error={error} /> : null}
        <p className="text-xs text-muted">If the gateway is not configured, checkout stops with an error and the device is not marked sold.</p>
      </div>
    </div>
  );
}
