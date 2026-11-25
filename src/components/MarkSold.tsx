import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { Modal } from "./Modal";
import { toast } from "./Toaster";

export const SOLD_REASONS: { value: string; label: string; hint: string }[] = [
  { value: "sold_on_suregad", label: "Sold to a SureGad buyer", hint: "Agreed in chat and handed over" },
  { value: "sold_elsewhere", label: "Sold somewhere else", hint: "A friend, a shop or another site" },
  { value: "no_longer_selling", label: "Not selling any more", hint: "I decided to keep it" },
  { value: "damaged_or_lost", label: "Damaged or lost", hint: "The device can't be sold" },
  { value: "other", label: "Other reason", hint: "Tell us below" },
];

export const soldLabel = (reason?: string) => SOLD_REASONS.find((row) => row.value === reason)?.label || "Sold";

/** The owner takes a live listing down before its validity ends, with a reason. */
export function MarkSoldModal({ listing, open, onOpenChange, conversation, onDone }: {
  listing: { id: string; title: string; pricePaise: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When opened from a chat: the sale is recorded against that buyer. */
  conversation?: { id: string; buyerName: string; agreedPaise?: number };
  onDone?: () => void;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [rupees, setRupees] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startReason = conversation ? "sold_on_suregad" : "";
  const startPrice = String(Math.round((conversation?.agreedPaise || listing.pricePaise) / 100));
  useEffect(() => {
    if (!open) return;
    setReason(startReason);
    setNote("");
    setRupees(startPrice);
    setError("");
  }, [open, startReason, startPrice]);
  const sold = reason.startsWith("sold");
  const ready = Boolean(reason) && (reason !== "other" || note.trim().length >= 3);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/me/selling/${listing.id}/sold`, {
        reason,
        note: note.trim() || undefined,
        pricePaise: sold && Number(rupees) > 0 ? Math.round(Number(rupees) * 100) : undefined,
        conversationId: reason === "sold_on_suregad" ? conversation?.id : undefined,
      });
      toast.success("Listing closed", "It's no longer shown to buyers.");
      for (const key of ["selling", "product", "chat", "chat-list", "chat-messages", "home", "search"]) void client.invalidateQueries({ queryKey: [key] });
      onOpenChange(false);
      onDone?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not close the listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Mark as sold out" description={`${listing.title} will stop showing to buyers. This can't be undone.`} size="sm">
      <div className="space-y-2" role="radiogroup" aria-label="Reason">
        {SOLD_REASONS.map((row) => (
          <button key={row.value} type="button" role="radio" aria-checked={reason === row.value} onClick={() => setReason(row.value)} className={cn("flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition", reason === row.value ? "bg-brand-50 ring-brand-400" : "ring-line hover:ring-brand-200")}>
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2", reason === row.value ? "bg-brand-gradient text-white ring-transparent" : "ring-line")}>{reason === row.value ? <Check size={12} strokeWidth={3} /> : null}</span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold">{row.value === "sold_on_suregad" && conversation ? `Sold to ${conversation.buyerName}` : row.label}</span>
              <span className="block text-[12px] text-muted">{row.hint}</span>
            </span>
          </button>
        ))}
      </div>
      {sold ? (
        <label className="mt-3 block text-[13px] font-semibold">
          Final price (₹, optional)
          <input inputMode="numeric" value={rupees} onChange={(event) => setRupees(event.target.value.replace(/\D/g, ""))} className="mt-1 h-11 w-full rounded-2xl bg-canvas px-4 text-[15px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
        </label>
      ) : null}
      <label className="mt-3 block text-[13px] font-semibold">
        Note {reason === "other" ? "(required)" : "(optional)"}
        <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-16 w-full rounded-2xl bg-canvas p-3 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400" />
      </label>
      {error ? <p className="mt-2 text-[13px] text-danger">{error}</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="rounded-full bg-white py-3 font-semibold ring-1 ring-line">Cancel</button>
        <button type="button" disabled={!ready || busy} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} Mark sold out
        </button>
      </div>
    </Modal>
  );
}
