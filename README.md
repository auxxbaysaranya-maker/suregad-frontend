# SureGad — web app

Frontend for SureGad, a marketplace for used and refurbished phones and laptops with optional physical inspection.

Built with React 19, TypeScript, Vite 7, Tailwind CSS 4, TanStack Query, Zustand, Framer Motion, Socket.IO (live chat) and Leaflet (maps).

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

The app runs on http://localhost:5173. In development, Vite proxies `/api`, `/media` and `/socket.io` to the API at `http://localhost:4000`, so leave `VITE_API_URL` empty.

## Build

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the build locally
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Origin of the SureGad API, for example `https://api.suregad.com`. Empty means same origin. |
| `VITE_BASE_PATH` | Path the site is served from. `/` locally; the Pages workflow sets `/<repo-name>/`. |
| `VITE_FIREBASE_*` | Firebase web config for Google / phone sign-in and push notifications. |
| `VITE_VAPID_PUBLIC_KEY` | Public key for web push. |

All of these end up in public JavaScript. Never put server secrets in them.

## GitHub Pages

`.github/workflows/deploy-pages.yml` builds and publishes the site on every push to `main`.

One-time setup in the repository on GitHub:

1. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables:** add `VITE_API_URL` (and the Firebase variables if you use sign-in or push).

The site is then served at `https://<user>.github.io/<repo-name>/`.

GitHub Pages only hosts static files. The marketplace needs the SureGad API running somewhere reachable over HTTPS, and that API must allow the Pages origin in its `CLIENT_ORIGIN` setting (CORS). Without it, pages load but listings, sign-in and chat cannot work.
