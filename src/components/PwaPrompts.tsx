import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, PlusSquare, RefreshCw, Share, Smartphone } from "lucide-react";
import { Modal } from "./Modal";
import { toast } from "./Toaster";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const APP_NAME = "SureGad";
const SNOOZE_KEY = "sg_install_snoozed_until";
const UPDATE_CHECK_MS = 60_000;

function snoozed() {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
}

function snooze(days: number) {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    /* storage unavailable: the prompt simply shows again next visit */
  }
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

/**
 * Service-worker lifecycle for the installed app:
 * - "Update available" with an Update button whenever a new version is deployed (checked every minute
 *   and when the app returns to the foreground). Updating activates the new worker and reloads.
 * - "Install" prompt on Android/desktop Chrome and Edge, and Add-to-Home-Screen steps on iPhone/iPad.
 */
export function PwaPrompts() {
  const [iosHelp, setIosHelp] = useState(false);
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (registration.installing || !navigator.onLine) return;
        void registration.update().catch(() => undefined);
      };
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast({
      id: "pwa-update",
      tone: "info",
      duration: 0,
      icon: <RefreshCw size={20} />,
      title: "Update available",
      description: `A new version of ${APP_NAME} is ready.`,
      actions: [
        {
          label: "Update now",
          primary: true,
          onClick: async () => {
            // Activates the waiting worker and reloads; the timed reload covers pages the old worker didn't control.
            setTimeout(() => window.location.reload(), 2500);
            await updateServiceWorker(true);
          },
        },
        { label: "Later", onClick: () => toast.dismiss("pwa-update") },
      ],
    });
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    if (isStandalone()) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      if (snoozed()) return;
      toast({
        id: "pwa-install",
        tone: "info",
        duration: 0,
        icon: <Smartphone size={20} />,
        title: `Install ${APP_NAME}`,
        description: "Open it from your home screen, full screen, with faster loading.",
        actions: [
          {
            label: "Install",
            primary: true,
            onClick: async () => {
              const prompt = deferred.current;
              if (!prompt) return;
              await prompt.prompt();
              const choice = await prompt.userChoice;
              deferred.current = null;
              toast.dismiss("pwa-install");
              if (choice.outcome === "dismissed") snooze(7);
            },
          },
          { label: "Not now", onClick: () => { snooze(7); toast.dismiss("pwa-install"); } },
        ],
      });
    };
    const onInstalled = () => {
      deferred.current = null;
      toast.dismiss("pwa-install");
      toast.success("App installed", `${APP_NAME} is on your home screen.`);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari has no install API: offer the manual steps instead.
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIos() && !snoozed()) {
      timer = setTimeout(() => {
        toast({
          id: "pwa-install",
          tone: "info",
          duration: 0,
          icon: <Download size={20} />,
          title: `Install ${APP_NAME}`,
          description: "Add it to your home screen for an app-like experience.",
          actions: [
            { label: "Show me how", primary: true, onClick: () => { toast.dismiss("pwa-install"); setIosHelp(true); } },
            { label: "Not now", onClick: () => { snooze(7); toast.dismiss("pwa-install"); } },
          ],
        });
      }, 4000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <Modal open={iosHelp} onOpenChange={setIosHelp} title={`Install ${APP_NAME}`} description="Two taps in Safari:" size="sm">
      <ol className="space-y-3 text-[14px]">
        <li className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-line"><Share size={18} /></span>
          <span>Tap <strong>Share</strong> in Safari's toolbar.</span>
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-line"><PlusSquare size={18} /></span>
          <span>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span>
        </li>
      </ol>
      <p className="mt-3 text-[12px] text-muted">On iPhone and iPad this only works in Safari. If you're in another browser, open this page in Safari first.</p>
      <button type="button" onClick={() => { snooze(30); setIosHelp(false); }} className="mt-4 h-11 w-full rounded-full bg-brand-gradient text-[14px] font-semibold text-white shadow-glow">Got it</button>
    </Modal>
  );
}
