import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { money, titleCase } from "../lib/utils";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, TextArea } from "../components/ui";
import { useSession } from "../store/session";
import { enableFirebaseMessaging, firebaseConfigured } from "../lib/firebase";

function toUint8(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function enableWebPush() {
  if (firebaseConfigured()) {
    const token = await enableFirebaseMessaging();
    await api.post("/notifications/fcm-token", { token });
    return;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("This browser does not support web push.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const key = (await api.get("/push/public-key")).data.data.publicKey as string;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(key) });
  const json = subscription.toJSON();
  await api.post("/notifications/push-subscription", { endpoint: json.endpoint, keys: json.keys });
}

function useList<T>(key: string, url: string) {
  return useQuery({ queryKey: [key], queryFn: async () => (await api.get(url)).data.data as T });
}

export function AccountHome() {
  const profile = useSession((state) => state.profile);
  const notifications = useList<{ title: string; body: string; readAt?: string }[]>("notes", "/me/notifications");
  const [pushMessage, setPushMessage] = useState("");
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Hello{profile ? `, ${profile.displayName}` : ""}</h1>
      <Button
        variant="secondary"
        onClick={() => {
          enableWebPush()
            .then(() => setPushMessage("This browser will receive SureGad push notifications."))
            .catch((error: Error) => setPushMessage(error.message));
        }}
      >
        Enable web push
      </Button>
      {pushMessage ? <p className="text-sm text-slate-600">{pushMessage}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/account/orders"><Card className="p-4">Orders</Card></Link>
        <Link to="/account/inspections"><Card className="p-4">Inspections</Card></Link>
        <Link to="/chat"><Card className="p-4">Chats</Card></Link>
      </div>
      <ReferralCard />
      <h2 className="text-xl">Notifications</h2>
      {(notifications.data || []).slice(0, 6).map((note, index) => (
        <Card key={index} className="p-4 text-sm"><p className="font-medium">{note.title}</p><p className="text-slate-600">{note.body}</p></Card>
      ))}
      {!notifications.data?.length ? <Empty title="No notifications" body="Order, inspection and message updates appear here." /> : null}
    </div>
  );
}

function ReferralCard() {
  const referral = useList<{ code: string; invited: { status: string }[] }>("referral", "/me/referral");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Card className="space-y-3 p-4">
      <h2 className="text-lg font-bold">Referral</h2>
      <p className="text-sm text-slate-500">Share this code. A completed paid order is recorded for you. It is not a balance you can withdraw.</p>
      <p className="text-lg font-bold tracking-wide text-brand">{referral.data?.code || "…"}</p>
      <p className="text-xs text-slate-500">{referral.data?.invited.length || 0} invited · {(referral.data?.invited || []).filter((row) => row.status === "qualified").length} paid</p>
      <div className="flex gap-2">
        <Input value={code} placeholder="Have a code?" onChange={(event) => setCode(event.target.value)} />
        <Button onClick={() => void api.post("/me/referral", { code }).then(() => setMessage("Referral recorded.")).catch(() => setMessage("That code could not be used."))}>Apply</Button>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
    </Card>
  );
}

export function OrdersPage() {
  const orders = useList<{ _id: string; number: string; status: string; amountPaise: number }[]>("orders", "/me/orders");
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Orders</h1>
      {(orders.data || []).map((order) => (
        <Card key={order._id} className="flex items-center justify-between p-4">
          <div><p className="font-medium">{order.number}</p><p className="text-sm text-slate-500">{titleCase(order.status)}</p></div>
          <p>{money(order.amountPaise)}</p>
        </Card>
      ))}
      {!orders.data?.length ? <Empty title="No orders" body="A device is purchased only after the server verifies payment." /> : null}
    </div>
  );
}

export function WishlistPage() {
  const items = useList<{ id: string; title: string; slug: string; pricePaise: number }[]>("wishlist", "/me/wishlist");
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Wishlist</h1>
      {(items.data || []).map((item) => <Link key={item.id} to={`/product/${item.slug}`} className="block"><Card className="p-4">{item.title} · {money(item.pricePaise)}</Card></Link>)}
      {!items.data?.length ? <Empty title="Nothing saved" body="Use the heart on a listing to save it." /> : null}
    </div>
  );
}

