import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "./components/Toaster";
import { PwaPrompts } from "./components/PwaPrompts";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onAuthStateChanged } from "firebase/auth";
import { MotionConfig } from "framer-motion";
import { App } from "./App";
import { firebaseAuth } from "./lib/firebase";
import { useSession } from "./store/session";
import "./styles/index.css";

const queryClient = new QueryClient();

function Bootstrap() {
  const refresh = useSession((state) => state.refresh);
  const ready = useSession((state) => state.ready);
  useEffect(() => {
    if (ready) window.__sgDismiss?.();
  }, [ready]);
  useEffect(() => {
    const client = firebaseAuth();
    if (!client) {
      void refresh();
      return;
    }
    // Firebase restores the signed-in user from its own storage; the API layer sends a fresh
    // ID token with each request. A stored development token is left alone.
    return onAuthStateChanged(client, async (user) => {
      if (user) localStorage.setItem("sg_token", await user.getIdToken());
      else if (!localStorage.getItem("sg_token")?.startsWith("dev.")) localStorage.removeItem("sg_token");
      await refresh();
    });
  }, [refresh]);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Bootstrap />
          <Toaster />
          <PwaPrompts />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
);
