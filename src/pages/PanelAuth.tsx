import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useSession } from "../store/session";
import { Button, Card, ErrorNote, Field, Input } from "../components/ui";
import { BackButton } from "../components/navigation";

type Panel = "admin" | "partner" | "showroom";

const copy: Record<Panel, { title: string; home: string; blurb: string }> = {
  admin: { title: "Super admin", home: "/admin", blurb: "Sign in to review listings, approvals, and platform settings." },
  partner: { title: "Partner panel", home: "/partner", blurb: "Inspection partners manage jobs, reports, and recorded earnings." },
  showroom: { title: "Showroom panel", home: "/showroom", blurb: "Showrooms manage listings, orders, and buyer enquiries." },
};

export function PanelAuth({ panel, mode }: { panel: Panel; mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const setToken = useSession((state) => state.setToken);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("Kochi");
  const [error, setError] = useState<unknown>(null);
  const meta = copy[panel];

  async function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setError(null);
    try {
      const path = mode === "signup" ? "/auth/panel-signup" : "/auth/panel-login";
      const payload = mode === "signup" ? { panel, name, email, password, city } : { panel, email, password };
      const token = (await api.post(path, payload)).data.data.token as string;
      await setToken(token);
      navigate(meta.home);
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <Card className="w-full max-w-md space-y-4 p-6">
        <BackButton />
        <p className="text-xs font-bold tracking-[0.16em] text-brand uppercase">{meta.title}</p>
        <h1 className="font-display text-2xl font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
        <p className="text-sm text-slate-500">{meta.blurb}</p>
        <form className="space-y-3" onSubmit={submit}>
          {mode === "signup" ? (
            <Field label={panel === "showroom" ? "Showroom name" : "Name"}>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
          ) : null}
          <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></Field>
          {mode === "signup" ? <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} required /></Field> : null}
          <Button className="w-full" type="submit">{mode === "signup" ? "Create account" : "Sign in"}</Button>
        </form>
        {error ? <ErrorNote error={error} /> : null}
        {panel !== "admin" ? (
          <p className="text-sm text-slate-500">
            {mode === "login" ? (
              <Link className="font-semibold text-brand" to={panel === "partner" ? "/partner/signup" : "/showroom/signup"}>Create an account</Link>
            ) : (
              <Link className="font-semibold text-brand" to={panel === "partner" ? "/partner/login" : "/showroom/login"}>Already registered? Sign in</Link>
            )}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
