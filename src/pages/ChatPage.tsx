import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  Clock3,
  ExternalLink,
  Flag,
  HandCoins,
  ImagePlus,
  Info,
  Loader2,
  MessageCircle,
  MessagesSquare,
  MoreVertical,
  Phone,
  Search,
  SendHorizontal,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { uploadFile } from "../lib/upload";
import { clock, dayLabel, inboxTime, lastSeen } from "../lib/time";
import { cn, money, titleCase } from "../lib/utils";
import { useSession } from "../store/session";
import { MobileTabs, SiteHeader } from "../components/layout";
import { Modal } from "../components/Modal";
import { MarkSoldModal } from "../components/MarkSold";
import { CallDialog } from "../components/contact";
import { DeviceFallback } from "../components/illustrations";
import { BackButton } from "../components/navigation";
import type { ChatMessage, ChatOffer } from "../components/RealtimeBridge";

interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  pricePaise: number;
  status: string;
  condition?: string;
  sellerType?: string;
  city?: string;
  image: string | null;
  available: boolean;
}
interface UserSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  online: boolean;
  lastSeenAt: string | null;
  memberSince: string | null;
}
interface ConversationItem {
  id: string;
  role: "buying" | "selling" | "inspection";
  product: ProductSummary | null;
  other: UserSummary;
  lastPreview: string;
  lastMessageAt: string;
  lastFromMe: boolean;
  unread: number;
  important: boolean;
  blocked: boolean;
  offer: ChatOffer | null;
}
interface ConversationDetail {
  id: string;
  role: "buying" | "selling" | "inspection";
  product: ProductSummary | null;
  other: UserSummary;
  important: boolean;
  blockedByMe: boolean;
  blockedByOther: boolean;
  canCall: boolean;
  offer: ChatOffer | null;
  offerHoldHours: number;
}

