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
