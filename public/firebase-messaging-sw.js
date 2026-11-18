importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");
if (false) {
  firebase.initializeApp({"apiKey":"","authDomain":"","projectId":"","storageBucket":"","messagingSenderId":"","appId":""});
  firebase.messaging().onBackgroundMessage((payload) => {
    const title = payload.notification && payload.notification.title ? payload.notification.title : "SureGad";
    const body = payload.notification && payload.notification.body ? payload.notification.body : "";
    self.registration.showNotification(title, { body: body });
  });
}