const BUYER_REPLIES = ["Is it still available?", "Is the price negotiable?", "Can I see it today?", "Any scratches or repairs?", "Is the bill or box included?"];
const INSPECTION_REPLIES = ["When can you visit?", "Please share your availability.", "The device is ready.", "Can we change the time?"];
const SELLER_REPLIES = ["Yes, it's available.", "The price is slightly negotiable.", "Sorry, the price is fixed.", "You can see it today.", "Please make an offer."];

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function Avatar({ user, size = 44, ring = false }: { user: UserSummary; size?: number; ring?: boolean }) {
  return (
    <span className="relative inline-grid shrink-0" style={{ width: size, height: size }}>
      {user.photoUrl ? (
        <img src={user.photoUrl} alt="" className={cn("h-full w-full rounded-full object-cover", ring && "ring-2 ring-white")} />
      ) : (
        <span className={cn("grid h-full w-full place-items-center rounded-full bg-brand-gradient font-display font-bold text-white", ring && "ring-2 ring-white")} style={{ fontSize: size * 0.4 }}>
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {user.online ? <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" aria-label="Online" /> : null}
    </span>
  );
}

function ProductThumb({ product, className }: { product: ProductSummary | null; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50", className)}>
      {product?.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <DeviceFallback className="scale-[0.55]" />}
    </span>
  );
}

function offerLabel(offer: ChatOffer) {
  const states: Record<ChatOffer["status"], string> = {
    pending: "Offer pending",
    accepted: "Offer accepted",
    rejected: "Offer declined",
    withdrawn: "Offer withdrawn",
    superseded: "Offer replaced",
    expired: "Offer expired",
    purchased: "Purchased",
  };
  return states[offer.status];
}

function offerTone(status: ChatOffer["status"]) {
  if (status === "accepted" || status === "purchased") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-canvas text-muted ring-line";
}

/* ───────────────────────── Inbox ───────────────────────── */

function Inbox({ activeId, className }: { activeId?: string; className?: string }) {
  const [params, setParams] = useSearchParams();
  const box = (params.get("box") as "all" | "buying" | "selling" | "inspection") || "all";
  const [filter, setFilter] = useState<"all" | "unread" | "important" | "offers">("all");
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["chat-list", box, filter, q],
    queryFn: async () => (await api.get("/chat/conversations", { params: { box, filter, q: q || undefined } })).data.data as ConversationItem[],
    placeholderData: (previous) => previous,
  });
  const unread = useQuery({ queryKey: ["chat-unread"], queryFn: async () => (await api.get("/chat/unread")).data.data as { count: number } });
  const [typing, setTyping] = useState<Record<string, number>>({});
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onTyping = (payload: { conversationId: string; typing: boolean }) =>
      setTyping((current) => ({ ...current, [payload.conversationId]: payload.typing ? Date.now() : 0 }));
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:typing", onTyping);
    };
  }, []);
  const items = list.data || [];
  return (
    <aside className={cn("min-h-0 w-full flex-col border-line md:w-[380px] md:shrink-0 md:border-r", className)}>
      <div className="shrink-0 space-y-3 px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><BackButton variant="icon" /><h1 className="text-[26px]">Chats</h1></div>
          {unread.data?.count ? <span className="rounded-full bg-brand-gradient px-2.5 py-1 text-[12px] font-bold text-white">{unread.data.count} unread</span> : null}
        </div>
        <div className="flex rounded-full bg-canvas p-1 ring-1 ring-line" role="tablist">
          {(["all", "buying", "selling", "inspection"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={box === key}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (key === "all") next.delete("box");
                else next.set("box", key);
                setParams(next, { replace: true });
              }}
              className={cn("relative flex-1 rounded-full py-2 text-[13px] font-semibold transition", box === key ? "text-white" : "text-ink-soft hover:text-ink")}
            >
              {box === key ? <motion.span layoutId="chat-box" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <span className="relative">{key === "inspection" ? "Inspect" : titleCase(key)}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by name or device" aria-label="Search chats" className="w-full rounded-full bg-canvas py-2.5 pr-4 pl-10 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {([["all", "All"], ["unread", "Unread"], ["important", "Starred"], ["offers", "Offers"]] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ring-1 transition", filter === key ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-white text-ink-soft ring-line hover:ring-brand-200")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-28 md:pb-2">
        {list.isLoading ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex gap-3 rounded-2xl p-3">
                <div className="skeleton h-14 w-14 rounded-2xl" />
                <div className="flex-1 space-y-2 py-1"><div className="skeleton h-3.5 w-1/2 rounded" /><div className="skeleton h-3 w-4/5 rounded" /></div>
              </div>
            ))}
          </div>
        ) : !items.length ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600"><MessagesSquare size={28} /></span>
            <p className="mt-4 font-display text-[18px] font-bold">{q || filter !== "all" ? "No chats match" : box === "selling" ? "No buyer messages yet" : "No chats yet"}</p>
            <p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">
              {box === "selling" ? "When buyers message you about a listing, it shows up here." : "Tap Chat on any listing to ask the seller about the device."}
            </p>
            {box !== "selling" ? <Link to="/search" className="mt-5 inline-flex rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-semibold text-white shadow-glow">Browse devices</Link> : null}
          </div>
        ) : (
          <ul className="space-y-0.5 px-2">
            {items.map((item) => {
              const active = item.id === activeId;
              const isTyping = typing[item.id] && Date.now() - typing[item.id] < 5000;
              return (
                <li key={item.id}>
                  <Link
                    to={`/chat/${item.id}${box !== "all" ? `?box=${box}` : ""}`}
                    className={cn("group flex gap-3 rounded-2xl p-3 transition", active ? "bg-brand-50" : "hover:bg-canvas")}
                  >
                    <span className="relative">
                      <ProductThumb product={item.product} className="h-14 w-14" />
                      <span className="absolute -right-1.5 -bottom-1.5"><Avatar user={item.other} size={26} ring /></span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-[15px]", item.unread ? "font-bold text-ink" : "font-semibold text-ink")}>{item.other.name}</span>
                        <span className={cn("shrink-0 text-[11px]", item.unread ? "font-semibold text-brand-600" : "text-muted")}>{inboxTime(item.lastMessageAt)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 truncate text-[12px] text-muted">
                        <span className={cn("rounded px-1 text-[10px] font-bold uppercase", item.role === "buying" ? "bg-azure/10 text-azure" : item.role === "inspection" ? "bg-emerald-50 text-emerald-700" : "bg-violet/10 text-violet")}>{item.role === "buying" ? "Buy" : item.role === "inspection" ? "Inspect" : "Sell"}</span>
                        <span className="truncate">{item.product?.title || "Listing removed"}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-[13px]", isTyping ? "font-medium text-brand-600" : item.unread ? "font-semibold text-ink" : "text-muted")}>
                          {isTyping ? "typing…" : item.blocked ? "Blocked" : `${item.lastFromMe ? "You: " : ""}${item.lastPreview || "Say hello 👋"}`}
                        </span>
                        {item.offer && (item.offer.status === "pending" || item.offer.status === "accepted") ? (
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1", offerTone(item.offer.status))}>{money(item.offer.amountPaise)}</span>
                        ) : null}
                        {item.important ? <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" /> : null}
                        {item.unread ? <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-gradient px-1.5 text-[11px] font-bold text-white">{item.unread}</span> : null}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

/* ───────────────────────── Thread ───────────────────────── */

function OfferBubble({ offer, mine, me, detail, onCounter }: { offer: ChatOffer; mine: boolean; me: string; detail: ConversationDetail; onCounter: () => void }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const respond = useMutation({
    mutationFn: async (action: "accept" | "reject" | "withdraw") => api.post(`/chat/offers/${offer.id}/respond`, { action }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["chat-messages", detail.id] });
      void client.invalidateQueries({ queryKey: ["chat", detail.id] });
    },
    onError: (reason) => setError(errorText(reason, "Could not update the offer.")),
  });
  const off = Math.round((1 - offer.amountPaise / offer.listPricePaise) * 100);
  const iAmBuyer = me === offer.buyerId;
  const byBuyer = offer.createdBy === offer.buyerId;
  const label = mine ? (byBuyer ? "Your offer" : "Your counter-offer") : byBuyer ? "Buyer's offer" : "Seller's counter-offer";
  const chatOnly = detail.product?.sellerType === "individual";
  const canBuy = !chatOnly && offer.status === "accepted" && iAmBuyer && (!offer.expiresAt || new Date(offer.expiresAt) > new Date()) && detail.product?.available;
  return (
    <div className={cn("w-[270px] overflow-hidden rounded-3xl ring-1", mine ? "bg-ink text-white ring-ink" : "bg-white text-ink ring-line")}>
      <div className={cn("flex items-center gap-2 px-4 pt-3.5 text-[12px] font-semibold", mine ? "text-white/70" : "text-muted")}>
        <HandCoins size={15} /> {label}
      </div>
      <div className="px-4 pt-1 pb-3">
        <p className="font-display text-[30px] leading-tight font-extrabold">{money(offer.amountPaise)}</p>
        <p className={cn("text-[12px]", mine ? "text-white/60" : "text-muted")}>
          <span className="line-through">{money(offer.listPricePaise)}</span> {off > 0 ? `· ${off}% below list price` : "· list price"}
        </p>
        <span className={cn("mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1", offerTone(offer.status))}>{offerLabel(offer)}</span>
        {offer.status === "accepted" && offer.expiresAt ? (
          <p className={cn("mt-1.5 text-[11px]", mine ? "text-white/60" : "text-muted")}>
            {chatOnly ? "Price held until" : "Buy at this price until"} {new Date(offer.expiresAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
          </p>
        ) : null}
      </div>
      {offer.status === "pending" && !detail.blockedByMe && !detail.blockedByOther ? (
        <div className={cn("grid gap-1.5 border-t p-2.5", mine ? "border-white/10" : "border-line")}>
          {mine ? (
            <button type="button" disabled={respond.isPending} onClick={() => respond.mutate("withdraw")} className="rounded-full bg-white/10 py-2 text-[13px] font-semibold text-white hover:bg-white/20">
              Withdraw offer
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" disabled={respond.isPending} onClick={() => respond.mutate("reject")} className="rounded-full bg-canvas py-2 text-[13px] font-semibold text-ink ring-1 ring-line hover:ring-red-300">
                  Decline
                </button>
                <button type="button" disabled={respond.isPending} onClick={() => respond.mutate("accept")} className="flex items-center justify-center gap-1 rounded-full bg-brand-gradient py-2 text-[13px] font-semibold text-white shadow-glow">
                  {respond.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept
                </button>
              </div>
              <button type="button" onClick={onCounter} className="rounded-full py-1.5 text-[12px] font-semibold text-brand-700 hover:bg-brand-50">
                Make a counter-offer
              </button>
            </>
          )}
        </div>
      ) : null}
      {canBuy ? (
        <div className={cn("border-t p-2.5", mine ? "border-white/10" : "border-line")}>
          <button
            type="button"
            onClick={() => navigate("/checkout", { state: { productIds: [offer.productId], offerId: offer.id } })}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-2.5 text-[14px] font-semibold text-white shadow-glow"
          >
            <ShoppingBag size={15} /> Buy for {money(offer.amountPaise)}
          </button>
        </div>
      ) : null}
      {error ? <p className="px-4 pb-3 text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

function Ticks({ message, otherId }: { message: ChatMessage; otherId: string }) {
  if (message.pending) return <Clock3 size={13} className="text-muted" aria-label="Sending" />;
  return message.readBy.includes(otherId) ? (
    <CheckCheck size={15} className="text-azure" aria-label="Read" />
  ) : (
    <Check size={15} className="text-muted" aria-label="Sent" />
  );
}

function ReportDialog({ open, onOpenChange, conversationId }: { open: boolean; onOpenChange: (open: boolean) => void; conversationId: string }) {
  const [reason, setReason] = useState("Spam or scam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const report = useMutation({
    mutationFn: async () => api.post(`/chat/conversations/${conversationId}/report`, { reason: `${reason}${details ? `: ${details}` : ""}` }),
    onSuccess: () => setDone(true),
  });
  return (
    <Modal open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setDone(false); }} title="Report this chat" description="Our support team reviews every report." size="sm">
      {done ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={26} /></span>
          <p className="text-[14px] text-muted">Thanks. You can also block this person from the chat menu.</p>
          <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-full bg-ink py-3 font-semibold text-white">Done</button>
        </div>
      ) : (
        <div className="space-y-3">
          {["Spam or scam", "Asked to pay before seeing the device", "Offensive messages", "Fake or misleading listing", "Something else"].map((option) => (
            <label key={option} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition", reason === option ? "bg-brand-50 ring-brand-300" : "ring-line hover:ring-brand-200")}>
              <input type="radio" name="reason" checked={reason === option} onChange={() => setReason(option)} className="accent-[#3a3fe0]" />
              <span className="text-[14px] font-medium">{option}</span>
            </label>
          ))}
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add details (optional)" className="min-h-20 w-full rounded-2xl bg-canvas p-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
          {report.isError ? <p className="text-[13px] text-danger">{errorText(report.error, "Report failed.")}</p> : null}
          <button type="button" disabled={report.isPending} onClick={() => report.mutate()} className="w-full rounded-full bg-danger py-3 font-semibold text-white disabled:opacity-60">Submit report</button>
        </div>
      )}
    </Modal>
  );
}

function suggestions(detail: ConversationDetail, me: string): number[] {
  const list = detail.product?.pricePaise || 0;
  const round = (paise: number) => Math.max(100, Math.round(paise / 10000) * 10000);
  const pending = detail.offer?.status === "pending" && detail.offer.createdBy !== me ? detail.offer : null;
  if (detail.role === "selling" && pending) return [round((pending.amountPaise + list) / 2), round(list * 0.95), list].filter((value, index, all) => value > pending.amountPaise && all.indexOf(value) === index);
  return [round(list * 0.95), round(list * 0.9), round(list * 0.85)].filter((value, index, all) => all.indexOf(value) === index);
}

function Composer({ detail, me, mode, setMode, onSent }: { detail: ConversationDetail; me: string; mode: "chat" | "offer"; setMode: (mode: "chat" | "offer") => void; onSent: () => void }) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const [rupees, setRupees] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const typingSent = useRef(0);
  const stopTimer = useRef<number>(undefined);
  const list = detail.product?.pricePaise || 0;
  const options = useMemo(() => suggestions(detail, me), [detail, me]);
  useEffect(() => () => window.clearTimeout(stopTimer.current), []);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
  }, [text]);

  function signalTyping() {
    const socket = getSocket();
    if (!socket) return;
    if (Date.now() - typingSent.current > 2500) {
      socket.emit("chat:typing", { conversationId: detail.id, typing: true });
      typingSent.current = Date.now();
    }
    window.clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => {
      socket.emit("chat:typing", { conversationId: detail.id, typing: false });
      typingSent.current = 0;
    }, 3000);
  }

  async function sendText(body: string) {
    const value = body.trim();
    if (!value) return;
    setError("");
    setText("");
    const temp: ChatMessage = { id: `temp-${Date.now()}`, conversationId: detail.id, senderId: me, kind: "text", body: value, imageUrl: null, offer: null, readBy: [me], createdAt: new Date().toISOString(), pending: true };
    client.setQueryData<ChatMessage[]>(["chat-messages", detail.id], (current) => [...(current || []), temp]);
    onSent();
    getSocket()?.emit("chat:typing", { conversationId: detail.id, typing: false });
    try {
      const saved = (await api.post(`/chat/conversations/${detail.id}/messages`, { body: value })).data.data as ChatMessage;
      client.setQueryData<ChatMessage[]>(["chat-messages", detail.id], (current) => {
        const rest = (current || []).filter((message) => message.id !== temp.id);
        return rest.some((message) => message.id === saved.id) ? rest : [...rest, saved];
      });
    } catch (reason) {
      client.setQueryData<ChatMessage[]>(["chat-messages", detail.id], (current) => (current || []).filter((message) => message.id !== temp.id));
      setText(value);
      setError(errorText(reason, "Message not sent."));
    }
  }

  async function sendImage(file: File) {
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "chat_image");
      await api.post(`/chat/conversations/${detail.id}/messages`, { imageKey: uploaded.key });
      onSent();
    } catch (reason) {
      setError(errorText(reason, "Photo not sent."));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const offer = useMutation({
    mutationFn: async (amountPaise: number) => api.post(`/chat/conversations/${detail.id}/offers`, { amountPaise }),
    onSuccess: () => {
      setRupees("");
      setMode("chat");
      onSent();
      void client.invalidateQueries({ queryKey: ["chat", detail.id] });
    },
    onError: (reason) => setError(errorText(reason, "Offer not sent.")),
  });
  const amount = Math.round(Number(rupees.replace(/[^\d.]/g, "")) * 100);
  const offerError = !rupees ? "" : amount > list ? "An offer can't be above the listed price." : amount < list * 0.1 ? "That offer is too low for this listing." : "";

  if (detail.blockedByMe || detail.blockedByOther) {
    return <BlockedBar detail={detail} />;
  }
  const canOffer = detail.role !== "inspection" && Boolean(detail.product?.available);
  return (
    <div className="shrink-0 border-t border-line bg-white px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
      {canOffer ? (
        <div className="mb-2 flex justify-center">
          <div className="flex rounded-full bg-canvas p-1 ring-1 ring-line" role="tablist">
            {([["chat", "Chat", MessageCircle], ["offer", detail.role === "selling" ? "Counter-offer" : "Make offer", HandCoins]] as const).map(([key, label, Icon]) => (
              <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={cn("relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition", mode === key ? "text-white" : "text-ink-soft")}>
                {mode === key ? <motion.span layoutId="composer-mode" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                <Icon size={14} className="relative" />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {mode === "offer" && canOffer ? (
          <motion.div key="offer" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }} className="space-y-3 pb-1">
            <p className="text-center text-[12px] text-muted">Listed at <span className="font-semibold text-ink">{money(list)}</span>. If the {detail.role === "selling" ? "buyer" : "seller"} accepts, {detail.product?.sellerType === "individual" ? "the price is held for" : "the buyer can check out at this price for"} {detail.offerHoldHours} hours.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {options.map((value) => (
                <button key={value} type="button" onClick={() => setRupees(String(value / 100))} className={cn("rounded-full px-3.5 py-1.5 text-[13px] font-semibold ring-1 transition", amount === value ? "bg-brand-gradient text-white ring-transparent" : "bg-white text-ink ring-line hover:ring-brand-300")}>
                  {money(value)}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (amount > 0 && !offerError) offer.mutate(amount);
              }}
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-[18px] font-bold text-muted">₹</span>
                <input inputMode="numeric" value={rupees} onChange={(event) => setRupees(event.target.value.replace(/[^\d]/g, ""))} placeholder="Your price" aria-label="Offer amount in rupees" className="w-full rounded-full bg-canvas py-3 pr-4 pl-9 font-display text-[18px] font-bold ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <button type="submit" disabled={!amount || Boolean(offerError) || offer.isPending} className="flex h-12 items-center gap-2 rounded-full bg-brand-gradient px-5 text-[14px] font-semibold text-white shadow-glow disabled:opacity-50">
                {offer.isPending ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />} Send offer
              </button>
            </form>
            {offerError ? <p className="text-center text-[12px] text-danger">{offerError}</p> : null}
          </motion.div>
        ) : (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
            <div className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3 sm:-mx-4 sm:px-4">
              {(detail.role === "inspection" ? INSPECTION_REPLIES : detail.role === "buying" ? BUYER_REPLIES : SELLER_REPLIES).map((reply) => (
                <button key={reply} type="button" onClick={() => void sendText(reply)} className="shrink-0 rounded-full bg-brand-50 px-3.5 py-1.5 text-[13px] font-medium text-brand-800 ring-1 ring-brand-100 transition hover:bg-brand-100">
                  {reply}
                </button>
              ))}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendText(text);
              }}
            >
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && void sendImage(event.target.files[0])} />
              <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} aria-label="Send a photo" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft ring-1 ring-line transition hover:text-brand-600">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={19} />}
              </button>
              <textarea
                ref={area}
                rows={1}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  signalTyping();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendText(text);
                  }
                }}
                placeholder="Type a message"
                aria-label="Message"
                className="max-h-[140px] min-h-11 flex-1 resize-none rounded-[22px] bg-canvas px-4 py-2.5 text-[15px] leading-6 ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-white shadow-glow transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none">
                <SendHorizontal size={19} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      {error ? <p className="mt-2 text-center text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

function BlockedBar({ detail }: { detail: ConversationDetail }) {
  const client = useQueryClient();
  const unblock = useMutation({
    mutationFn: async () => api.post(`/chat/conversations/${detail.id}/block`, { blocked: false }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["chat", detail.id] }),
  });
  return (
    <div className="shrink-0 border-t border-line bg-canvas px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-[14px] text-muted">
      {detail.blockedByMe ? (
        <>
          You blocked {detail.other.name}.{" "}
          <button type="button" onClick={() => unblock.mutate()} className="font-semibold text-brand-700 underline">Unblock</button>
        </>
      ) : (
        "You can't reply to this conversation."
      )}
    </div>
  );
}

function ThreadMenu({ detail, onReport, onDelete }: { detail: ConversationDetail; onReport: () => void; onDelete: () => void }) {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["chat", detail.id] });
    void client.invalidateQueries({ queryKey: ["chat-list"] });
  };
  const item = "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium outline-none data-[highlighted]:bg-canvas";
  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-canvas" aria-label="More options">
        <MoreVertical size={19} />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={6} className="z-[70] w-56 rounded-2xl bg-white p-1.5 shadow-lift ring-1 ring-line data-[state=open]:animate-[fade-in_0.15s_ease]">
          {detail.product ? (
            <Dropdown.Item asChild className={item}>
              <Link to={`/product/${detail.product.slug}`}><ExternalLink size={16} /> View listing</Link>
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item className={item} onSelect={() => void api.patch(`/chat/conversations/${detail.id}`, { important: !detail.important }).then(refresh)}>
            <Star size={16} className={detail.important ? "fill-amber-400 text-amber-400" : ""} /> {detail.important ? "Remove star" : "Star chat"}
          </Dropdown.Item>
          <Dropdown.Item className={item} onSelect={() => void api.post(`/chat/conversations/${detail.id}/block`, { blocked: !detail.blockedByMe }).then(refresh)}>
            <Ban size={16} /> {detail.blockedByMe ? "Unblock user" : "Block user"}
          </Dropdown.Item>
          <Dropdown.Item className={item} onSelect={onReport}>
            <Flag size={16} /> Report
          </Dropdown.Item>
          <Dropdown.Separator className="my-1 h-px bg-line" />
          <Dropdown.Item className={cn(item, "text-danger")} onSelect={onDelete}>
            <Trash2 size={16} /> Delete chat
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

function Thread({ id }: { id: string }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params] = useSearchParams();
  const me = useSession((state) => state.profile?.id || "");
  const [mode, setMode] = useState<"chat" | "offer">(params.get("compose") === "offer" ? "offer" : "chat");
  const [typing, setTyping] = useState(false);
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: string | null } | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(true);
  const [callOpen, setCallOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [soldOpen, setSoldOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const detail = useQuery({ queryKey: ["chat", id], queryFn: async () => (await api.get(`/chat/conversations/${id}`)).data.data as ConversationDetail });
  const messages = useQuery({ queryKey: ["chat-messages", id], queryFn: async () => (await api.get(`/chat/conversations/${id}/messages`)).data.data as ChatMessage[] });
  const data = detail.data;
  const other = data ? { ...data.other, ...(presence || {}) } : null;

  // Typing and presence for this thread.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    let clear: number | undefined;
    const onTyping = (payload: { conversationId: string; typing: boolean }) => {
      if (payload.conversationId !== id) return;
      setTyping(payload.typing);
      window.clearTimeout(clear);
      if (payload.typing) clear = window.setTimeout(() => setTyping(false), 5000);
    };
    const onPresence = (payload: { userId: string; online: boolean; lastSeenAt: string | null }) => {
      if (payload.userId === detail.data?.other.id) setPresence({ online: payload.online, lastSeenAt: payload.lastSeenAt });
    };
    const onMessage = (payload: { conversationId: string; message: ChatMessage }) => {
      if (payload.conversationId === id && payload.message.senderId !== me) setTyping(false);
    };
    socket.on("chat:typing", onTyping);
    socket.on("chat:presence", onPresence);
    socket.on("chat:message", onMessage);
    return () => {
      window.clearTimeout(clear);
      socket.off("chat:typing", onTyping);
      socket.off("chat:presence", onPresence);
      socket.off("chat:message", onMessage);
    };
  }, [id, me, detail.data?.other.id]);

  // Read receipts: mark incoming messages read while the thread is open and visible.
  const unreadIncoming = (messages.data || []).some((message) => message.senderId !== me && !message.pending && !message.readBy.includes(me));
  useEffect(() => {
    if (!unreadIncoming) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      // Clear the row's badge right away; the server confirms below.
      client.setQueriesData<ConversationItem[]>({ queryKey: ["chat-list"] }, (current) => current?.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
      void api.post(`/chat/conversations/${id}/read`).then(() => {
        client.setQueryData<ChatMessage[]>(["chat-messages", id], (current) => current?.map((message) => (message.readBy.includes(me) ? message : { ...message, readBy: [...message.readBy, me] })));
        void client.invalidateQueries({ queryKey: ["chat-unread"] });
        void client.invalidateQueries({ queryKey: ["chat-list"] });
      });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [unreadIncoming, id, me, client]);

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.data, typing]);

  const remove = useMutation({
    mutationFn: async () => api.delete(`/chat/conversations/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["chat-list"] });
      void client.invalidateQueries({ queryKey: ["chat-unread"] });
      navigate("/chat");
    },
  });

  if (detail.isError) {
    return (
      <section className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <p className="font-display text-[20px] font-bold">Chat unavailable</p>
          <p className="mt-1 text-[14px] text-muted">{errorText(detail.error, "This conversation could not be opened.")}</p>
          <Link to="/chat" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">Back to chats</Link>
        </div>
      </section>
    );
  }

  const product = data?.product;
  const offer = data?.offer;
  const chatOnly = product?.sellerType === "individual";
  const acceptedForMe = offer && offer.status === "accepted" && offer.buyerId === me && (!offer.expiresAt || new Date(offer.expiresAt) > new Date()) && product?.available;
  const rows = messages.data || [];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[radial-gradient(120%_60%_at_50%_0%,#f4f2ff_0%,#f9f8fe_60%,#fbfaff_100%)]">
      {/* header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-white/90 px-2 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur sm:px-4 md:pt-2.5">
        <Link to="/chat" className="grid h-10 w-10 place-items-center rounded-full hover:bg-canvas md:hidden" aria-label="Back to chats"><ArrowLeft size={20} /></Link>
        {other ? <Avatar user={other} size={42} /> : <span className="skeleton h-[42px] w-[42px] rounded-full" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[16px] font-bold">{other?.name || " "}</p>
          <p className={cn("truncate text-[12px]", typing ? "font-semibold text-brand-600" : other?.online ? "text-emerald-600" : "text-muted")}>
            {typing ? "typing…" : other ? lastSeen(other.online, other.lastSeenAt) : ""}
          </p>
        </div>
        {data?.canCall && product ? (
          <button type="button" onClick={() => setCallOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-canvas" aria-label="Call seller"><Phone size={19} /></button>
        ) : null}
        {data ? (
          <button
            type="button"
            aria-label={data.important ? "Remove star" : "Star chat"}
            onClick={() => void api.patch(`/chat/conversations/${id}`, { important: !data.important }).then(() => { void client.invalidateQueries({ queryKey: ["chat", id] }); void client.invalidateQueries({ queryKey: ["chat-list"] }); })}
            className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-canvas"
          >
            <Star size={19} className={data.important ? "fill-amber-400 text-amber-400" : "text-ink"} />
          </button>
        ) : null}
        {data ? <ThreadMenu detail={data} onReport={() => setReportOpen(true)} onDelete={() => setDeleteOpen(true)} /> : null}
      </header>

      {/* listing strip */}
      {product ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-white px-3 py-2.5 sm:px-4">
          <Link to={`/product/${product.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
            <ProductThumb product={product} className="h-12 w-12 rounded-xl" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold">{product.title}</span>
              <span className="flex items-center gap-2 text-[13px]">
                {acceptedForMe ? (
                  <>
                    <span className="font-display font-bold text-emerald-700">{money(offer!.amountPaise)}</span>
                    <span className="text-muted line-through">{money(product.pricePaise)}</span>
                  </>
                ) : (
                  <span className="font-display font-bold">{money(product.pricePaise)}</span>
                )}
                {!product.available ? <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">{product.status === "sold" ? "Sold" : product.status === "reserved" ? "Reserved" : "Unavailable"}</span> : null}
                {offer && (offer.status === "pending" || offer.status === "accepted") ? <span className={cn("hidden rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline", offerTone(offer.status))}>{offerLabel(offer)}</span> : null}
              </span>
            </span>
          </Link>
          {data?.role === "selling" && chatOnly && product.available ? (
            <button type="button" onClick={() => setSoldOpen(true)} className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">Mark sold</button>
          ) : null}
          {data?.role === "buying" && product.available ? (
            chatOnly ? (
              <button type="button" onClick={() => setMode("offer")} className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">Make offer</button>
            ) : acceptedForMe ? (
              <button type="button" onClick={() => navigate("/checkout", { state: { productIds: [product.id], offerId: offer!.id } })} className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow">
                <ShoppingBag size={15} /> Buy now
              </button>
            ) : (
              <div className="flex shrink-0 gap-1.5">
                <button type="button" onClick={() => setMode("offer")} className="hidden rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line hover:ring-brand-300 sm:block">Make offer</button>
                <button type="button" onClick={() => navigate("/checkout", { state: { productIds: [product.id] } })} className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">Buy now</button>
              </div>
            )
          ) : null}
        </div>
      ) : null}

      {/* messages */}
      <div
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6"
      >
        <AnimatePresence>
          {safetyOpen ? (
            <motion.div exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="mx-auto mb-4 flex max-w-md items-start gap-3 rounded-2xl bg-white p-3.5 text-[12px] leading-5 text-ink-soft shadow-card ring-1 ring-line">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-success" />
              <p className="flex-1">
                <span className="font-semibold text-ink">Stay safe.</span> {chatOnly ? "Meet in a public place, check the device, and pay the owner only when it's in your hands. Never send an advance." : "Meet in a public place, check the device before you pay, and never send money outside SureGad."} Unsure? Book an inspection from the listing.
              </p>
              <button type="button" onClick={() => setSafetyOpen(false)} aria-label="Dismiss" className="shrink-0 text-muted hover:text-ink"><X size={15} /></button>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {messages.isLoading ? (
          <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-brand-600" /></div>
        ) : !rows.length ? (
          <div className="py-12 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-brand-600 shadow-card"><MessageCircle size={24} /></span>
            <p className="mt-3 font-semibold">Start the conversation</p>
            <p className="text-[13px] text-muted">Tap a quick reply below or write your own question.</p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {rows.map((message, index) => {
              const previous = rows[index - 1];
              const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              const mine = message.senderId === me;
              const grouped = previous && !newDay && previous.senderId === message.senderId && previous.kind !== "system" && message.kind !== "system";
              return (
                <Fragment key={message.id}>
                  {newDay ? (
                    <li className="pointer-events-none sticky top-1 z-10 flex justify-center py-2">
                      <span className="rounded-full bg-ink/75 px-3 py-1 text-[11px] font-semibold text-white shadow-card backdrop-blur-md">{dayLabel(message.createdAt)}</span>
                    </li>
                  ) : null}
                  {message.kind === "system" ? (
                    <li className="flex justify-center py-1.5">
                      <span className="flex max-w-sm items-start gap-2 rounded-2xl bg-brand-50 px-3.5 py-2 text-center text-[12px] leading-5 text-brand-800 ring-1 ring-brand-100">
                        <Info size={14} className="mt-0.5 shrink-0" /> {message.body}
                      </span>
                    </li>
                  ) : (
                    <motion.li
                      initial={message.pending ? { opacity: 0, y: 8, scale: 0.98 } : false}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cn("flex", mine ? "justify-end" : "justify-start", !grouped && "pt-2")}
                    >
                      <div className={cn("flex max-w-[82%] flex-col sm:max-w-[68%]", mine ? "items-end" : "items-start")}>
                        {message.kind === "offer" && message.offer && data ? (
                          <OfferBubble offer={message.offer} mine={mine} me={me} detail={data} onCounter={() => setMode("offer")} />
                        ) : message.kind === "image" && message.imageUrl ? (
                          <a href={message.imageUrl} target="_blank" rel="noreferrer" className={cn("overflow-hidden rounded-3xl ring-1", mine ? "ring-brand-300" : "ring-line")}>
                            <img src={message.imageUrl} alt="Shared photo" className="max-h-72 w-auto max-w-full object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <div
                            className={cn(
                              "px-4 py-2.5 text-[15px] leading-6 break-words whitespace-pre-wrap",
                              mine ? "rounded-[22px] rounded-br-md bg-brand-gradient text-white shadow-[0_8px_20px_-12px_rgba(58,63,224,0.8)]" : "rounded-[22px] rounded-bl-md bg-white text-ink shadow-card ring-1 ring-line",
                              grouped && (mine ? "rounded-tr-md" : "rounded-tl-md"),
                            )}
                          >
                            {message.body}
                          </div>
                        )}
                        <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-muted">
                          {clock(message.createdAt)}
                          {mine && other ? <Ticks message={message} otherId={other.id} /> : null}
                        </span>
                      </div>
                    </motion.li>
                  )}
                </Fragment>
              );
            })}
          </ol>
        )}
        <AnimatePresence>
          {typing ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex">
              <span className="flex items-center gap-1 rounded-[22px] rounded-bl-md bg-white px-4 py-3.5 shadow-card ring-1 ring-line" aria-label={`${other?.name} is typing`}>
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-2 w-2 rounded-full bg-brand-400" style={{ animation: `typing-dot 1.2s ${dot * 0.15}s infinite ease-in-out` }} />
                ))}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {data ? (
        <Composer
          detail={data}
          me={me}
          mode={mode}
          setMode={setMode}
          onSent={() => {
            stickToBottom.current = true;
          }}
        />
      ) : null}

      {product ? <CallDialog open={callOpen} onOpenChange={setCallOpen} productId={product.id} sellerName={other?.name} /> : null}
      {product && chatOnly && data?.role === "selling" ? (
        <MarkSoldModal listing={product} open={soldOpen} onOpenChange={setSoldOpen} conversation={{ id, buyerName: other?.name || "this buyer", agreedPaise: offer?.status === "accepted" ? offer.amountPaise : undefined }} />
      ) : null}
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} conversationId={id} />
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete this chat?" description="It's removed from your inbox only. If they message again, it comes back." size="sm">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-full bg-white py-3 font-semibold ring-1 ring-line">Cancel</button>
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()} className="rounded-full bg-danger py-3 font-semibold text-white disabled:opacity-60">Delete</button>
        </div>
      </Modal>
    </section>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function ChatPage() {
  const { id } = useParams();
  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <div className={cn("shrink-0", id && "hidden md:block")}>
        <SiteHeader />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 md:px-4 md:py-5">
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white md:rounded-[28px] md:shadow-card md:ring-1 md:ring-line">
          <Inbox activeId={id} className={id ? "hidden md:flex" : "flex"} />
          {id ? (
            <Thread key={id} id={id} />
          ) : (
            <section className="hidden flex-1 place-items-center bg-[radial-gradient(120%_80%_at_50%_0%,#f1eeff_0%,#fbfaff_70%)] p-10 text-center md:grid">
              <div>
                <motion.span initial={{ scale: 0.8, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} className="mx-auto grid h-24 w-24 place-items-center rounded-[32px] bg-white shadow-lift">
                  <MessagesSquare size={40} className="text-brand-600" />
                </motion.span>
                <p className="mt-6 font-display text-[24px] font-bold">Your conversations</p>
                <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">Pick a chat to ask about a device, make an offer, or buy at a price you agreed with the seller.</p>
              </div>
            </section>
          )}
        </div>
      </div>
      {!id ? <MobileTabs /> : null}
    </div>
  );
}
