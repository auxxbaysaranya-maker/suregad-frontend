self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "SureGad", body: "" };
  event.waitUntil(self.registration.showNotification(data.title || "SureGad", { body: data.body || "", data: new URL(String(data.url || "account").replace(/^\/+/, ""), self.registration.scope).href }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || new URL("account", self.registration.scope).href;
  event.waitUntil(self.clients.openWindow(target));
});
