# MG – Meet Genie: Free-First Deployment & Configuration Guide

## 1. Free-Tier Architecture Overview
MG – Meet Genie is designed around free-tier cloud services and transparent fair-use limits. No paid subscriptions or automatic billing are ever enabled.

- **Frontend + API Server**: Node.js (`tsx server.ts`) + React + Vite + Tailwind CSS + PWA
- **Primary Free AI Provider**: Google Gemini API (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`) via `GEMINI_API_KEY` (server-side only)
- **Fallback Free AI Provider**: OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemma-3-27b-it:free`) via `OPENROUTER_API_KEY` (server-side only)
- **Database & Auth**: Supabase Free Tier (PostgreSQL + Auth + Storage + RLS) via `supabase/schema.sql`, with an automatic local persistent store fallback for instant AI Studio development.

## 2. Obtaining Free API & Database Credentials
1. **Google Gemini API Key (Free Tier)**:
   - Visit Google AI Studio (`https://aistudio.google.com/apikey`).
   - Add `GEMINI_API_KEY` in AI Studio **Settings > Secrets** or your server environment.
2. **OpenRouter API Key (Optional Free Fallback)**:
   - Create an account at `https://openrouter.ai/keys`.
   - Set `OPENROUTER_API_KEY` in server environment variables. Only `:free` tier models are configured by default.
3. **Supabase Free Project (Optional PostgreSQL + Auth + Storage)**:
   - Create a free project at `https://supabase.com`.
   - Run `/supabase/schema.sql` in the Supabase SQL Editor to create all 14 tables, indexes, RLS policies, and the `mg-documents` private storage bucket.
   - Copy Project URL (`SUPABASE_URL`, `VITE_SUPABASE_URL`), Anon Key (`SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`), and Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`, server-only).
   - To enable Google Sign-In, configure the Google OAuth provider inside **Supabase Dashboard > Authentication > Providers > Google**.

## 3. Deploying to Google Cloud Run (Starter / Free Tier Eligibility)
> Note: Google Cloud Run offers a monthly free tier, **however Google Cloud projects often require a billing account to be linked before Cloud Run deployment**. Do not enable billing unless you have reviewed Google Cloud pricing quotas and set budget alerts.

```bash
npm install
npm run build
# Set environment variables in Cloud Run service configuration (never commit .env):
# GEMINI_API_KEY, SESSION_SECRET, ADMIN_EMAIL, and optional SUPABASE_* / OPENROUTER_API_KEY
npm start
```

## 4. Alternative Free Deployment Routes
- **GitHub + Render / Railway / Fly.io Free Tier**: Push this repository to GitHub and deploy the Node.js `npm run build && npm start` service.
- **Cloudflare Workers / Pages**: Frontend `dist/` deploys cleanly to Cloudflare Pages (free), and server routes in `server/` are structured as modular service handlers (`ai/gateway.ts`, `documents/processor.ts`, `db/store.ts`) ready for Worker adaptation.
