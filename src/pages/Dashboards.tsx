import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { money, titleCase } from "../lib/utils";
import { Button, Card, Empty, Field, Input, TextArea } from "../components/ui";
import { useSession } from "../store/session";
import { firebaseConfigured } from "../lib/firebase";
import { enablePush } from "../lib/push";
import { VerifyEmailBanner } from "./Auth";

function toUint8(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function enableWebPush() {
  if (firebaseConfigured()) {
    const result = await enablePush();
    if (result === "denied") throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
    if (result === "unsupported") throw new Error("This browser does not support notifications.");
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
      <VerifyEmailBanner />
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
      <div className="grid gap-3 sm:grid-cols-4">
        <Link to="/account/listings"><Card className="p-4">My listings</Card></Link>
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

export function InspectionsPage() {
  const rows = useList<{ _id: string; number: string; status: string; reportId?: string; role: "buyer" | "seller"; product: { title: string; slug: string } | null; conversationId: string | null }[]>("inspections", "/me/inspections");
  return (
    <div className="space-y-3">
      <h1 className="text-3xl">Inspections</h1>
      {(rows.data || []).map((row) => (
        <Card key={row._id} className="flex items-center justify-between gap-3 p-4 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{row.product?.title || row.number}</span>
            <span className="text-muted">{row.number} · {titleCase(row.status)} · {row.role === "seller" ? "On your listing" : "Booked by you"}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            {row.conversationId ? <Link className="font-semibold text-brand-700" to={`/chat/${row.conversationId}`}>Chat with inspector</Link> : null}
            {row.reportId ? <Link className="font-semibold text-brand-700" to={`/account/inspections/${row.reportId}`}>View report</Link> : null}
          </span>
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

export function StaticInfo({ title, body }: { title: string; body: string[] }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <h1 className="text-4xl">{title}</h1>
      {body.map((paragraph) => <p key={paragraph} className="text-slate-600">{paragraph}</p>)}
    </article>
  );
}
