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
