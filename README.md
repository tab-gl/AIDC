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

The console UI is built on [Astryx](https://www.npmjs.com/package/@astryxdesign/core) (`@astryxdesign/core` + `theme-neutral`) for layout, navigation, forms, dialogs, drawers, progress indicators and the command palette, with [`@m3e/web`](https://www.npmjs.com/package/@m3e/web) Material 3 Expressive web components for loading indicators. AIDC's existing light (`#f1f1f1`) and charcoal (`#1b1b1b`) colors inform the Astryx surfaces and the monochrome Material seed. Instrument Serif is bundled for headings; Astryx's Figtree remains the body and interface font. Settings stages browser-local preferences until you sync or revert them; defaults are staged too. Drafts stay available during console navigation, and a browser warning helps prevent losing them on reload. Settings include theme, Material contrast, text size, reduced motion, tips, haptic feedback, and the default Activity/Analytics range. Preferences are not synced to the server or other devices.

Phones use a separate shell with a floating navigation bar built on [ReactBits Glass Surface](https://reactbits.dev/components/glass-surface): the capsule truly refracts the page behind its rim while the centre stays calm, the current destination grows into a filled pill with its label while the other destinations stay icon-only, the bar tucks away while you scroll down and returns on the way up, and presses answer with a soft state layer, a small icon squeeze and a mild haptic pulse. Settings is deliberately not a bar destination — it lives behind the profile photo, which opens the account sheet (identity, Settings, Users, switch account, sign out) with focus trapping, scroll locking and a flick-to-dismiss gesture. The production build keeps React, Astryx and `@m3e/web` in separate long-lived chunks, so a deploy only invalidates the ~55 kB app bundle plus the small glass and icon chunks. Both shells draw glyphs from the [Solar](https://solar-icons.dev) icon set (`@solar-icons/react`, CC BY 4.0 — see `THIRD-PARTY-NOTICES.md`): `src/ui/Icon.tsx` maps the console's semantic names to Solar Outline glyphs for idle state and Solar Bold (solid) glyphs for the selected destination, rendered as inline SVG in the current text colour, so new icons should reuse an existing glyph rather than add custom artwork. Small motion primitives are adapted from [Animata](https://animata.design) and [Skiper UI](https://skiper-ui.com) — scroll reveal, a standards marquee, a hover spotlight and a border trail. The reveal runs on [motion.dev](https://motion.dev) (`motion` / `motion/react`) in `src/ui/motion.tsx`; the rest is CSS. The landing hero sits on a dithered pixel field adapted from [ReactBits Pixel Blast](https://reactbits.dev/backgrounds/pixel-blast), drawn on canvas in `src/ui/PixelBlast.tsx` so no WebGL or three.js dependency is added. Tabs, toggles and segmented choices use [glisse](https://glisse.kelvinzhang.com), a liquid-glass control set with real lens refraction: the application drawer's eight sections are a glisse tab bar (spring selection, drag and lens, ARIA tabs with arrow/Home/End keys), Settings' theme, contrast, text-size and range pickers plus the Activity/Analytics range pickers are glisse segmented controls, and every preference switch is glisse's draggable switch. `src/ui/glisse.ts` is the single entry point so its stylesheet and JavaScript ride with the lazy views that need them (a ~68 kB chunk) instead of the app shell; its defaults are retinted to AIDC's palette in `src/app.css`. The Material 3 Expressive shape-morph loading indicator is still `@m3e/web`'s `m3e-loading-indicator`. The landing navbar and the phone navigation bar are both the [ReactBits Glass Surface](https://reactbits.dev/components/glass-surface), vendored in `src/ui/GlassSurface.tsx` and `src/ui/GlassSurface.css` (upstream by David Haz, MIT + Commons Clause — see `THIRD-PARTY-NOTICES.md`). It uses SVG displacement in Chromium and WebGL elsewhere when a backdrop is supplied, falling back to a frosted surface when neither is available, and it respects `prefers-reduced-transparency`. The glass chunk is split out so the desktop shell can reuse it from cache instead of shipping it with the app shell.

Run the unit and DOM tests with `npm test` (they cover the icon mapping, the glisse tabs/segmented controls/switches, the drawer sections, date labels, the glass surface, the floating navigation, the account sheet, the API request budget and the static server's path containment) and the browser tests with `npm run test:e2e` (install Playwright Chromium or set `CHROMIUM_PATH` to use a pre-installed Chromium).

## Vercel deployment

- Import this repository into Vercel with the project root at the repository root. The vercel.json file configures the Vite build, SPA fallback, and same-origin /api + /auth proxy routes.
- Add the server-side environment variable AIDC_BACKEND_URL in Vercel for Production, Preview, and Development as appropriate. It must be the deployed private backend's bare HTTPS origin. Do not use a VITE_ prefix for this value.
- Keep VITE_AIDC_API_BASE_URL empty in production so the browser uses the same-origin proxy. This preserves the backend's session and OAuth cookies without cross-origin CORS configuration.
- Add console.ace-base.cc to the Vercel project and publish the DNS records Vercel provides.
- Configure the backend's AIDC_PUBLIC_ORIGIN as https://console.ace-base.cc, then register https://console.ace-base.cc/auth/callback as the Ace ID OAuth redirect URI.
- The frontend proxy is not usable until AIDC_BACKEND_URL points to a live backend. Never put backend secrets in VITE_* variables.

The proxy forwards API/auth methods, query strings, CSRF headers, redirects, and Set-Cookie headers. It refuses scheme-relative paths so a crafted request cannot turn the proxy into a request to another host, and it applies a timeout and `Cache-Control: no-store` to API responses. `server.mjs` (the standalone Node deployment) resolves static files by relative containment rather than a string prefix, so `dist-evil` or encoded `..` segments cannot escape the bundle, and it serves only GET/HEAD with a strict CSP, HSTS behind HTTPS, frame denial, `nosniff` and a restrictive permissions policy. The same headers are configured for Vercel in `vercel.json`; the CSP allows same-origin scripts and styles, the self-hosted fonts, HTTPS avatar images and same-origin/HTTPS API connections. Backend deployment and database changes are separate from this frontend project.
