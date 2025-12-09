# Monorepo Layout

This repository is organized for Vercel deployment with separate frontend and backend areas:

- `web/` contains the React + Vite frontend.
- `functions/` holds backend serverless functions that Vercel exposes under `/api`.
- `vercel.json` configures the build pipeline and routing for both parts.

## Development

- Frontend: run `npm install` then `npm run dev` inside `web/`.
- Backend: place additional serverless handlers under `functions/api/`.

## Deployment

The included `vercel.json` uses Vercel's static build for the frontend and Node functions for the backend, so the project can be imported directly into Vercel.

## Operations

- **Health check**: `GET /api/health` returns `{ "status": "ok", "firestore": { ... } }` when the service is healthy.
  - By default the Firestore check is skipped and the payload notes that status.
  - If `FIRESTORE_PROJECT_ID` and `FIRESTORE_BEARER_TOKEN` are provided, the function performs a lightweight read against `/health/health` (or `FIRESTORE_HEALTH_COLLECTION`/`FIRESTORE_HEALTH_DOCUMENT` overrides) and includes document metadata in the response.
  - Firestore connection or dependency issues cause the endpoint to return HTTP 500 so external monitors surface outages quickly.

## Check-in links

- **Issue a token + link**: `POST /api/checkin-token` with `memberId`, `churchId`, `serviceDate`, optional `serviceType`, `email`, and `baseUrl`.
  - Requires `CHECKIN_JWT_SECRET` plus Firebase Admin service account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Optional overrides: `FIRESTORE_CHECKIN_COLLECTION`, `FIRESTORE_NOTIFICATION_COLLECTION`, `CHECKIN_TOKEN_TTL_MINUTES`, `APP_BASE_URL`.
  - Stores a nonce document in Firestore and, when `email` and `baseUrl`/`APP_BASE_URL` are provided, queues a notification document containing the link `https://<app>/checkin?token=...`.
  - Returns both the direct link and a `qrImageUrl` (PNG) derived from that link so you can print or display a QR code for attendees to scan. The QR code is just the member-specific link encoded as an image; scanning it opens that URL.
  - **Identity logic**: each token embeds `memberId`, `churchId`, `serviceDate`, and a unique nonce. When `POST /api/verify-checkin` receives the token, it (a) validates the JWT signature with `CHECKIN_JWT_SECRET`, (b) fetches the nonce document, (c) confirms the stored fields match the token payload, and (d) marks the nonce consumed. That flow ensures a printed QR code or shared link still maps back to the single member who received it and cannot be reused.
  - **Per-member tokens**: because of the embedded `memberId`, the QR code/link identifies only that member. Generate one token per person (looping over your roster) and share individually; a single QR cannot auto-identify multiple members.
  - **Bulk sending**: when you have many members (hundreds or thousands), batch your API calls and provide each member’s email. The function will enqueue a notification document for every request so downstream mailers can deliver at scale without manual copying.
- **Verify and consume**: `POST /api/verify-checkin` with `token` to validate and mark a nonce as used; responses indicate success/failure and include the decoded payload for the client to record attendance.
