import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { money, titleCase } from "../lib/utils";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, TextArea } from "../components/ui";

type Tab = "plans" | "inspections" | "commerce" | "content" | "audit";

const tabs: { id: Tab; label: string }[] = [
  { id: "plans", label: "Plans" },
  { id: "inspections", label: "Inspections" },
  { id: "commerce", label: "Commerce" },
  { id: "content", label: "Homepage" },
  { id: "audit", label: "Audit" },
];

export function AdminConfigure() {
  const [tab, setTab] = useState<Tab>("plans");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Configure</h1>
      <p className="text-sm text-slate-600">Prices, listing limits, checklists and homepage copy are stored in the database. The API reads them on every restricted action.</p>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button key={item.id} className={`rounded-full px-4 py-2 text-sm ${tab === item.id ? "bg-ink text-white" : "bg-white text-slate-600"}`} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "plans" ? <PlansPanel /> : null}
      {tab === "inspections" ? <InspectionPanel /> : null}
      {tab === "commerce" ? <CommercePanel /> : null}
      {tab === "content" ? <ContentPanel /> : null}
      {tab === "audit" ? <AuditPanel /> : null}
    </div>
  );
}

interface Plan {
  code: string;
  name: string;
  audience: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  gracePeriodDays: number;
  limits: { activeListings: number; monthlyListings: number; photosPerListing: number; employees: number };
}

function PlansPanel() {
  const plans = useQuery({ queryKey: ["admin-plans"], queryFn: async () => (await api.get("/admin/plans")).data.data as Plan[] });
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  async function save(plan: Plan, form: FormData) {
    setError(null);
    try {
      await api.patch(`/admin/plans/${plan.code}`, {
        monthlyPricePaise: Math.round(Number(form.get("monthly")) * 100),
        annualPricePaise: Math.round(Number(form.get("annual")) * 100),
        gracePeriodDays: Number(form.get("grace")),
        limits: {
          activeListings: Number(form.get("active")),
          monthlyListings: Number(form.get("monthlyListings")),
          photosPerListing: Number(form.get("photos")),
          employees: Number(form.get("employees")),
        },
      });
      await client.invalidateQueries({ queryKey: ["admin-plans"] });
    } catch (reason) {
      setError(reason);
    }
  }
  if (!plans.data?.length) return <Empty title="No plans yet" body="Run the seed script so subscription plans exist before editing them." />;
  return (
    <div className="space-y-4">
      {error ? <ErrorNote error={error} /> : null}
      {plans.data.map((plan) => (
        <Card key={plan.code} className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">{plan.name}</h2>
            <Badge>{plan.audience}</Badge>
          </div>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void save(plan, new FormData(event.currentTarget)); }}>
            <Field label="Monthly price (INR)"><Input name="monthly" defaultValue={plan.monthlyPricePaise / 100} /></Field>
            <Field label="Annual price (INR)"><Input name="annual" defaultValue={plan.annualPricePaise / 100} /></Field>
            <Field label="Grace days"><Input name="grace" defaultValue={plan.gracePeriodDays} /></Field>
            <Field label="Active listings"><Input name="active" defaultValue={plan.limits.activeListings} /></Field>
            <Field label="Listings per month"><Input name="monthlyListings" defaultValue={plan.limits.monthlyListings} /></Field>
            <Field label="Photos per listing"><Input name="photos" defaultValue={plan.limits.photosPerListing} /></Field>
            <Field label="Employees"><Input name="employees" defaultValue={plan.limits.employees} /></Field>
            <div className="md:col-span-2 md:self-end"><Button type="submit">Save {plan.code}</Button></div>
          </form>
        </Card>
      ))}
    </div>
  );
}

interface CheckItem {
  key: string;
  label: string;
  group?: string;
  critical: boolean;
  weight: number;
}

interface InspectionPlanRow {
  code: string;
  name: string;
  categorySlug: string;
  pricePaise: number;
  partnerPayoutPaise: number;
  checklist: CheckItem[];
}

