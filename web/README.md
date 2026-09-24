# Pramana — web

The public site: landing page, the two case files, and the self-assessment page.
It is a fully static Next.js export — no server — so it deploys to Firebase Hosting
as plain files.

```
app/                 routes: /, /cases/[id]/, /assess/
components/three/    the 3D precision-ladder stack and ledger chain (react-three-fiber)
components/case/     case runner, results dashboard, in-browser ledger verification
components/charts/   SVG charts with hover tooltips
lib/ledger.ts        SHA-256 chain, Merkle root and Ed25519 checks via Web Crypto
public/casefiles/    the case bundles, reports, ledgers and probe images the pages load
```

## Run locally

```bash
npm ci
npm run dev          # http://localhost:3100
```

## Deploy to Firebase Hosting

One-time setup: create a Firebase project in the console, then copy
`.firebaserc.example` to `.firebaserc` and put the project id in it.

```bash
npx firebase-tools login
npm run deploy       # next build -> out/, then firebase deploy --only hosting
```

`firebase.json` serves `out/` with clean URLs, long-lived caching for hashed assets,
and `nosniff` / `DENY` framing headers.
