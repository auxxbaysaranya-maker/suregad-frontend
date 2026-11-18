import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

function writeFirebaseMessagingWorker(env: Record<string, string>) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
  };
  const source = `importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");
if (${JSON.stringify(Boolean(config.apiKey && config.projectId))}) {
  firebase.initializeApp(${JSON.stringify(config)});
  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload.notification && payload.notification.title ? payload.notification.title : "SureGad";
    const body = payload.notification && payload.notification.body ? payload.notification.body : "";
    self.registration.showNotification(title, { body: body });
  });
}
`;
  fs.writeFileSync(path.resolve(__dirname, "public/firebase-messaging-sw.js"), source);
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  writeFirebaseMessagingWorker(env);
  // "/" locally; "/suregad-frontend/" when published to GitHub Pages.
  const base = env.VITE_BASE_PATH || "/";
  return {
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["brand/favicon-64.png", "brand/apple-touch-icon.png", "brand/logo.png", "brand/mark.png"],
      manifest: {
        name: "SureGad",
        short_name: "SureGad",
        description: "Buy smart. Buy verified.",
        theme_color: "#3a3fe0",
        background_color: "#f7f6fc",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      devOptions: { enabled: true },
      workbox: {
        importScripts: [`${base}push-handler.js`],
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/\/api\//, /\/(account|sell|business|partner|admin)(\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/media": "http://localhost:4000",
      "/socket.io": { target: "http://localhost:4000", ws: true },
    },
  },
};
});
