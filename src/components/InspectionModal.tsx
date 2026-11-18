import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Check, ClipboardCheck, Loader2, MapPinned, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { settlePayment, type GatewayPayment } from "../lib/payments";
import { cn, money } from "../lib/utils";
import { useSession } from "../store/session";
import { Modal } from "./Modal";

interface Plan {
  code: string;
  name: string;
  tier?: string;
  pricePaise: number;
  disclaimer?: string;
  checklist: { key: string; label: string; critical?: boolean }[];
}

type Step = "plan" | "review" | "done";

/** Book a physical inspection for a listing: choose a plan → review → pay. */
export function InspectionModal({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; title: string; categorySlug?: string; city?: string };
}) {
  const navigate = useNavigate();
  const profile = useSession((state) => state.profile);
  const [step, setStep] = useState<Step>("plan");
  const [code, setCode] = useState("");
  const [publish, setPublish] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const plans = useQuery({
    queryKey: ["inspection-plans", product.categorySlug],
    enabled: open,
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get("/inspection-plans", { params: { category: product.categorySlug } })).data.data as Plan[],
  });
  useEffect(() => {
    if (!open) {
      setStep("plan");
      setError("");
      setPaying(false);
    }
  }, [open]);
  useEffect(() => {
    const first = plans.data?.slice().sort((a, b) => a.pricePaise - b.pricePaise)[0];
    if (first && !plans.data?.some((plan) => plan.code === code)) setCode(first.code);
  }, [plans.data, code]);
  const plan = plans.data?.find((entry) => entry.code === code);

  async function pay() {
    if (!plan) return;
    setPaying(true);
    setError("");
    try {
      const response = await api.post("/inspections/checkout", { productId: product.id, planCode: plan.code, publishOnListing: publish });
      const data = response.data.data as { payment: GatewayPayment; mock?: boolean };
      await settlePayment(data.payment, Boolean(data.mock));
      setStep("done");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment did not complete.");
    } finally {
      setPaying(false);
    }
  }

  const title = step === "done" ? "Inspection booked" : step === "review" ? "Review and pay" : "Request an inspection";
  const description =
    step === "plan" ? "An approved partner near the listing checks the device in person and files a report." : step === "review" ? product.title : undefined;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} size="lg">
      {!profile ? (
        <div className="space-y-4">
          <p className="text-[14px] text-muted">Sign in to book an inspection. Payment is verified by the server before a partner is assigned.</p>
          <button type="button" onClick={() => navigate("/login")} className="w-full rounded-full bg-brand-gradient py-3.5 font-semibold text-white shadow-glow">Sign in to continue</button>
        </div>
      ) : step === "done" ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 text-center">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_14px_30px_-10px_rgba(16,160,90,0.7)]">
            <Check size={38} strokeWidth={3} />
          </motion.span>
          <div>
            <p className="font-display text-[22px] font-bold">Payment received</p>
            <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted">We're matching an approved partner near {product.city || "the listing"}. You'll get a notification when they accept and schedule the visit.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/account/inspections" onClick={() => onOpenChange(false)} className="rounded-full bg-brand-gradient py-3.5 font-semibold text-white shadow-glow">Track inspection</Link>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-full bg-white py-3.5 font-semibold text-ink ring-1 ring-line">Back to listing</button>
          </div>
        </motion.div>
      ) : step === "review" && plan ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setStep("plan")} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700"><ArrowLeft size={15} /> Change plan</button>
          <div className="rounded-3xl bg-canvas p-5 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[19px] font-bold">{plan.name}</p>
                <p className="text-[13px] text-muted">{plan.checklist.length} checks · {plan.checklist.filter((item) => item.critical).length} critical</p>
              </div>
              <p className="font-display text-[26px] font-extrabold">{money(plan.pricePaise)}</p>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
              <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} className="mt-1 h-4 w-4 accent-[#3a3fe0]" />
              <span>
                <span className="block text-[14px] font-semibold">Publish the report on the listing</span>
                <span className="block text-[13px] text-muted">Other buyers see the report too. Turn this off to keep it private to you and the seller.</span>
              </span>
            </label>
          </div>
          <ul className="space-y-2 text-[13px] text-ink-soft">
            {[
              [MapPinned, "An approved partner whose service area covers the listing is offered the job."],
              [ClipboardCheck, "Critical failures stay visible on the report even if the score is high."],
              [ShieldCheck, plan.disclaimer || "The report records the device on the day of the visit. It is not a warranty."],
            ].map(([Icon, text], index) => {
              const IconComponent = Icon as typeof MapPinned;
              return (
                <li key={index} className="flex items-start gap-2.5">
                  <IconComponent size={16} className="mt-0.5 shrink-0 text-brand-600" /> {text as string}
                </li>
              );
            })}
          </ul>
          {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger">{error}</p> : null}
          <button type="button" disabled={paying} onClick={() => void pay()} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-4 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60">
            {paying ? <Loader2 size={18} className="animate-spin" /> : <BadgeCheck size={18} />} Pay {money(plan.pricePaise)} and book
          </button>
          <p className="text-center text-[12px] text-muted">The payment is confirmed by the gateway before a partner is assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((index) => <div key={index} className="skeleton h-48 rounded-3xl" />)}</div>
          ) : !plans.data?.length ? (
            <p className="rounded-2xl bg-canvas p-5 text-[14px] text-muted">No inspection plan is available for this category yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Inspection plan">
              {plans.data
                .slice()
                .sort((a, b) => a.pricePaise - b.pricePaise)
                .map((entry) => {
                  const active = entry.code === code;
                  const critical = entry.checklist.filter((item) => item.critical);
                  return (
                    <button
                      key={entry.code}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCode(entry.code)}
                      className={cn("relative flex flex-col rounded-3xl p-5 text-left ring-2 transition", active ? "bg-brand-50 ring-brand-500" : "bg-white ring-line hover:ring-brand-200")}
                    >
                      <span className={cn("absolute top-5 right-5 grid h-6 w-6 place-items-center rounded-full ring-2", active ? "bg-brand-gradient text-white ring-transparent" : "ring-line")}>
                        {active ? <Check size={14} strokeWidth={3} /> : null}
                      </span>
                      <span className="text-[12px] font-semibold tracking-[0.12em] text-brand-600 uppercase">{entry.tier || "Plan"}</span>
                      <span className="mt-1 pr-8 font-display text-[19px] font-bold">{entry.name}</span>
                      <span className="mt-2 font-display text-[28px] font-extrabold">{money(entry.pricePaise)}</span>
                      <span className="mt-1 text-[13px] text-muted">{entry.checklist.length} checks · {critical.length} critical</span>
                      <span className="mt-3 flex flex-wrap gap-1">
                        {critical.slice(0, 4).map((item) => (
                          <span key={item.key} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-brand-100">{item.label}</span>
                        ))}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
          <button type="button" disabled={!plan} onClick={() => setStep("review")} className="w-full rounded-full bg-brand-gradient py-4 text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-50">
            Continue{plan ? ` with ${plan.name}` : ""}
          </button>
        </div>
      )}
    </Modal>
  );
}
