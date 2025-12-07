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
