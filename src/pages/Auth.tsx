import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, MailCheck, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { adminUrl } from "../lib/config";
import { cn } from "../lib/utils";
import {
  authMessage,
  checkResetCode,
  completePasswordReset,
  confirmEmailVerification,
  firebaseConfigured,
  passwordProblem,
  passwordStrength,
  refreshEmailVerified,
  resendVerificationEmail,
  sendResetEmail,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../lib/firebase";
import { useSession } from "../store/session";
import { toast } from "../components/Toaster";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------------- shared pieces ---------------- */

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-[28px] bg-white shadow-card ring-1 ring-line">
        <div className="relative isolate overflow-hidden bg-brand-gradient px-6 py-7 text-white">
          <div aria-hidden="true" className="absolute -top-16 -right-10 -z-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <h1 className="text-[26px] leading-tight text-white">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-[14px] text-white/85">{subtitle}</p> : null}
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
      {footer ? <div className="mt-5 text-center text-[14px] text-muted">{footer}</div> : null}
    </div>
  );
}

function TextField({ label, error, hint, ...props }: { label: string; error?: string | null; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <input
        {...props}
        aria-invalid={Boolean(error) || undefined}
        className={cn("w-full rounded-2xl bg-canvas px-4 py-3 text-[15px] ring-1 ring-line outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400", error && "ring-red-300 focus:ring-red-400")}
      />
      {error ? <span className="block text-[12px] text-danger">{error}</span> : hint ? <span className="block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

function PasswordField({ label = "Password", value, onChange, autoComplete, error, meter }: { label?: string; value: string; onChange: (value: string) => void; autoComplete: string; error?: string | null; meter?: boolean }) {
  const [shown, setShown] = useState(false);
  const strength = passwordStrength(value);
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      <span className="relative block">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error) || undefined}
          className={cn("w-full rounded-2xl bg-canvas py-3 pr-12 pl-4 text-[15px] ring-1 ring-line outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-400", error && "ring-red-300")}
        />
        <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink">
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {meter && value ? (
        <span className="flex items-center gap-2">
          <span className="flex flex-1 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < strength ? (strength <= 1 ? "bg-danger" : strength === 2 ? "bg-warning" : "bg-success") : "bg-line")} />
            ))}
          </span>
          <span className="text-[12px] text-muted">{labels[strength]}</span>
        </span>
      ) : null}
      {error ? <span className="block text-[12px] text-danger">{error}</span> : null}
    </label>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-gradient text-[15px] font-semibold text-white shadow-glow transition hover:brightness-110 disabled:opacity-60">
      {busy ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function GoogleButton({ label, onToken, disabled }: { label: string; onToken: (token: string) => Promise<void>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onToken(await signInWithGoogle());
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") toast.error("Google sign-in didn't work", authMessage(error));
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[15px] font-semibold text-ink ring-1 ring-line transition hover:ring-brand-300 disabled:opacity-60"
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />} {label}
    </button>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[12px] text-muted">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Unavailable() {
  return <p className="rounded-2xl bg-amber-50 p-4 text-[14px] text-amber-900 ring-1 ring-amber-200">Sign-in is being set up and isn't available right now. Please try again later.</p>;
}

/** Where to go after signing in: back to where the user came from, or their account. */
function useAfterSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from && !/^\/(login|signup|forgot-password|auth)/.test(from) ? from : "/account", { replace: true });
  };
}

/** Server errors (suspended account, email conflicts) arrive as normal API errors. */
function serverMessage(error: unknown) {
  const code = (error as { code?: string }).code;
  if (code === "ACCOUNT_SUSPENDED" || code === "ACCOUNT_DISABLED") return "This account is suspended. Contact SureGad support.";
  return error instanceof Error ? error.message : authMessage(error);
}

/* ---------------- sign in ---------------- */

