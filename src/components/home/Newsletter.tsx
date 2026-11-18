import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Mail, Send } from "lucide-react";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 17.2L1 23l6-1.6A11 11 0 0 0 20.5 3.5zm-8.5 17a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.6.9.9-3.5-.2-.3A9.1 9.1 0 1 1 12 20.5zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.2-.3a.5.5 0 0 0 0-.5c0-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.8 11.8 0 0 0 4.5 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z" />
    </svg>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [note, setNote] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!emailConsent && !whatsappConsent) {
      setNote("Choose email or WhatsApp first.");
      return;
    }
    setState("busy");
    setNote("");
    try {
      await api.post("/newsletter", { email, emailConsent, whatsappConsent });
      setState("done");
    } catch (error) {
      setState("idle");
      setNote(error instanceof Error ? error.message : "Check the email address and try again.");
    }
  }
  const channels = [
    { label: "Email", icon: <Mail size={15} />, checked: emailConsent, set: setEmailConsent },
    { label: "WhatsApp", icon: <WhatsAppIcon />, checked: whatsappConsent, set: setWhatsappConsent },
  ];
  return (
    <section className="py-10">
      <div className="relative isolate overflow-hidden rounded-[36px] border-gradient p-6 shadow-card [--border-gradient-fill:#fff] sm:p-10">
        <div aria-hidden="true" className="absolute -top-24 -right-20 -z-10 h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
        <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
          <div className="flex items-start gap-4">
            <motion.span
              initial={{ rotate: -12, scale: 0.8 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow"
            >
              <Send size={24} />
            </motion.span>
            <div>
              <h2 className="text-[clamp(26px,3vw,36px)]">Hear about devices <span className="text-gradient whitespace-nowrap">worth a look.</span></h2>
              <p className="mt-2 max-w-sm text-[14px] text-muted">Occasional picks from new listings. Choose how you'd like us to reach you.</p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {state === "done" ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white"><Check size={20} /></span>
                <p className="font-semibold">You're on the list. Thanks for subscribing.</p>
              </motion.div>
            ) : (
              <motion.form key="form" exit={{ opacity: 0 }} onSubmit={(event) => void submit(event)} className="rounded-3xl bg-canvas p-2.5 ring-1 ring-line">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    placeholder="you@example.com"
                    aria-label="Email address"
                    className="min-w-0 flex-1 rounded-full bg-white px-5 py-3.5 text-[14px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button disabled={state === "busy"} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
                    {state === "busy" ? <Loader2 size={16} className="animate-spin" /> : null} Subscribe
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 px-1.5 pb-1">
                  <span className="text-[12px] text-muted">Send via</span>
                  {channels.map((channel) => (
                    <label
                      key={channel.label}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
                        channel.checked ? "bg-brand-gradient text-white shadow-glow" : "bg-white text-ink-soft ring-1 ring-line hover:ring-brand-300",
                      )}
                    >
                      <input className="sr-only" type="checkbox" checked={channel.checked} onChange={(event) => channel.set(event.target.checked)} />
                      {channel.icon} {channel.label}
                    </label>
                  ))}
                </div>
                {note ? <p className="px-2 pt-1 text-[12px] text-danger">{note}</p> : null}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
