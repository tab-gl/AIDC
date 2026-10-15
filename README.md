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

## Vercel deployment

- Import this repository into Vercel with the project root at the repository root. The vercel.json file configures the Vite build, SPA fallback, and same-origin /api + /auth proxy routes.
- Add the server-side environment variable AIDC_BACKEND_URL in Vercel for Production, Preview, and Development as appropriate. It must be the deployed private backend's bare HTTPS origin. Do not use a VITE_ prefix for this value.
- Keep VITE_AIDC_API_BASE_URL empty in production so the browser uses the same-origin proxy. This preserves the backend's session and OAuth cookies without cross-origin CORS configuration.
- Add console.ace-base.cc to the Vercel project and publish the DNS records Vercel provides.
- Configure the backend's AIDC_PUBLIC_ORIGIN as https://console.ace-base.cc, then register https://console.ace-base.cc/auth/callback as the Ace ID OAuth redirect URI.
- The frontend proxy is not usable until AIDC_BACKEND_URL points to a live backend. Never put backend secrets in VITE_* variables.

The proxy forwards API/auth methods, query strings, CSRF headers, redirects, and Set-Cookie headers. Backend deployment and database changes are separate from this frontend project.