export function LoginPage() {
  const startSession = useSession((state) => state.startSession);
  const profile = useSession((state) => state.profile);
  const after = useAfterSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (profile) after();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(token: string) {
    try {
      const signedIn = await startSession(token);
      toast.success(`Welcome, ${signedIn.displayName.split(" ")[0]}`);
      after();
    } catch (reason) {
      setError(serverMessage(reason));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");
    setBusy(true);
    try {
      await finish(await signInWithEmail(email, password));
    } catch (reason) {
      setError(authMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to chat with sellers, make offers and track orders." footer={<>New to SureGad? <Link to="/signup" className="font-semibold text-brand-700">Create an account</Link></>}>
      {!firebaseConfigured() ? <DevSignIn /> : (
        <>
          <GoogleButton label="Continue with Google" onToken={finish} />
          <Divider />
          <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
            <TextField label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
            <div className="-mt-1 text-right"><Link to="/forgot-password" state={{ email }} className="text-[13px] font-semibold text-brand-700">Forgot password?</Link></div>
            {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{error}</p> : null}
            <SubmitButton busy={busy}>Sign in</SubmitButton>
          </form>
          <p className="mt-5 text-center text-[12px] text-muted">Selling as a showroom or inspecting devices? <a href={adminUrl("login")} className="font-semibold text-brand-700">Use SureGad Hub</a></p>
        </>
      )}
    </AuthCard>
  );
}

/* ---------------- create account ---------------- */

export function SignupPage() {
  const startSession = useSession((state) => state.startSession);
  const after = useAfterSignIn();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function google(token: string) {
    try {
      await startSession(token);
      toast.success("Account ready");
      after();
    } catch (reason) {
      setErrors({ form: serverMessage(reason) });
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter your name.";
    if (!EMAIL.test(form.email.trim())) next.email = "Enter a valid email address.";
    const weak = passwordProblem(form.password);
    if (weak) next.password = weak;
    if (form.confirm !== form.password) next.confirm = "Passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const token = await signUpWithEmail(form.email, form.password, form.name.trim());
      await startSession(token, form.name.trim());
      setSentTo(form.email.trim());
    } catch (reason) {
      const code = (reason as { code?: string }).code;
      setErrors(code?.startsWith("auth/") ? { form: authMessage(reason) } : { form: serverMessage(reason) });
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your inbox" subtitle="One more step to secure your account.">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600"><MailCheck size={30} /></span>
          <p className="mt-4 text-[15px]">We sent a verification link to <strong className="break-all">{sentTo}</strong>.</p>
          <p className="mt-1 text-[13px] text-muted">You can start browsing now. Verify your email to keep your account secure and recoverable.</p>
          <button type="button" onClick={after} className="mt-6 h-12 w-full rounded-full bg-brand-gradient text-[15px] font-semibold text-white shadow-glow">Continue to SureGad</button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account" subtitle="Buy verified used and refurbished phones and laptops." footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link></>}>
      {!firebaseConfigured() ? <Unavailable /> : (
        <>
          <GoogleButton label="Sign up with Google" onToken={google} />
          <Divider />
          <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
            <TextField label="Full name" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} />
            <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={errors.email} />
            <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" error={errors.password} meter />
            <PasswordField label="Confirm password" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} autoComplete="new-password" error={errors.confirm} />
            <p className="text-[12px] text-muted">At least 8 characters with letters and a number.</p>
            {errors.form ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{errors.form}</p> : null}
            <SubmitButton busy={busy}>Create account</SubmitButton>
          </form>
          <p className="mt-5 text-center text-[12px] text-muted">Any account can sell. Own a shop? <Link to="/become-a-seller" className="font-semibold text-brand-700">Register a showroom</Link> · <Link to="/become-a-partner" className="font-semibold text-brand-700">Become a partner</Link></p>
        </>
      )}
    </AuthCard>
  );
}

/* ---------------- forgot password ---------------- */

export function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState(((location.state as { email?: string } | null)?.email || "").trim());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!EMAIL.test(email.trim())) return setError("Enter a valid email address.");
    setBusy(true);
    try {
      await sendResetEmail(email);
      setSent(true);
    } catch (reason) {
      const code = (reason as { code?: string }).code;
      // Never reveal whether an account exists.
      if (code === "auth/user-not-found" || code === "auth/invalid-email") setSent(true);
      else setError(authMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a secure link to choose a new one." footer={<Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand-700"><ArrowLeft size={15} /> Back to sign in</Link>}>
      {!firebaseConfigured() ? <Unavailable /> : sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-50 text-brand-600"><Mail size={30} /></span>
          <p className="mt-4 text-[15px]">If an account exists for <strong className="break-all">{email.trim()}</strong>, a reset link is on its way.</p>
          <p className="mt-1 text-[13px] text-muted">The link expires in about an hour. Check your spam folder if it doesn't arrive in a few minutes.</p>
          <button type="button" onClick={() => setSent(false)} className="mt-5 text-[13px] font-semibold text-brand-700">Use a different email</button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
          <TextField label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {error ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{error}</p> : null}
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}

/* ---------------- Firebase email action links (/auth/action) ---------------- */

/**
 * Handles the links in Firebase's emails. Set Firebase Console → Authentication → Templates →
 * Customise action URL to https://suregad.in/auth/action so these open here.
 */
export function AuthActionPage() {
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode") || "";
  const next = params.get("continueUrl");
  if (mode === "resetPassword") return <ResetPassword code={code} next={next} />;
  if (mode === "verifyEmail") return <VerifyEmail code={code} next={next} />;
  return (
    <AuthCard title="Link not recognised">
      <p className="text-[14px] text-muted">This link isn't valid. Request a new one from the sign-in page.</p>
      <Link to="/login" className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-gradient px-6 text-[14px] font-semibold text-white">Go to sign in</Link>
    </AuthCard>
  );
}

/** Only follow continue URLs back to SureGad sites. */
function safeNext(next: string | null, fallback: string) {
  if (!next) return fallback;
  try {
    const url = new URL(next);
    const allowed = [window.location.origin, new URL(adminUrl()).origin];
    return allowed.includes(url.origin) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function ResetPassword({ code, next }: { code: string; next: string | null }) {
  const check = useQuery({ queryKey: ["reset-code", code], queryFn: () => checkResetCode(code), retry: false, enabled: Boolean(code) && firebaseConfigured() });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const loginUrl = safeNext(next, `${window.location.origin}${import.meta.env.BASE_URL}login`);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const weak = passwordProblem(password);
    if (weak) nextErrors.password = weak;
    if (confirm !== password) nextErrors.confirm = "Passwords don't match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      await completePasswordReset(code, password);
      setDone(true);
    } catch (reason) {
      setErrors({ form: authMessage(reason) });
    } finally {
      setBusy(false);
    }
  }

  if (!code || check.isError) {
    return (
      <AuthCard title="Link expired">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-50 text-danger"><XCircle size={30} /></span>
          <p className="mt-4 text-[14px] text-muted">{check.error ? authMessage(check.error) : "This reset link is incomplete."}</p>
          <Link to="/forgot-password" className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-gradient px-6 text-[14px] font-semibold text-white">Request a new link</Link>
        </div>
      </AuthCard>
    );
  }
  if (check.isLoading) return <AuthCard title="Checking your link…"><Loader2 className="mx-auto animate-spin text-brand-600" /></AuthCard>;
  if (done) {
    return (
      <AuthCard title="Password changed">
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-success"><CheckCircle2 size={30} /></span>
          <p className="mt-4 text-[14px] text-muted">Sign in with your new password.</p>
          <a href={loginUrl} className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-gradient px-6 text-[14px] font-semibold text-white">Sign in</a>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" subtitle={<>For <strong className="break-all">{check.data}</strong></>}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" error={errors.password} meter />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" error={errors.confirm} />
        {errors.form ? <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-danger ring-1 ring-red-100">{errors.form}</p> : null}
        <SubmitButton busy={busy}><KeyRound size={17} /> Save new password</SubmitButton>
      </form>
    </AuthCard>
  );
}

function VerifyEmail({ code, next }: { code: string; next: string | null }) {
  const refresh = useSession((state) => state.refresh);
  const result = useQuery({ queryKey: ["verify-email", code], queryFn: async () => { await confirmEmailVerification(code); return true; }, retry: false, enabled: Boolean(code) && firebaseConfigured() });
  useEffect(() => {
    if (result.isSuccess) void api.post("/auth/session", {}).catch(() => undefined).finally(() => void refresh());
  }, [result.isSuccess, refresh]);
  const target = safeNext(next, `${window.location.origin}${import.meta.env.BASE_URL}account`);
  return (
    <AuthCard title={result.isSuccess ? "Email verified" : result.isError || !code ? "Link expired" : "Verifying…"}>
      <div className="text-center">
        {result.isLoading ? <Loader2 className="mx-auto animate-spin text-brand-600" /> : result.isSuccess ? (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-success"><ShieldCheck size={30} /></span>
            <p className="mt-4 text-[14px] text-muted">Thanks — your email is confirmed.</p>
            <a href={target} className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-gradient px-6 text-[14px] font-semibold text-white">Continue</a>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-red-50 text-danger"><XCircle size={30} /></span>
            <p className="mt-4 text-[14px] text-muted">{result.error ? authMessage(result.error) : "This verification link is incomplete."} Sign in and request a new one.</p>
            <Link to="/login" className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-gradient px-6 text-[14px] font-semibold text-white">Sign in</Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}

/* ---------------- email verification banner ---------------- */

/** Shown in the account area until the email is verified. */
export function VerifyEmailBanner() {
  const profile = useSession((state) => state.profile);
  const refresh = useSession((state) => state.refresh);
  const [busy, setBusy] = useState<"" | "send" | "check">("");
  if (!profile || profile.emailVerified !== false || !firebaseConfigured()) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[14px] text-amber-900 ring-1 ring-amber-200">
      <MailCheck size={18} className="shrink-0" />
      <span className="min-w-[min(100%,220px)] flex-1 [overflow-wrap:anywhere]">Verify your email <strong>{profile.email}</strong> to keep your account secure.</span>
      <button type="button" disabled={Boolean(busy)} onClick={async () => {
        setBusy("send");
        try {
          await resendVerificationEmail();
          toast.success("Verification email sent");
        } catch (error) {
          toast.error("Couldn't send the email", authMessage(error));
        } finally {
          setBusy("");
        }
      }} className="h-9 rounded-full bg-white px-4 text-[13px] font-semibold ring-1 ring-amber-200">{busy === "send" ? "Sending…" : "Resend email"}</button>
      <button type="button" disabled={Boolean(busy)} onClick={async () => {
        setBusy("check");
        try {
          if (await refreshEmailVerified()) {
            await api.post("/auth/session", {});
            await refresh();
            toast.success("Email verified");
          } else toast.info("Not verified yet", "Open the link in the email, then try again.");
        } finally {
          setBusy("");
        }
      }} className="h-9 rounded-full bg-amber-900 px-4 text-[13px] font-semibold text-white">{busy === "check" ? "Checking…" : "I've verified"}</button>
    </div>
  );
}

/* ---------------- development sign-in (only when Firebase is not configured) ---------------- */

function DevSignIn() {
  const setToken = useSession((state) => state.setToken);
  const after = useAfterSignIn();
  const status = useQuery({ queryKey: ["status"], queryFn: async () => (await api.get("/system/status")).data.data as { devAuth: boolean } });
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  if (!status.data?.devAuth) return <Unavailable />;
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const response = form.password ? await api.post("/auth/password-login", { email: form.email, password: form.password }) : await api.post("/auth/dev-login", { name: form.name, email: form.email || undefined });
          await setToken(response.data.data.token);
          after();
        } catch {
          /* the API layer shows the error */
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="rounded-2xl bg-canvas p-3 text-[12px] text-muted">Development sign-in (Firebase isn't configured for this build).</p>
      <TextField label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <TextField label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <PasswordField value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="current-password" />
      <SubmitButton busy={busy}>Continue</SubmitButton>
    </form>
  );
}
