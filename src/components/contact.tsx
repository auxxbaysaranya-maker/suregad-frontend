import { toast } from "./Toaster";
import { useState } from "react";
import { useLocation as useRouterLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../store/session";
import { Modal } from "./Modal";

/** Start (or reopen) the chat with a listing's seller, then open it. Sends signed-out users to login. */
export function useStartChat() {
  const navigate = useNavigate();
  const here = useRouterLocation();
  const profile = useSession((state) => state.profile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function start(productId: string, options: { message?: string; offer?: boolean } = {}) {
    setError("");
    if (!profile) {
      navigate("/login", { state: { from: here.pathname } });
      return;
    }
    setPending(true);
    try {
      const response = await api.post("/chat/conversations", { productId, message: options.message });
      const id = response.data.data.id as string;
      navigate(`/chat/${id}${options.offer ? "?compose=offer" : ""}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open the chat.");
    } finally {
      setPending(false);
    }
  }
  return { start, pending, error, signedIn: Boolean(profile) };
}

/** Shows the seller's number if they chose to share it; otherwise points to chat. */
export function CallDialog({ open, onOpenChange, productId, sellerName }: { open: boolean; onOpenChange: (open: boolean) => void; productId: string; sellerName?: string }) {
  const profile = useSession((state) => state.profile);
  const navigate = useNavigate();
  const chat = useStartChat();
  const [copied, setCopied] = useState(false);
  const contact = useQuery({
    queryKey: ["contact", productId],
    enabled: open && Boolean(profile),
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get(`/chat/contact/${productId}`)).data.data as { name: string; phone: string | null; ownListing: boolean },
  });
  const name = contact.data?.name || sellerName || "the seller";
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Call ${name}`} size="sm">
      {!profile ? (
        <div className="space-y-4">
          <p className="text-[14px] text-muted">Sign in to see the seller's contact details. Numbers are shown only when the seller chooses to share them.</p>
          <button type="button" onClick={() => navigate("/login")} className="w-full rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow">Sign in</button>
        </div>
      ) : contact.isLoading ? (
        <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-brand-600" /></div>
      ) : contact.data?.phone ? (
        <div className="space-y-4">
          <div className="rounded-3xl bg-brand-50 p-5 text-center ring-1 ring-brand-100">
            <p className="text-[13px] text-muted">Phone number</p>
            <p className="mt-1 font-display text-[28px] font-bold tracking-wide text-ink">{contact.data.phone}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${contact.data.phone.replace(/\s+/g, "")}`} className="flex items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow">
              <Phone size={17} /> Call now
            </a>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(contact.data!.phone!).then(() => { setCopied(true); toast.success("Number copied"); })}
              className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-ink ring-1 ring-line hover:ring-brand-300"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="flex items-start gap-2 text-[12px] leading-5 text-muted">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" /> Meet in a public place, check the device before paying, and never pay in advance outside SureGad.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl bg-canvas p-5 ring-1 ring-line">
            <p className="font-semibold text-ink">{contact.data?.ownListing ? "This is your listing." : `${name} hasn't shared a phone number.`}</p>
            <p className="mt-1 text-[14px] text-muted">{contact.data?.ownListing ? "Buyers reach you through chat." : "Chat is the quickest way to reach them, and your number stays private too."}</p>
          </div>
          {!contact.data?.ownListing ? (
            <button
              type="button"
              disabled={chat.pending}
              onClick={() => void chat.start(productId)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-3.5 text-[15px] font-semibold text-white shadow-glow disabled:opacity-60"
            >
              {chat.pending ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={17} />} Chat with seller
            </button>
          ) : null}
          {chat.error ? <p className="text-[13px] text-danger">{chat.error}</p> : null}
        </div>
      )}
      {contact.isError ? <p className="mt-3 text-[13px] text-danger">{contact.error instanceof Error ? contact.error.message : "Could not load contact details."}</p> : null}
    </Modal>
  );
}