function InspectionPanel() {
  const plans = useQuery({ queryKey: ["admin-inspection-plans"], queryFn: async () => (await api.get("/admin/inspection-plans")).data.data as InspectionPlanRow[] });
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const save = useMutation({
    mutationFn: async (input: { code: string; price: string; payout: string; checklist: CheckItem[] }) =>
      api.patch(`/admin/inspection-plans/${input.code}`, {
        pricePaise: Math.round(Number(input.price) * 100),
        partnerPayoutPaise: Math.round(Number(input.payout) * 100),
        checklist: input.checklist,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-inspection-plans"] }),
    onError: setError,
  });
  if (!plans.data?.length) return <Empty title="No inspection plans" body="Seed the checklist plans before changing prices or weights." />;
  return (
    <div className="space-y-4">
      {error ? <ErrorNote error={error} /> : null}
      {plans.data.map((plan) => (
        <InspectionEditor key={plan.code} plan={plan} onSave={(price, payout, checklist) => save.mutate({ code: plan.code, price, payout, checklist })} />
      ))}
    </div>
  );
}

function InspectionEditor({ plan, onSave }: { plan: InspectionPlanRow; onSave: (price: string, payout: string, checklist: CheckItem[]) => void }) {
  const [price, setPrice] = useState(String(plan.pricePaise / 100));
  const [payout, setPayout] = useState(String(plan.partnerPayoutPaise / 100));
  const [checklist, setChecklist] = useState(plan.checklist);
  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-xl">{plan.name}</h2>
      <p className="text-sm text-slate-500">{plan.categorySlug} · {plan.code}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Buyer price (INR)"><Input value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
        <Field label="Partner payout (INR)"><Input value={payout} onChange={(event) => setPayout(event.target.value)} /></Field>
      </div>
      <div className="space-y-2">
        {checklist.map((item, index) => (
          <div key={item.key} className="grid grid-cols-[1fr_90px_90px] items-center gap-2 text-sm">
            <span>{item.label}</span>
            <label className="flex items-center gap-1"><input type="checkbox" checked={item.critical} onChange={(event) => setChecklist(checklist.map((row, rowIndex) => rowIndex === index ? { ...row, critical: event.target.checked } : row))} /> Critical</label>
            <Input value={item.weight} onChange={(event) => setChecklist(checklist.map((row, rowIndex) => rowIndex === index ? { ...row, weight: Number(event.target.value) } : row))} />
          </div>
        ))}
      </div>
      <Button onClick={() => onSave(price, payout, checklist)}>Save checklist</Button>
    </Card>
  );
}

function CommercePanel() {
  const refunds = useQuery({ queryKey: ["admin-refunds"], queryFn: async () => (await api.get("/admin/refunds")).data.data as { _id: string; amountPaise: number; status: string; reason?: string }[] });
  const coupons = useQuery({ queryKey: ["admin-coupons"], queryFn: async () => (await api.get("/admin/coupons")).data.data as { code: string; percentOff?: number; amountOffPaise?: number; usedCount: number; maxUses: number }[] });
  const payments = useQuery({ queryKey: ["admin-payments"], queryFn: async () => (await api.get("/admin/payments")).data.data as { _id: string; type: string; status: string; amountPaise: number; provider: string }[] });
  const client = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  return (
    <div className="space-y-6">
      {error ? <ErrorNote error={error} /> : null}
      <section className="space-y-3">
        <h2 className="text-xl">Refunds</h2>
        {(refunds.data || []).map((refund) => (
          <Card key={refund._id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div><p>{money(refund.amountPaise)} · {titleCase(refund.status)}</p><p className="text-slate-500">{refund.reason}</p></div>
            {refund.status === "requested" ? (
              <div className="flex gap-2">
                <Button onClick={() => void api.post(`/admin/refunds/${refund._id}`, { approve: true }).then(() => client.invalidateQueries({ queryKey: ["admin-refunds"] })).catch(setError)}>Approve</Button>
                <Button variant="secondary" onClick={() => void api.post(`/admin/refunds/${refund._id}`, { approve: false }).then(() => client.invalidateQueries({ queryKey: ["admin-refunds"] })).catch(setError)}>Reject</Button>
              </div>
            ) : null}
          </Card>
        ))}
        {!refunds.data?.length ? <Empty title="No refund requests" body="Buyers can request a refund from a paid order. Approval calls the payment provider." /> : null}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl">Coupons</h2>
        <Card className="grid gap-3 p-4 md:grid-cols-[1fr_120px_auto]">
          <Field label="Code"><Input value={code} onChange={(event) => setCode(event.target.value)} /></Field>
          <Field label="Percent off"><Input value={percent} onChange={(event) => setPercent(event.target.value)} /></Field>
          <div className="self-end"><Button onClick={() => void api.post("/admin/coupons", { code, percentOff: Number(percent) }).then(() => { setCode(""); return client.invalidateQueries({ queryKey: ["admin-coupons"] }); }).catch(setError)}>Create</Button></div>
        </Card>
        {(coupons.data || []).map((coupon) => (
          <Card key={coupon.code} className="p-4 text-sm">{coupon.code} · {coupon.percentOff ? `${coupon.percentOff}%` : money(coupon.amountOffPaise)} · used {coupon.usedCount}/{coupon.maxUses}</Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl">Payments</h2>
        {(payments.data || []).slice(0, 12).map((payment) => (
          <Card key={payment._id} className="p-4 text-sm">{titleCase(payment.type)} · {titleCase(payment.status)} · {money(payment.amountPaise)} · {payment.provider}</Card>
        ))}
        {!payments.data?.length ? <Empty title="No payments" body="Captured payments appear after the gateway verifies them." /> : null}
      </section>
    </div>
  );
}

function ContentPanel() {
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await api.get("/admin/settings")).data.data as { value?: { assignmentTimeoutMinutes?: number; refundWindowDays?: number; homepage?: { hero?: { eyebrow?: string; title?: string; subtitle?: string }; testimonials?: { name: string; quote: string; city?: string }[] } } },
  });
  const client = useQueryClient();
  const value = settings.data?.value;
  const [hero, setHero] = useState({ eyebrow: "", title: "", subtitle: "" });
  const [quote, setQuote] = useState({ name: "", city: "", quote: "" });
  const [timeout, setTimeoutMinutes] = useState("");
  const [error, setError] = useState<unknown>(null);
  const ready = hero.title || value?.homepage?.hero?.title;
  return (
    <div className="space-y-4">
      {error ? <ErrorNote error={error} /> : null}
      <Card className="space-y-3 p-4">
        <h2 className="text-xl">Hero</h2>
        <Field label="Eyebrow"><Input value={hero.eyebrow || value?.homepage?.hero?.eyebrow || ""} onChange={(event) => setHero({ ...hero, eyebrow: event.target.value, title: hero.title || value?.homepage?.hero?.title || "", subtitle: hero.subtitle || value?.homepage?.hero?.subtitle || "" })} /></Field>
        <Field label="Title"><Input value={hero.title || value?.homepage?.hero?.title || ""} onChange={(event) => setHero({ eyebrow: hero.eyebrow || value?.homepage?.hero?.eyebrow || "", title: event.target.value, subtitle: hero.subtitle || value?.homepage?.hero?.subtitle || "" })} /></Field>
        <Field label="Subtitle"><TextArea value={hero.subtitle || value?.homepage?.hero?.subtitle || ""} onChange={(event) => setHero({ eyebrow: hero.eyebrow || value?.homepage?.hero?.eyebrow || "", title: hero.title || value?.homepage?.hero?.title || "", subtitle: event.target.value })} /></Field>
        <Button disabled={!ready} onClick={() => void api.patch("/admin/settings", { homepage: { hero: { eyebrow: hero.eyebrow || value?.homepage?.hero?.eyebrow || "", title: hero.title || value?.homepage?.hero?.title || "", subtitle: hero.subtitle || value?.homepage?.hero?.subtitle || "" } } }).then(() => client.invalidateQueries({ queryKey: ["admin-settings"] })).catch(setError)}>Save hero</Button>
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="text-xl">Testimonial</h2>
        <p className="text-sm text-slate-500">Only quotes you enter here are shown. The homepage does not invent customers.</p>
        <Field label="Name"><Input value={quote.name} onChange={(event) => setQuote({ ...quote, name: event.target.value })} /></Field>
        <Field label="City"><Input value={quote.city} onChange={(event) => setQuote({ ...quote, city: event.target.value })} /></Field>
        <Field label="Quote"><TextArea value={quote.quote} onChange={(event) => setQuote({ ...quote, quote: event.target.value })} /></Field>
        <Button onClick={() => void api.patch("/admin/settings", { homepage: { testimonials: [...(value?.homepage?.testimonials || []), quote] } }).then(() => { setQuote({ name: "", city: "", quote: "" }); return client.invalidateQueries({ queryKey: ["admin-settings"] }); }).catch(setError)}>Add testimonial</Button>
        {(value?.homepage?.testimonials || []).map((item) => <p key={item.quote} className="text-sm">“{item.quote}” — {item.name}</p>)}
      </Card>
      <Card className="space-y-3 p-4">
        <h2 className="text-xl">Partner offer timeout</h2>
        <Field label="Minutes before the next partner is offered the job"><Input value={timeout || String(value?.assignmentTimeoutMinutes || 60)} onChange={(event) => setTimeoutMinutes(event.target.value)} /></Field>
        <Button onClick={() => void api.patch("/admin/settings", { assignmentTimeoutMinutes: Number(timeout || value?.assignmentTimeoutMinutes || 60) }).then(() => client.invalidateQueries({ queryKey: ["admin-settings"] })).catch(setError)}>Save timeout</Button>
      </Card>
    </div>
  );
}

function AuditPanel() {
  const rows = useQuery({ queryKey: ["admin-audit"], queryFn: async () => (await api.get("/admin/audit")).data.data as { _id: string; action: string; entityType?: string; createdAt: string }[] });
  if (!rows.data?.length) return <Empty title="No audit entries" body="Approvals, plan edits, refunds and setting changes are recorded here." />;
  return (
    <div className="space-y-2">
      {rows.data.map((row) => (
        <Card key={row._id} className="p-4 text-sm">
          <p className="font-medium">{row.action}</p>
          <p className="text-slate-500">{row.entityType} · {new Date(row.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        </Card>
      ))}
    </div>
  );
}
