# AIDC

AIDC (Ace Identity Developer Console) is The Ace Base's frontend for managing applications connected to Ace ID, including OAuth/OIDC configuration, redirect URIs, credentials, branding, activity, and operational health.

This repository contains the public React + TypeScript frontend. The API and identity-sensitive operations are maintained and deployed separately; no server secrets belong in this repository or in `VITE_*` variables.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
```

By default, the Vite development server proxies `/api` and `/auth` to `http://localhost:3000`. Set `VITE_AIDC_API_BASE_URL` to the backend origin when the frontend must call a separately hosted API. The backend must be configured for credentialed requests, allowed frontend origins, and its CSRF-cookie model before cross-origin deployment. A same-origin reverse proxy is the simplest production arrangement.

See the [AIDC documentation](https://docs.ace-base.cc/projects/aidc) for setup and API integration guidance.

## UI stack

The console UI is built on [Astryx](https://www.npmjs.com/package/@astryxdesign/core) (`@astryxdesign/core` + `theme-neutral`) for layout, navigation, forms, dialogs, drawers, switches, progress indicators and the command palette, with [`@m3e/web`](https://www.npmjs.com/package/@m3e/web) Material 3 Expressive web components for loading indicators. AIDC's existing light (`#f1f1f1`) and charcoal (`#1b1b1b`) colors inform the Astryx surfaces and the monochrome Material seed. Instrument Serif is bundled for headings; Astryx's Figtree remains the body and interface font. Settings stages browser-local preferences until you sync or revert them; defaults are staged too. Drafts stay available during console navigation, and a browser warning helps prevent losing them on reload. Settings include theme, Material contrast, text size, reduced motion, tips, haptic feedback, and the default Activity/Analytics range. Preferences are not synced to the server or other devices.

Phones use a separate shell with a floating, Material 3 Expressive style navigation bar: the current destination grows into a filled pill with its label while the other destinations stay icon-only, the bar tucks away while you scroll down and returns on the way up, and presses answer with a soft state layer, a small icon squeeze and a mild haptic pulse. Settings is deliberately not a bar destination — it lives behind the profile photo, which opens the account sheet (identity, Settings, Users, switch account, sign out) with focus trapping, scroll locking and a flick-to-dismiss gesture. The production build keeps React, Astryx and `@m3e/web` in separate long-lived chunks, so a deploy only invalidates the ~70 kB app bundle. Both shells draw glyphs from the [HackerNoon Pixel Icon Library](https://pixeliconlibrary.com) (`@hackernoon/pixel-icon-library`), loaded as a 24px icon font in `src/main.tsx`. `src/ui/pixelIcons.ts` maps the console's semantic names to the package's `hn-*` glyphs, and `src/ui/PixelIcon.tsx` renders them at the requested size in the current text colour, so new icons should reuse an existing glyph rather than add custom artwork.

Run the unit and DOM tests with `npm test` (they cover the icon mapping, date labels, the floating navigation and the account sheet) and the browser tests with `npm run test:e2e` (install Playwright Chromium or set `CHROMIUM_PATH` to use a pre-installed Chromium).

## Vercel deployment

- Import this repository into Vercel with the project root at the repository root. The vercel.json file configures the Vite build, SPA fallback, and same-origin /api + /auth proxy routes.
- Add the server-side environment variable AIDC_BACKEND_URL in Vercel for Production, Preview, and Development as appropriate. It must be the deployed private backend's bare HTTPS origin. Do not use a VITE_ prefix for this value.
- Keep VITE_AIDC_API_BASE_URL empty in production so the browser uses the same-origin proxy. This preserves the backend's session and OAuth cookies without cross-origin CORS configuration.
- Add console.ace-base.cc to the Vercel project and publish the DNS records Vercel provides.
- Configure the backend's AIDC_PUBLIC_ORIGIN as https://console.ace-base.cc, then register https://console.ace-base.cc/auth/callback as the Ace ID OAuth redirect URI.
- The frontend proxy is not usable until AIDC_BACKEND_URL points to a live backend. Never put backend secrets in VITE_* variables.

The proxy forwards API/auth methods, query strings, CSRF headers, redirects, and Set-Cookie headers. Backend deployment and database changes are separate from this frontend project.