export function MessagesPage() {
  const conversations = useList<{ _id: string; lastPreview?: string }[]>("conversations", "/conversations");
  const [active, setActive] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const messages = useQuery({
    queryKey: ["messages", active],
    enabled: Boolean(active),
    queryFn: async () => (await api.get(`/conversations/${active}/messages`)).data.data as { _id: string; body: string }[],
  });
  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <h1 className="text-2xl">Messages</h1>
        {(conversations.data || []).map((conversation) => (
          <button key={conversation._id} className="w-full rounded-xl border bg-white p-3 text-left text-sm" onClick={() => setActive(conversation._id)}>{conversation.lastPreview || "Conversation"}</button>
        ))}
      </div>
      <Card className="space-y-3 p-4">
        {(messages.data || []).map((message) => <p key={message._id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{message.body}</p>)}
        {active ? (
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void api.post(`/conversations/${active}/messages`, { body }).then(() => { setBody(""); void messages.refetch(); }); }}>
            <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message" />
            <Button type="submit">Send</Button>
          </form>
        ) : <Empty title="Select a conversation" body="Enquiries from a product page start a conversation." />}
      </Card>
    </div>
  );
}

export function InspectionsPage() {
  const rows = useList<{ _id: string; number: string; status: string; reportId?: string }[]>("inspections", "/me/inspections");
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Inspections</h1>
      {(rows.data || []).map((row) => (
        <Card key={row._id} className="flex items-center justify-between p-4 text-sm">
          <span>{row.number} · {titleCase(row.status)}</span>
          {row.reportId ? <Link className="text-brand" to={`/account/inspections/${row.reportId}`}>View report</Link> : null}
        </Card>
      ))}
      {!rows.data?.length ? <Empty title="No inspections" body="Request one from a product page after the payment gateway is configured." /> : null}
    </div>
  );
}

export function AddressPage() {
  const addresses = useList<{ _id: string; label: string; line1: string; city: string }[]>("addresses", "/me/addresses");
  const client = useQueryClient();
  const [form, setForm] = useState({ label: "Home", name: "", phone: "", line1: "", city: "Kochi", district: "Ernakulam", state: "Kerala", pincode: "" });
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Addresses</h1>
      {(addresses.data || []).map((address) => <Card key={address._id} className="p-4 text-sm">{address.label}: {address.line1}, {address.city}</Card>)}
      <Card className="grid gap-3 p-4 md:grid-cols-2">
        {(["name", "phone", "line1", "city", "district", "pincode"] as const).map((key) => (
          <Field key={key} label={titleCase(key)}><Input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>
        ))}
        <Button onClick={() => void api.post("/me/addresses", form).then(() => client.invalidateQueries({ queryKey: ["addresses"] }))}>Save address</Button>
      </Card>
    </div>
  );
}

export function SupportPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  return (
    <Card className="space-y-3 p-5">
      <h1 className="text-3xl">Support</h1>
      <Field label="Subject"><Input value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
      <Field label="How can we help?"><TextArea value={body} onChange={(event) => setBody(event.target.value)} /></Field>
      <Button onClick={() => void api.post("/support", { subject, body }).then(() => setDone(true))}>Submit ticket</Button>
      {done ? <p className="text-sm text-success">Ticket received.</p> : null}
    </Card>
  );
}

export function SellerHome() {
  const listings = useList<{ id: string; title: string; status?: string; pricePaise: number }[]>("my-listings", "/me/listings");
  const orders = useList<{ _id: string; number: string; status: string }[]>("seller-orders", "/seller/orders");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-3xl">Showroom dashboard</h1><Link to="/showroom/listings"><Button>Add device</Button></Link></div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4"><p className="text-sm text-slate-500">Listings</p><p className="text-3xl">{listings.data?.length || 0}</p></Card>
        <Card className="p-4"><p className="text-sm text-slate-500">Orders</p><p className="text-3xl">{orders.data?.length || 0}</p></Card>
      </div>
      {(listings.data || []).map((listing) => (
        <Card key={listing.id} className="flex items-center justify-between p-4"><div><p>{listing.title}</p><Badge>{titleCase(listing.status)}</Badge></div><p>{money(listing.pricePaise)}</p></Card>
      ))}
    </div>
  );
}

