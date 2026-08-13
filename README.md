# MarketPilot AI

A private, single-user AI marketing operating system for one startup. The Next.js frontend deploys to Vercel; the FastAPI backend and PostgreSQL deploy to Render.

## What works

- Persistent startup profile, campaigns, channel drafts, leads, SEO audits, and audit logs
- AI campaign strategy and X/LinkedIn/Instagram/Reddit drafts
- Safe rules-based generation when no AI key is configured
- Manual content approval before any provider publish call
- OAuth connection flows for X, LinkedIn, Instagram, and Reddit
- Encrypted provider token storage and X/Reddit token refresh
- Publishing through official provider APIs
- Live on-page SEO audit with private-network/SSRF protection
- Consent-gated Brevo follow-up email
- Vercel server proxy so backend/provider secrets never reach the browser
- Render Blueprint and Docker deployment files

## Local setup

Copy `.env.example` to `.env.local` for Next.js. Copy the backend variables into `backend/.env`.

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/uvicorn app.main:app --app-dir backend --reload
```

Use `http://localhost:3000/app`. Backend API docs are available locally at `http://localhost:8000/docs`.

## Security model

The browser calls `/api/backend/*` on Vercel. The Next.js route adds `BACKEND_APP_SECRET` server-side and proxies to Render. Render must use the identical `APP_SECRET`. OAuth credentials, Brevo keys, the AI key, database URL, and encryption key exist only on Render.

## Deploy

1. Create the backend and PostgreSQL from `render.yaml` in Render.
2. Set `FRONTEND_URL` to the final Vercel URL and `BACKEND_URL` to the Render service URL.
3. Deploy the repository to Vercel and set `RENDER_API_URL` plus `BACKEND_APP_SECRET`. The secret must exactly match Render's `APP_SECRET`.
4. Add `NEXT_PUBLIC_APP_URL` as the Vercel URL.
5. Verify `/api/health` reports both web and backend as `ok`.

No custom domain is required. The default `*.vercel.app` and `*.onrender.com` HTTPS addresses work.

## Provider setup

Register these callback URLs, replacing the host with the Render service URL:

```text
https://YOUR-RENDER-SERVICE.onrender.com/v1/integrations/x/callback
https://YOUR-RENDER-SERVICE.onrender.com/v1/integrations/linkedin/callback
https://YOUR-RENDER-SERVICE.onrender.com/v1/integrations/instagram/callback
https://YOUR-RENDER-SERVICE.onrender.com/v1/integrations/reddit/callback
```

Required access:

- X: OAuth 2.0 Authorization Code with PKCE and post read/write access.
- LinkedIn: Sign In with LinkedIn plus Share on LinkedIn (`w_member_social`).
- Instagram: a Professional account connected to a Facebook Page, with Instagram content publishing permissions.
- Reddit: a registered OAuth web app with `identity` and `submit`; follow each community's rules and never mass-post.
- Brevo: an API key and a verified sender email. Follow-ups remain blocked unless a lead has recorded consent.

The first thing to do after deployment is open **Setup**, enter your real startup description, audience, offer, voice, and website, then connect each provider.
