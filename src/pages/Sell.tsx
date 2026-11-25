import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Eye, ImagePlus, Laptop, Loader2, MapPin, MessageCircle, Pencil, Plus, RotateCcw, ShieldCheck, Smartphone, Tag, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { adminUrl } from "../lib/config";
import type { Place } from "../lib/geocode";
import { cn, money, titleCase } from "../lib/utils";
import { PhotoUploader, readyKeys, type Photo } from "../components/PhotoUploader";
import { PlaceSearch } from "../components/LocationPicker";
import { MarkSoldModal, soldLabel } from "../components/MarkSold";
import { Modal } from "../components/Modal";
import { Empty, ErrorNote } from "../components/ui";
import { toast } from "../components/Toaster";
import { useLocation } from "../store/location";
import { useSession } from "../store/session";
import type { Listing } from "../components/ProductCard";
import { ManagePhotos } from "./ProductPage";

interface OwnListing extends Listing {
  description?: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  soldOut: { at: string; reason: string; note: string; pricePaise: number | null } | null;
  views: number;
  chats: number;
}
interface Overview {
  canSell: boolean;
  limits: { activeListings: number; monthlyListings: number; photosPerListing: number; listingValidityDays: number };
  usage: { monthly: number; active: number; monthlyLeft: number; activeLeft: number };
  resetsAt: string;
  listings: OwnListing[];
}

export function useSelling() {
  return useQuery({ queryKey: ["selling"], queryFn: async () => (await api.get("/me/selling")).data.data as Overview });
}

const date = (value: string | Date) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const control = "h-12 w-full rounded-2xl bg-canvas px-4 text-[15px] ring-1 ring-line outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400";
const CONDITIONS = [["like_new", "Like new"], ["excellent", "Excellent"], ["good", "Good"], ["fair", "Fair"]] as const;

