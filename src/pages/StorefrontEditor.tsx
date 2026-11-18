import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Facebook, Globe, ImagePlus, Instagram, Loader2, Twitter, Youtube } from "lucide-react";
import { api } from "../lib/api";
import { uploadFile } from "../lib/upload";
import { useSession } from "../store/session";
import { WhatsAppGlyph } from "../components/share";
import { Empty } from "../components/ui";
import { cn } from "../lib/utils";

interface Editable {
  kind: "seller" | "store";
  businessId?: string;
  name: string;
  publicPath: string | null;
  verificationStatus?: string;
  tagline: string;
  about: string;
  hours: string;
  logo: string | null;
  banner: string | null;
  social: Record<string, string>;
}

const socialFields: { key: string; label: string; placeholder: string; icon: ReactNode }[] = [
  { key: "website", label: "Website", placeholder: "https://yourshop.in", icon: <Globe size={16} /> },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourshop", icon: <Instagram size={16} /> },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourshop", icon: <Facebook size={16} /> },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourshop", icon: <Youtube size={16} /> },
  { key: "x", label: "X", placeholder: "https://x.com/yourshop", icon: <Twitter size={16} /> },
  { key: "whatsapp", label: "WhatsApp number", placeholder: "+91 98765 43210", icon: <WhatsAppGlyph size={16} /> },
];

const field = "w-full rounded-2xl bg-canvas px-4 py-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400";

/** Lets an individual seller or a showroom owner edit the public storefront page. */
export function StorefrontEditor({ kind }: { kind: "seller" | "store" }) {
  const profile = useSession((state) => state.profile);
  const client = useQueryClient();
  const businessId = kind === "store" ? profile?.businesses?.[0]?._id : undefined;
  const editable = useQuery({
    queryKey: ["storefront-edit", kind, businessId],
    enabled: kind === "seller" || Boolean(businessId),
    retry: false,
    queryFn: async () => (await api.get("/me/storefront", { params: businessId ? { businessId } : {} })).data.data as Editable,
  });
  const [form, setForm] = useState<Editable | null>(null);
  const [logoKey, setLogoKey] = useState<string>();
  const [bannerKey, setBannerKey] = useState<string>();
  const [uploading, setUploading] = useState<"" | "logo" | "banner">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (editable.data) setForm(editable.data);
  }, [editable.data]);

  if (kind === "store" && !businessId) return <Empty title="No showroom yet" body="Register your showroom first, then come back to design its page." />;
  if (editable.isError) {
    return (
      <div className="space-y-4">
        <Empty title="No storefront yet" body={editable.error instanceof Error ? editable.error.message : "Create a seller profile first."} />
        <div className="text-center"><Link to="/become-a-seller" className="rounded-full bg-brand-gradient px-5 py-2.5 font-semibold text-white">Start selling</Link></div>
      </div>
    );
  }
  if (!form) return <div className="skeleton h-96 rounded-[28px]" />;

  async function upload(file: File, which: "logo" | "banner") {
    setUploading(which);
    setMessage(null);
    try {
      const result = await uploadFile(file, which === "logo" ? "business_logo" : "business_banner");
      if (which === "logo") setLogoKey(result.key);
      else setBannerKey(result.key);
      setForm((current) => (current ? { ...current, [which]: result.url || URL.createObjectURL(file) } : current));
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Upload failed." });
    } finally {
      setUploading("");
    }
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.patch("/me/storefront", {
        businessId,
        tagline: form.tagline,
        about: form.about,
        hours: form.kind === "store" ? form.hours : undefined,
        social: form.social,
        logoKey,
        bannerKey,
      });
      await client.invalidateQueries({ queryKey: ["storefront"] });
      setMessage({ ok: true, text: "Saved. Your public page is updated." });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof Editable, value: string) => setForm((current) => (current ? { ...current, [key]: value } : current));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px]">Your storefront</h1>
          <p className="text-[14px] text-muted">This is your page on SureGad. Share it on social media to promote your {form.kind === "store" ? "showroom" : "listings"}.</p>
        </div>
        {form.publicPath ? (
          <Link to={form.publicPath} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold ring-1 ring-line hover:ring-brand-300">
            <ExternalLink size={15} /> View public page
          </Link>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">Public after admin approval</span>
        )}
      </div>

      {form.kind === "store" ? (
        <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-line">
          <label className="relative block h-40 cursor-pointer bg-brand-gradient">
            {form.banner ? <img src={form.banner} alt="" className="h-full w-full object-cover" /> : null}
            <span className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-ink shadow-card">
              {uploading === "banner" ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Change cover
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "banner")} />
          </label>
          <div className="flex items-end gap-4 px-6 pb-5">
            <label className="relative -mt-10 grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-3xl bg-brand-gradient text-white ring-4 ring-white">
              {form.logo ? <img src={form.logo} alt="" className="h-full w-full object-cover" /> : <span className="font-display text-[30px] font-bold">{form.name.slice(0, 1)}</span>}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-[10px] font-semibold">{uploading === "logo" ? "Uploading…" : "Logo"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0], "logo")} />
            </label>
            <div className="pb-1">
              <p className="font-display text-[20px] font-bold">{form.name}</p>
              <p className="text-[13px] text-muted">{form.tagline || "Add a tagline below"}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-[28px] bg-white p-6 ring-1 ring-line">
          <p className="text-[16px] font-semibold">About</p>
          <label className="block space-y-1.5 text-[13px] font-medium">
            Tagline
            <input value={form.tagline} maxLength={120} onChange={(event) => set("tagline", event.target.value)} placeholder="e.g. Certified refurbished iPhones in Kochi" className={field} />
          </label>
          <label className="block space-y-1.5 text-[13px] font-medium">
            Description
            <textarea value={form.about} maxLength={4000} onChange={(event) => set("about", event.target.value)} rows={6} placeholder="Tell buyers who you are, what you sell and how you test devices." className={cn(field, "resize-y")} />
          </label>
          {form.kind === "store" ? (
            <label className="block space-y-1.5 text-[13px] font-medium">
              Opening hours
              <input value={form.hours} maxLength={200} onChange={(event) => set("hours", event.target.value)} placeholder="Mon–Sat 10:00–20:00, Sun closed" className={field} />
            </label>
          ) : null}
        </div>
        <div className="space-y-3 rounded-[28px] bg-white p-6 ring-1 ring-line">
          <p className="text-[16px] font-semibold">Social & contact links</p>
          <p className="text-[13px] text-muted">These appear as buttons on your page. Leave any field empty to hide it.</p>
          {socialFields.map((entry) => (
            <label key={entry.key} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">{entry.icon}</span>
              <input
                value={form.social[entry.key] || ""}
                onChange={(event) => setForm((current) => (current ? { ...current, social: { ...current.social, [entry.key]: event.target.value } } : current))}
                placeholder={entry.placeholder}
                aria-label={entry.label}
                className={field}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={saving || Boolean(uploading)} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save storefront
        </button>
        {message ? <p className={cn("text-[14px]", message.ok ? "text-success" : "text-danger")}>{message.text}</p> : null}
      </div>
    </div>
  );
}
