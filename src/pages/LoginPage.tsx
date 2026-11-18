import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ConfirmationResult } from "firebase/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { confirmPhoneCode, firebaseConfigured, sendPhoneCode, signInWithEmail, signInWithGoogle, signUpWithEmail } from "../lib/firebase";
import { useSession } from "../store/session";
import { Button, Card, ErrorNote, Field, Input } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const setToken = useSession((state) => state.setToken);
  const status = useQuery({ queryKey: ["status"], queryFn: async () => (await api.get("/system/status")).data.data as { devAuth: boolean; firebaseAdmin: boolean } });
  const [error, setError] = useState<unknown>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  async function establish(token: string) {
    await api.post("/auth/session", { token });
    await setToken(token);
    navigate("/account");
  }

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-6">
      <h1 className="text-3xl">Sign in</h1>
      <p className="text-sm text-slate-600">Email, Google and mobile OTP use Firebase. The API verifies the ID token and loads roles from the database.</p>
      <Card className="space-y-3 p-5">
        {firebaseConfigured() ? (
          <>
            <Field label="Email"><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="Password"><Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
            <Button className="w-full" onClick={() => signInWithEmail(email, password).then(establish).catch(setError)}>Sign in with email</Button>
            <Button className="w-full" variant="secondary" onClick={() => signUpWithEmail(email, password).then(establish).catch(setError)}>Create account</Button>
            <Button className="w-full" variant="secondary" onClick={() => signInWithGoogle().then(establish).catch(setError)}>Continue with Google</Button>
            <Field label="Mobile number">
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91XXXXXXXXXX" />
            </Field>
            <div id="recaptcha" />
            {!confirmation ? (
              <Button variant="secondary" onClick={() => sendPhoneCode(phone, "recaptcha").then(setConfirmation).catch(setError)}>Send OTP</Button>
            ) : (
              <>
                <Field label="OTP"><Input value={code} onChange={(event) => setCode(event.target.value)} /></Field>
                <Button onClick={() => confirmPhoneCode(confirmation, code).then(establish).catch(setError)}>Verify OTP</Button>
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">Paste the Firebase web config into client/.env and the Admin service account into server/.env, then restart both apps. Google, email, and push stay off until those values are present.</p>
        )}
        {!status.data?.firebaseAdmin && firebaseConfigured() ? <p className="text-sm text-amber-700">The browser config is present, but the API reported that Firebase Admin is not configured. Tokens will be rejected until the service account is set.</p> : null}
        {error ? <ErrorNote error={error} /> : null}
      </Card>
      {status.data?.devAuth ? (
        <Card className="space-y-3 p-5">
          <h2 className="text-lg">Local development sign-in</h2>
          <p className="text-sm text-slate-500">This endpoint is disabled when NODE_ENV is production. It does not replace Firebase.</p>
          <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Email"><Input value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Button
            variant="secondary"
            onClick={() =>
              api.post("/auth/dev-login", { name, email: email || undefined }).then((response) => establish(response.data.data.token)).catch(setError)
            }
          >
            Continue locally
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
