# Apzla frontend (Vite + React)

This app powers the Apzla dashboard experience. It is built with Vite and reads its Firebase configuration from environment variables so keys never live in the repo.

## Environment variables

1. Copy `.env.example` to `.env.local` in this folder.
2. Fill in the Firebase values for your project:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

The Vite `VITE_` prefix ensures these values are exposed to the browser bundle. During local development they come from `.env.local`; in production (e.g. Vercel) set the same keys in the project settings so builds and previews pick them up automatically.

## Local development

```bash
npm install
npm run dev
```

## Deployment on Vercel

The repo is wired for Vercel via the root `vercel.json`. When importing the project into Vercel, add the same Firebase keys above as environment variables on the project so the static build has access to them. No Firebase credentials should be committed to the repo.