export function NewListingPage() {
  const profile = useSession((state) => state.profile);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    condition: "excellent",
    price: "",
    categorySlug: "smartphones",
    brand: "",
    model: "",
    storageGb: "128",
    ramGb: "8",
    colour: "",
    processor: "",
    city: "Kochi",
    district: "Ernakulam",
    pincode: "682001",
    imei: "",
  });
  async function submit() {
    setError(null);
    try {
      const business = profile?.businesses?.[0];
      if (!business && !profile?.seller) {
        await api.post("/auth/seller", { displayName: profile?.displayName || "Seller", city: form.city, district: form.district, state: "Kerala" });
      }
      await api.post("/products", {
        categorySlug: form.categorySlug,
        sellerType: business ? "business" : "individual",
        businessId: business?._id,
        title: form.title,
        description: form.description,
        condition: form.condition,
        pricePaise: Math.round(Number(form.price) * 100),
        specs: {
          brand: form.brand,
          model: form.model,
          storageGb: Number(form.storageGb),
          ramGb: Number(form.ramGb),
          colour: form.colour || "Black",
          processor: form.processor || undefined,
        },
        imageKeys: [],
        location: { city: form.city, district: form.district, state: "Kerala", pincode: form.pincode },
        imei: form.imei || undefined,
        submit: true,
      });
      window.location.href = `${import.meta.env.BASE_URL}showroom`;
    } catch (reason) {
      setError(reason);
    }
  }
  return (
    <Card className="grid gap-3 p-5 md:grid-cols-2">
      <h1 className="text-3xl md:col-span-2">New listing</h1>
      <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field>
      <Field label="Price (INR)"><Input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
      <Field label="Category">
        <select className="w-full rounded-lg border px-3 py-2" value={form.categorySlug} onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}>
          <option value="smartphones">Smartphone</option>
          <option value="laptops">Laptop</option>
        </select>
      </Field>
      <Field label="Condition">
        <select className="w-full rounded-lg border px-3 py-2" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>
          <option value="like_new">Like new</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
      </Field>
      {(["brand", "model", "colour", "processor", "storageGb", "ramGb", "city", "district", "pincode", "imei"] as const).map((key) => (
        <Field key={key} label={titleCase(key)}><Input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></Field>
      ))}
      <div className="md:col-span-2"><Field label="Description"><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
      <Button onClick={() => void submit()}>Submit for review</Button>
      {error ? <ErrorNote error={error} /> : null}
    </Card>
  );
}

export function PartnerJobs() {
  const jobs = useList<{ partner: { verificationStatus: string; paused?: boolean }; jobs: { _id: string; number: string; status: string; productTitle?: string; city?: string; appointmentAt?: string }[] }>("jobs", "/partner/jobs");
  const client = useQueryClient();
  async function act(id: string, action: "accept" | "reject") {
    await api.post(`/partner/jobs/${id}/${action}`, action === "reject" ? { reason: "Unavailable" } : {});
    await client.invalidateQueries({ queryKey: ["jobs"] });
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Jobs</h1>
        <Button variant="secondary" onClick={() => void api.patch("/partner/availability", { paused: !jobs.data?.partner.paused }).then(() => client.invalidateQueries({ queryKey: ["jobs"] }))}>
          {jobs.data?.partner.paused ? "Resume jobs" : "Pause jobs"}
        </Button>
      </div>
      <p className="text-sm text-slate-500">Verification: {jobs.data?.partner.verificationStatus || "no profile"}. Jobs are offered only after admin approval.</p>
      {(jobs.data?.jobs || []).map((job) => (
        <Card key={job._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-medium">{job.productTitle || job.number}</p>
            <p className="text-sm text-slate-500">{job.city} · {job.number}</p>
            <Badge>{titleCase(job.status)}</Badge>
          </div>
          {job.status === "offered" ? <div className="flex gap-2"><Button onClick={() => void act(job._id, "accept")}>Accept</Button><Button variant="secondary" onClick={() => void act(job._id, "reject")}>Reject</Button></div> : null}
          {["accepted", "scheduled", "in_progress"].includes(job.status) ? <Link to={`/partner/jobs/${job._id}`}><Button>Open job</Button></Link> : null}
        </Card>
      ))}
      {jobs.isSuccess && !jobs.data.jobs.length ? <Empty title="No jobs assigned" body="Approved partners receive a job when a buyer pays for an inspection inside their service area." /> : null}
    </div>
  );
}

export function AdminHome() {
  const metrics = useList<Record<string, number | { _id: string; amount: number; count: number }[]>>("metrics", "/admin/metrics");
  const payments = Array.isArray(metrics.data?.payments) ? metrics.data?.payments : [];
  const cards = ["users", "listings", "orders", "inspections", "reports", "openDisputes", "approvedPartners"];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Platform</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((key) => <Card key={key} className="p-4"><p className="text-sm text-slate-500">{titleCase(key)}</p><p className="text-2xl">{String(metrics.data?.[key] ?? "—")}</p></Card>)}
      </div>
      <Card className="h-64 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={payments.map((row) => ({ name: row._id, rupees: row.amount / 100 }))}>
            <XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="rupees" fill="#2563EB" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export function AdminListings() {
  const listings = useList<{ id: string; title: string; status?: string }[]>("admin-listings", "/admin/listings?status=pending_review");
  const client = useQueryClient();
  const moderate = useMutation({
    mutationFn: async (input: { id: string; status: "active" | "rejected" }) => api.patch(`/admin/listings/${input.id}`, { status: input.status, reason: input.status === "rejected" ? "Does not meet listing standards." : undefined }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin-listings"] }),
  });
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Listing moderation</h1>
      {(listings.data || []).map((listing) => (
        <Card key={listing.id} className="flex items-center justify-between p-4">
          <p>{listing.title}</p>
          <div className="flex gap-2">
            <Button onClick={() => moderate.mutate({ id: listing.id, status: "active" })}>Approve</Button>
            <Button variant="danger" onClick={() => moderate.mutate({ id: listing.id, status: "rejected" })}>Reject</Button>
          </div>
        </Card>
      ))}
      {!listings.data?.length ? <Empty title="No listings waiting" body="New seller submissions land here before they can be purchased." /> : null}
    </div>
  );
}

export function AdminPeople() {
  const businesses = useList<{ _id: string; name: string; verificationStatus: string }[]>("admin-businesses", "/admin/businesses");
  const partners = useList<{ _id: string; name: string; verificationStatus: string }[]>("admin-partners", "/admin/partners");
  const client = useQueryClient();
  async function verify(kind: "businesses" | "partners", id: string, status: "approved" | "rejected") {
    await api.patch(`/admin/${kind}/${id}/verification`, { status });
    await client.invalidateQueries();
  }
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-3"><h2 className="text-2xl">Businesses</h2>{(businesses.data || []).map((item) => <Card key={item._id} className="space-y-2 p-4"><p>{item.name}</p><Badge>{item.verificationStatus}</Badge>{item.verificationStatus === "pending" ? <Button onClick={() => void verify("businesses", item._id, "approved")}>Approve</Button> : null}</Card>)}</section>
      <section className="space-y-3"><h2 className="text-2xl">Partners</h2>{(partners.data || []).map((item) => <Card key={item._id} className="space-y-2 p-4"><p>{item.name}</p><Badge>{item.verificationStatus}</Badge>{item.verificationStatus === "pending" ? <Button onClick={() => void verify("partners", item._id, "approved")}>Approve</Button> : null}</Card>)}</section>
    </div>
  );
}

