import { toast } from "./Toaster";
import { useState } from "react";
import { Check, Facebook, Link2, Linkedin, Mail, Send, Share2, Twitter } from "lucide-react";
import { Modal } from "./Modal";
import { cn } from "../lib/utils";
import { appUrl } from "../lib/config";

export function WhatsAppGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l6-1.6A11 11 0 0 0 20.5 3.5zm-8.5 17a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.6.9.9-3.5-.2-.3A9.1 9.1 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}

function absolute(url?: string) {
  return appUrl(url);
}

/** Share sheet with the common networks plus copy-link. */
export function ShareDialog({ open, onOpenChange, title, text, url }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; text?: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const link = absolute(url);
  const message = text ? `${text} ${link}` : `${title} ${link}`;
  const enc = encodeURIComponent;
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(message)}`, icon: <WhatsAppGlyph size={22} />, tone: "bg-[#25d366] text-white" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, icon: <Facebook size={22} />, tone: "bg-[#1877f2] text-white" },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc(link)}&text=${enc(text || title)}`, icon: <Twitter size={22} />, tone: "bg-ink text-white" },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(link)}&text=${enc(text || title)}`, icon: <Send size={21} />, tone: "bg-[#229ed9] text-white" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`, icon: <Linkedin size={21} />, tone: "bg-[#0a66c2] text-white" },
    { label: "Email", href: `mailto:?subject=${enc(title)}&body=${enc(message)}`, icon: <Mail size={21} />, tone: "bg-brand-gradient text-white" },
  ];
  return (
    <Modal open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setCopied(false); }} title="Share" description={title} size="sm">
      <div className="grid grid-cols-3 gap-3">
        {targets.map((target) => (
          <a key={target.label} href={target.href} target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-[12px] font-semibold text-ink transition hover:bg-canvas">
            <span className={cn("grid h-13 w-13 place-items-center rounded-2xl shadow-card transition group-hover:-translate-y-0.5", target.tone)}>{target.icon}</span>
            {target.label}
          </a>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-full bg-canvas p-1.5 pl-4 ring-1 ring-line">
        <Link2 size={16} className="shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{link}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(link).then(() => { setCopied(true); toast.success("Link copied", "Share it anywhere."); })}
          className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition", copied ? "bg-success text-white" : "bg-ink text-white hover:bg-brand-700")}
        >
          {copied ? <Check size={14} /> : null} {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </Modal>
  );
}

/** Uses the phone's native share sheet when available, otherwise our share dialog. */
export function ShareButton({ title, text, url, className, label = "Share", iconOnly = false }: { title: string; text?: string; url?: string; className?: string; label?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  async function share() {
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && navigator.share) {
      try {
        await navigator.share({ title, text, url: absolute(url) });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    setOpen(true);
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        aria-label={iconOnly ? label : undefined}
        className={cn(
          iconOnly
            ? "grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-card ring-1 ring-line transition hover:bg-ink hover:text-white"
            : "inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-ink ring-1 ring-line transition hover:ring-brand-300",
          className,
        )}
      >
        <Share2 size={iconOnly ? 18 : 16} /> {iconOnly ? null : label}
      </button>
      <ShareDialog open={open} onOpenChange={setOpen} title={title} text={text} url={url} />
    </>
  );
}