function Label({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{text}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-[28px] bg-white p-5 ring-1 ring-line sm:p-6"><h2 className="text-[19px]">{title}</h2>{children}</section>;
}

function Allowance({ data }: { data: Overview }) {
  const { usage, limits } = data;
  return (
    <div className="grid gap-3 rounded-[28px] bg-brand-50 p-5 ring-1 ring-brand-100 sm:grid-cols-3">
      <div>
        <p className="text-[12px] text-muted">This month</p>
        <p className="font-display text-[22px] font-bold">{usage.monthlyLeft} of {limits.monthlyListings} left</p>
        <p className="text-[12px] text-muted">Resets on {date(data.resetsAt)}</p>
      </div>
      <div>
        <p className="text-[12px] text-muted">Open listings</p>
        <p className="font-display text-[22px] font-bold">{usage.active} / {limits.activeListings}</p>
        <p className="text-[12px] text-muted">Live or in review</p>
      </div>
      <div>
        <p className="text-[12px] text-muted">Each listing stays live</p>
        <p className="font-display text-[22px] font-bold">{limits.listingValidityDays ? `${limits.listingValidityDays} days` : "No limit"}</p>
        <p className="text-[12px] text-muted">From approval</p>
      </div>
    </div>
  );
}

const EMPTY = { title: "", brand: "", model: "", storageGb: "", ramGb: "", colour: "", processor: "", displayInches: "", condition: "good", price: "", description: "", imei: "", serialNumber: "", pincode: "" };

/** List a device from an ordinary account. Sales happen in chat; there is no seller dashboard. */
export function SellPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const overview = useSelling();
  const here = useLocation((state) => state.location);
  const [category, setCategory] = useState<"smartphones" | "laptops">("smartphones");
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [place, setPlace] = useState<(Place & { pincode?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const brands = useQuery({ queryKey: ["brands", category], staleTime: 10 * 60_000, queryFn: async () => (await api.get("/brands", { params: { category } })).data.data as { name: string }[] });
  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const laptop = category === "laptops";

  function pickPlace(next: Place & { pincode?: string }) {
    setPlace(next);
    if (next.pincode) setForm((current) => ({ ...current, pincode: next.pincode! }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const keys = readyKeys(photos);
    if (photos.some((photo) => photo.status === "uploading")) return setError("Wait for the photos to finish uploading.");
    if (!keys.length) return setError("Add at least one photo of the device.");
    if (!place) return setError("Choose where the device is.");
    if (!/^\d{6}$/.test(form.pincode)) return setError("Enter the 6-digit PIN code.");
    setBusy(true);
    setError("");
    try {
      const city = place.city || place.district;
      await api.post("/me/selling", {
        categorySlug: category,
        title: form.title.trim(),
        description: form.description.trim(),
        condition: form.condition,
        pricePaise: Math.round(Number(form.price) * 100),
        specs: {
          brand: form.brand.trim(),
          model: form.model.trim(),
          storageGb: Number(form.storageGb),
          ramGb: Number(form.ramGb),
          ...(form.colour.trim() ? { colour: form.colour.trim() } : {}),
          ...(form.processor.trim() ? { processor: form.processor.trim() } : {}),
          ...(Number(form.displayInches) > 0 ? { displayInches: Number(form.displayInches) } : {}),
        },
        imageKeys: keys,
        location: { city, district: place.district || city, state: place.state || "Kerala", pincode: form.pincode, coordinates: { lat: place.lat, lng: place.lng } },
        imei: form.imei.trim() || undefined,
        serialNumber: form.serialNumber.trim() || undefined,
      });
      await client.invalidateQueries({ queryKey: ["selling"] });
      void useSession.getState().refresh();
      toast.success("Submitted for review", "It goes live as soon as our team approves it.");
      navigate("/account/listings");
    } catch (failure) {
      const details = (failure as { details?: { path: string; message: string }[] }).details;
      const first = Array.isArray(details) ? details[0] : null;
      setError(first ? `${titleCase(String(first.path).split(".").pop() || "")}: ${first.message}` : failure instanceof Error ? failure.message : "Could not submit the listing.");
    } finally {
      setBusy(false);
    }
  }

  const data = overview.data;
  const blocked = data && (!data.canSell || data.usage.monthlyLeft <= 0 || data.usage.activeLeft <= 0);
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-[clamp(28px,4vw,40px)]">Sell your device</h1>
        <p className="mt-1 text-[15px] text-muted">Buyers chat with you, make offers and can book an inspection. You meet, hand over and get paid directly. No fees, no dashboard.</p>
      </div>
      {overview.isLoading ? <div className="skeleton h-28 rounded-[28px]" /> : null}
      {overview.isError ? <ErrorNote error={overview.error} /> : null}
      {data && data.canSell ? <Allowance data={data} /> : null}
      {data && blocked ? (
        <div className="rounded-[28px] bg-white p-6 text-center ring-1 ring-line">
          <p className="font-display text-[20px] font-bold">{!data.canSell ? "Your showroom sells from SureGad Hub" : data.usage.monthlyLeft <= 0 ? "You've used this month's listings" : "Too many open listings"}</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-muted">
            {!data.canSell ? "List devices and stock in your seller panel." : data.usage.monthlyLeft <= 0 ? `You can list again from ${date(data.resetsAt)}.` : "Mark a device sold out or delete a listing before adding another."}
          </p>
          {data.canSell ? <Link to="/account/listings" className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">My listings</Link> : <a href={adminUrl("login")} className="mt-4 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">Open SureGad Hub</a>}
        </div>
      ) : null}
      {data && !blocked ? (
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <Section title="What are you selling?">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Category">
              {([["smartphones", "Phone", Smartphone], ["laptops", "Laptop", Laptop]] as const).map(([value, text, Icon]) => (
                <button key={value} type="button" role="radio" aria-checked={category === value} onClick={() => setCategory(value)} className={cn("flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold ring-2 transition", category === value ? "bg-brand-50 ring-brand-500" : "ring-line hover:ring-brand-200")}>
                  <Icon size={20} /> {text}
                </button>
              ))}
            </div>
            <Label text="Listing title"><input required minLength={4} maxLength={140} value={form.title} onChange={set("title")} placeholder={laptop ? "Dell Inspiron 15, 16 GB" : "Pixel 8 128 GB, Hazel"} className={control} /></Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Brand"><input required value={form.brand} onChange={set("brand")} list="sell-brands" maxLength={80} className={control} /><datalist id="sell-brands">{(brands.data || []).map((row) => <option key={row.name} value={row.name} />)}</datalist></Label>
              <Label text="Model"><input required value={form.model} onChange={set("model")} maxLength={120} className={control} /></Label>
              <Label text="RAM (GB)"><input required type="number" min={1} max={laptop ? 512 : 256} value={form.ramGb} onChange={set("ramGb")} className={control} /></Label>
              <Label text="Storage (GB)"><input required type="number" min={1} max={laptop ? 8192 : 4096} value={form.storageGb} onChange={set("storageGb")} className={control} /></Label>
              {laptop ? null : <Label text="Colour"><input required value={form.colour} onChange={set("colour")} maxLength={40} className={control} /></Label>}
              <Label text={laptop ? "Processor" : "Processor (optional)"}><input required={laptop} value={form.processor} onChange={set("processor")} maxLength={120} className={control} /></Label>
              {laptop ? <Label text="Screen (inches, optional)"><input type="number" step="0.1" min={1} max={24} value={form.displayInches} onChange={set("displayInches")} className={control} /></Label> : null}
            </div>
          </Section>
          <Section title="Photos"><PhotoUploader photos={photos} setPhotos={setPhotos} max={data.limits.photosPerListing} /></Section>
          <Section title="Condition and price">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Condition">
              {CONDITIONS.map(([value, text]) => (
                <button key={value} type="button" role="radio" aria-checked={form.condition === value} onClick={() => setForm({ ...form, condition: value })} className={cn("rounded-full py-2.5 text-[14px] font-semibold ring-1 transition", form.condition === value ? "bg-ink text-white ring-ink" : "ring-line hover:ring-brand-300")}>{text}</button>
              ))}
            </div>
            <Label text="Price (₹)"><input required type="number" min={1} max={500000} value={form.price} onChange={set("price")} className={control} /></Label>
            <Label text="Description" hint="Mention age, repairs, scratches, bill, box and accessories."><textarea required minLength={10} maxLength={8000} value={form.description} onChange={set("description")} className={cn(control, "h-auto min-h-32 py-3")} /></Label>
            <div className="grid gap-4 sm:grid-cols-2">
              {laptop ? null : <Label text="IMEI (optional)" hint="Never shown. Stops the same phone being listed twice."><input inputMode="numeric" minLength={14} maxLength={18} value={form.imei} onChange={set("imei")} className={control} /></Label>}
              <Label text="Serial number (optional)" hint="Never shown to buyers."><input minLength={4} maxLength={64} value={form.serialNumber} onChange={set("serialNumber")} className={control} /></Label>
            </div>
          </Section>
          <Section title="Where is the device?">
            <p className="text-[13px] text-muted">Buyers see only the area (about 1 km), never your exact address.</p>
            {place ? <p className="flex items-center gap-2 rounded-2xl bg-brand-50 p-3.5 text-[14px] font-semibold ring-1 ring-brand-100"><MapPin size={16} className="shrink-0 text-brand-600" /> {place.formattedAddress}</p> : null}
            <PlaceSearch onPick={pickPlace} near={here} />
            {here && !here.approximate ? <button type="button" onClick={() => pickPlace(here)} className="text-[13px] font-semibold text-brand-700">Use {here.label}</button> : null}
            <Label text="PIN code"><input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={form.pincode} onChange={set("pincode")} className={control} /></Label>
          </Section>
          {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[14px] text-danger">{error}</p> : null}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-4 font-semibold text-white shadow-glow disabled:opacity-60">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Submit for review
          </button>
        </form>
      ) : null}
    </div>
  );
}

const STATUS: Record<string, [string, string]> = {
  pending_review: ["In review", "bg-amber-50 text-amber-800 ring-amber-200"],
  active: ["Live", "bg-emerald-50 text-emerald-700 ring-emerald-200"],
  rejected: ["Rejected", "bg-red-50 text-danger ring-red-200"],
  expired: ["Expired", "bg-canvas text-muted ring-line"],
  sold: ["Sold out", "bg-canvas text-ink ring-line"],
  reserved: ["Reserved", "bg-amber-50 text-amber-800 ring-amber-200"],
};

function EditListing({ listing, onClose }: { listing: OwnListing; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState({ title: listing.title, price: String(listing.pricePaise / 100), condition: listing.condition, description: listing.description || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/products/${listing.id}`, { title: form.title.trim(), description: form.description.trim(), condition: form.condition, pricePaise: Math.round(Number(form.price) * 100) });
      await client.invalidateQueries({ queryKey: ["selling"] });
      toast.success("Changes saved", "The listing goes through a quick review again.");
      onClose();
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open onOpenChange={(open) => !open && onClose()} title="Edit listing" description="Edits are reviewed before buyers see them. They don't extend the validity.">
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <Label text="Title"><input required minLength={4} maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={control} /></Label>
        <Label text="Price (₹)"><input required type="number" min={1} max={500000} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className={control} /></Label>
        <Label text="Condition"><select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={control}>{CONDITIONS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></Label>
        <Label text="Description"><textarea required minLength={10} maxLength={8000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={cn(control, "h-auto min-h-28 py-3")} /></Label>
        {error ? <ErrorNote error={error} /> : null}
        <button type="submit" disabled={busy} className="w-full rounded-full bg-brand-gradient py-3 font-semibold text-white shadow-glow disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
      </form>
    </Modal>
  );
}

const action = "inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold ring-1 ring-line transition hover:ring-brand-300 disabled:opacity-50";

function ListingRow({ listing, onSold, onEdit, onPhotos }: { listing: OwnListing; onSold: () => void; onEdit: () => void; onPhotos: () => void }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [status, tone] = STATUS[listing.status || ""] || [titleCase(listing.status), "bg-canvas text-muted ring-line"];
  const editable = ["active", "pending_review", "rejected"].includes(listing.status || "");
  const daysLeft = listing.expiresAt ? Math.ceil((new Date(listing.expiresAt).getTime() - Date.now()) / 86_400_000) : null;
  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await task();
      toast.success(done);
    } catch {
      /* the API client already showed why */
    } finally {
      await client.invalidateQueries({ queryKey: ["selling"] });
      setBusy(false);
    }
  }
  return (
    <article className="rounded-[26px] bg-white p-4 ring-1 ring-line">
      <div className="flex gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50">{listing.images?.[0]?.url ? <img src={listing.images[0].url} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} className="text-brand-300" />}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2"><span className="min-w-0 truncate font-semibold">{listing.title}</span><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", tone)}>{status}</span></p>
          <p className="font-display text-[18px] font-bold">{money(listing.pricePaise)}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-muted">
            <span className="flex items-center gap-1"><Eye size={13} /> {listing.views}</span>
            <span className="flex items-center gap-1"><MessageCircle size={13} /> {listing.chats}</span>
            {listing.status === "active" && listing.expiresAt ? <span className={cn("flex items-center gap-1", daysLeft !== null && daysLeft <= 3 && "font-semibold text-amber-700")}><CalendarClock size={13} /> {daysLeft !== null && daysLeft <= 1 ? "Ends today" : `${daysLeft} days left`} · {date(listing.expiresAt)}</span> : null}
          </p>
          {listing.status === "rejected" && listing.rejectionReason ? <p className="mt-1 text-[13px] text-danger">{listing.rejectionReason} Edit it to send it for review again.</p> : null}
          {listing.soldOut ? <p className="mt-1 text-[13px] text-ink-soft">{soldLabel(listing.soldOut.reason)}{listing.soldOut.pricePaise ? ` for ${money(listing.soldOut.pricePaise)}` : ""} on {date(listing.soldOut.at)}{listing.soldOut.note ? ` · ${listing.soldOut.note}` : ""}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["active", "reserved", "sold"].includes(listing.status || "") ? <Link to={`/product/${listing.slug}`} className={action}><Eye size={14} /> View</Link> : null}
        {editable ? <button type="button" onClick={onEdit} className={action}><Pencil size={14} /> Edit</button> : null}
        {editable ? <button type="button" onClick={onPhotos} className={action}><ImagePlus size={14} /> Photos</button> : null}
        {["active", "pending_review"].includes(listing.status || "") ? <button type="button" onClick={onSold} className={cn(action, "bg-ink text-white ring-ink")}><Tag size={14} /> Mark sold out</button> : null}
        {listing.status === "expired" ? <button type="button" disabled={busy} onClick={() => void run(() => api.post(`/me/selling/${listing.id}/renew`), "Listing renewed")} className={cn(action, "bg-brand-gradient text-white ring-transparent")}><RotateCcw size={14} /> Renew (uses 1 listing)</button> : null}
        {listing.status !== "reserved" ? <button type="button" disabled={busy} onClick={() => window.confirm("Delete this listing? This month's slot is not given back.") && void run(() => api.post(`/products/${listing.id}/archive`), "Listing deleted")} className={cn(action, "text-danger")}><Trash2 size={14} /> Delete</button> : null}
      </div>
    </article>
  );
}

/** The user's own devices, inside their normal account. */
export function MyListingsPage() {
  const overview = useSelling();
  const client = useQueryClient();
  const [sold, setSold] = useState<OwnListing | null>(null);
  const [editing, setEditing] = useState<OwnListing | null>(null);
  const [photos, setPhotos] = useState<OwnListing | null>(null);
  const data = overview.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">My listings</h1>
        <Link to="/sell" className="inline-flex items-center gap-1.5 rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow"><Plus size={16} /> Sell a device</Link>
      </div>
      {overview.isLoading ? <div className="skeleton h-28 rounded-[28px]" /> : null}
      {overview.isError ? <ErrorNote error={overview.error} /> : null}
      {data?.canSell ? <Allowance data={data} /> : null}
      {data && !data.listings.length ? <Empty title="Nothing listed yet" body="Sell a phone or laptop from this account. Buyers reach you in chat." /> : null}
      {data?.listings.map((listing) => <ListingRow key={listing.id} listing={listing} onSold={() => setSold(listing)} onEdit={() => setEditing(listing)} onPhotos={() => setPhotos(listing)} />)}
      <p className="flex items-center gap-2 text-[12px] text-muted"><ShieldCheck size={14} className="shrink-0" /> Buyers can book an inspection. Inspection partners message you in Chats; reports appear under Inspections.</p>
      {sold ? <MarkSoldModal listing={sold} open onOpenChange={(open) => !open && setSold(null)} /> : null}
      {editing ? <EditListing listing={editing} onClose={() => setEditing(null)} /> : null}
      {photos ? <ManagePhotos product={photos} open onOpenChange={(open) => { if (!open) { setPhotos(null); void client.invalidateQueries({ queryKey: ["selling"] }); } }} /> : null}
    </div>
  );
}
