import { useEffect, useRef, useState, type ReactNode } from "react";
import { create } from "zustand";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type ToastTone = "success" | "error" | "warning" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void | Promise<void>;
  /** Primary actions get the brand gradient. */
  primary?: boolean;
}

export interface ToastInput {
  title: string;
  description?: ReactNode;
  tone?: ToastTone;
  /** Milliseconds before it closes. 0 keeps it until dismissed. */
  duration?: number;
  actions?: ToastAction[];
  /** Replaces an existing toast with the same id instead of stacking a new one. */
  id?: string;
  icon?: ReactNode;
}

interface Toast extends Required<Pick<ToastInput, "title" | "tone" | "duration">> {
  id: string;
  description?: ReactNode;
  actions?: ToastAction[];
  icon?: ReactNode;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

const DEFAULT_DURATION: Record<ToastTone, number> = { success: 3500, info: 4500, warning: 6000, error: 6500, loading: 0 };

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (input) => {
    const id = input.id || Math.random().toString(36).slice(2);
    const tone = input.tone || "info";
    const next: Toast = { id, title: input.title, description: input.description, tone, duration: input.duration ?? DEFAULT_DURATION[tone], actions: input.actions, icon: input.icon, createdAt: Date.now() };
    set((state) => ({ toasts: [...state.toasts.filter((toast) => toast.id !== id), next].slice(-5) }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Call from anywhere (components, API helpers, event handlers). */
export const toast = Object.assign((input: ToastInput) => useToasts.getState().push(input), {
  success: (title: string, description?: ReactNode, options: Partial<ToastInput> = {}) => useToasts.getState().push({ ...options, title, description, tone: "success" }),
  error: (title: string, description?: ReactNode, options: Partial<ToastInput> = {}) => useToasts.getState().push({ ...options, title, description, tone: "error" }),
  warning: (title: string, description?: ReactNode, options: Partial<ToastInput> = {}) => useToasts.getState().push({ ...options, title, description, tone: "warning" }),
  info: (title: string, description?: ReactNode, options: Partial<ToastInput> = {}) => useToasts.getState().push({ ...options, title, description, tone: "info" }),
  loading: (title: string, description?: ReactNode, options: Partial<ToastInput> = {}) => useToasts.getState().push({ ...options, title, description, tone: "loading" }),
  dismiss: (id: string) => useToasts.getState().dismiss(id),
});

const TONES: Record<ToastTone, { icon: ReactNode; ring: string; bar: string; chip: string }> = {
  success: { icon: <CheckCircle2 size={20} />, ring: "ring-emerald-200", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600" },
  error: { icon: <XCircle size={20} />, ring: "ring-red-200", bar: "bg-red-500", chip: "bg-red-50 text-red-600" },
  warning: { icon: <AlertTriangle size={20} />, ring: "ring-amber-200", bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600" },
  info: { icon: <Info size={20} />, ring: "ring-brand-200", bar: "bg-brand-gradient", chip: "bg-brand-50 text-brand-600" },
  loading: { icon: <Loader2 size={20} className="animate-spin" />, ring: "ring-brand-200", bar: "bg-brand-gradient", chip: "bg-brand-50 text-brand-600" },
};

function ToastCard({ item }: { item: Toast }) {
  const dismiss = useToasts((state) => state.dismiss);
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const remaining = useRef(item.duration);
  const started = useRef(Date.now());
  const startX = useRef<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const tone = TONES[item.tone];

  const close = () => {
    setLeaving(true);
    setTimeout(() => dismiss(item.id), 180);
  };

  useEffect(() => {
    remaining.current = item.duration;
    started.current = Date.now();
  }, [item.createdAt, item.duration]);

  useEffect(() => {
    if (!item.duration || paused) return;
    started.current = Date.now();
    const timer = setTimeout(close, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, item.createdAt]);

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(event) => { startX.current = event.touches[0]!.clientX; setPaused(true); }}
      onTouchMove={(event) => { if (startX.current !== null) setDragX(event.touches[0]!.clientX - startX.current); }}
      onTouchEnd={() => { setPaused(false); if (Math.abs(dragX) > 90) close(); else setDragX(0); startX.current = null; }}
      style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, opacity: dragX ? Math.max(0.2, 1 - Math.abs(dragX) / 220) : undefined }}
      className={cn(
        "pointer-events-auto relative w-full overflow-hidden rounded-[22px] bg-white/95 p-3.5 pr-11 shadow-[0_18px_50px_-18px_rgba(16,17,55,0.45)] ring-1 backdrop-blur-md transition-[transform,opacity] duration-200",
        tone.ring,
        leaving ? "animate-[toast-out_0.18s_ease-in_forwards]" : "animate-[toast-in_0.32s_cubic-bezier(0.22,1,0.36,1)]",
      )}
    >
      <div className="flex gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-2xl", tone.chip)}>{item.icon || tone.icon}</span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[14px] leading-snug font-semibold text-ink">{item.title}</p>
          {item.description ? <div className="mt-0.5 text-[13px] leading-snug text-muted">{item.description}</div> : null}
          {item.actions?.length ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {item.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={async () => {
                    setBusy(action.label);
                    try {
                      await action.onClick();
                    } finally {
                      setBusy(null);
                    }
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition disabled:opacity-60",
                    action.primary ? "bg-brand-gradient text-white shadow-glow hover:brightness-110" : "bg-canvas text-ink ring-1 ring-line hover:ring-brand-300",
                  )}
                >
                  {busy === action.label ? <Loader2 size={14} className="animate-spin" /> : null}
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <button type="button" onClick={close} aria-label="Dismiss" className="absolute top-3 right-3 grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink">
        <X size={16} />
      </button>
      {item.duration ? (
        <span
          aria-hidden="true"
          className={cn("absolute bottom-0 left-0 h-[3px] w-full origin-left", tone.bar)}
          style={{ animation: `toast-progress ${item.duration}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
        />
      ) : null}
    </div>
  );
}

/** Mount once near the root. Bottom of the screen on phones (thumb reach), top-right on desktop. */
export function Toaster() {
  const toasts = useToasts((state) => state.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-auto sm:w-[400px] sm:px-0 sm:pb-0">
      {toasts.map((item) => <ToastCard key={item.id} item={item} />)}
    </div>
  );
}