export function SellerOrdersPage() {
  const orders = useList<{ _id: string; number: string; status: string; subOrders: { _id: string; status: string }[] }[]>("seller-orders-page", "/seller/orders");
  const client = useQueryClient();
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Seller orders</h1>
      {(orders.data || []).map((order) => (
        <Card key={order._id} className="space-y-2 p-4">
          <p className="font-medium">{order.number}</p>
          {order.subOrders.map((sub) => (
            <div key={sub._id} className="flex items-center justify-between text-sm">
              <span>{titleCase(sub.status)}</span>
              <Button onClick={() => void api.patch(`/seller/orders/${order._id}/suborders/${sub._id}`, { status: "delivered" }).then(() => client.invalidateQueries({ queryKey: ["seller-orders-page"] }))}>Mark delivered</Button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

export function ApplyPartnerPage() {
  const profile = useSession((state) => state.profile);
  const [done, setDone] = useState("");
  const [error, setError] = useState<unknown>(null);
  if (!profile) return <Empty title="Sign in to apply" body="Partner applications are attached to your SureGad account." />;
  return (
    <Card className="mx-auto mt-6 max-w-lg space-y-3 p-5">
      <h1 className="text-3xl">Become a partner</h1>
      <p className="text-sm text-slate-600">Admin has to approve the profile before any inspection job is offered. Documents can be added through signed uploads once storage is configured.</p>
      <Button
        onClick={() =>
          api
            .post("/auth/partner", {
              name: profile.displayName,
              phone: "9999999999",
              email: profile.email || "partner@example.com",
              categories: ["smartphones", "laptops"],
              experienceYears: 2,
              serviceRadiusKm: 15,
              address: { name: profile.displayName, phone: "9999999999", line1: "Service area", city: "Kochi", district: "Ernakulam", state: "Kerala", pincode: "682001", coordinates: { lat: 9.9312, lng: 76.2673 } },
              agreementAccepted: true,
            })
            .then(() => setDone("Application submitted. You will not receive jobs until an admin approves it."))
            .catch(setError)
        }
      >
        Submit application
      </Button>
      {done ? <p className="text-sm">{done}</p> : null}
      {error ? <ErrorNote error={error} /> : null}
    </Card>
  );
}

export function StaticInfo({ title, body }: { title: string; body: string[] }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-4xl">{title}</h1>
      {body.map((paragraph) => <p key={paragraph} className="text-slate-600">{paragraph}</p>)}
    </article>
  );
}
