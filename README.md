# Nora TrimTex

Independent four-language catalogue and sample-request platform for decorative fabrics and trimmings. The production application has no runtime dependency on the legacy catalogue.

## Stack

- Next.js 16, React 19, TypeScript and Redux Toolkit
- Fastify API with schema validation, CORS and rate limiting
- PostgreSQL with versioned, automatic migrations
- Cloudflare R2 for product media
- Docker Compose and Caddy for automatic HTTPS
- English, German, Ukrainian and Russian

## Project layout

```text
src/                   storefront
server/                API, PostgreSQL migrations and import jobs
public/                 locally owned preview assets
data/catalog.seed.json curated starter catalogue
data/migration/         ignored one-time migration workspace
scripts/                offline import and normalization jobs
deploy/                 production Docker and HTTPS configuration
```

## Local development

The storefront can run without an API and uses the complete local catalogue for previews. The macOS launcher always builds and restarts it on port `4000`, then prints a fresh Cloudflare Quick Tunnel URL:

```bash
./build-and-tunnel-mac.sh
```

For the full stack, start PostgreSQL and then the API:

```bash
docker compose -f compose.local.yml up -d
cp server/.env.example server/.env
pnpm --dir server migrate
pnpm --dir server seed
pnpm dev:api
pnpm dev
```

Use this local connection in `server/.env`:

```text
DATABASE_URL=postgresql://trimmora:trimmora-local@localhost:5432/trimmora
```

Storefront: `http://localhost:4000`  
API: `http://localhost:4001`  
Readiness: `http://localhost:4001/ready`

## PostgreSQL

The first API start automatically applies the versioned schema. The database contains:

- `products` — localized content, variants, R2 media keys and catalogue flags
- `categories` — localized taxonomy
- `sample_requests` — customer sample requests
- `orders` — B2B orders with server-verified product prices
- `users` — retail, partner and administrator accounts with explicit status
- `auth_tokens` and `auth_sessions` — one-time email confirmation and revocable sessions
- `carts` — the current cart and limited technical session metadata for each signed-in customer
- `schema_migrations` — applied database versions

Manual commands:

```bash
pnpm --dir server migrate
pnpm --dir server seed
pnpm --dir server import:migration
```

## One-time catalogue and image migration

The source importer is an offline ETL job and never ships in the production containers. It checkpoints every catalogue page and every 25 images, so an interrupted transfer resumes safely.

```bash
CHINA_ACCOUNT=... CHINA_PASSWORD=... DOWNLOAD_IMAGES=1 pnpm migration:legacy
pnpm prepare:migration
```

`prepare:migration` produces the complete independent catalogue and local asset set. To publish it, upload every primary and variant image to R2, then seed PostgreSQL from `data/catalog.full.json`:

```bash
pnpm upload:assets
pnpm --dir server seed
```

R2 credentials are required only for the upload job and must never be exposed to the browser.

## Production deployment

The production topology keeps every component independent from the legacy site:

- Cloudflare Workers + OpenNext: multilingual Next.js storefront and administration UI
- Cloudflare R2: original product and brand images, served through a read-only Worker gateway
- Render: Dockerized Fastify API in Frankfurt
- Neon: managed PostgreSQL with a pooled connection string

Build and validate the storefront locally:

```bash
pnpm build:cloudflare
pnpm dry-run:cloudflare
```

`public/.assetsignore` prevents the local 1.9 GB product library from being included in the Worker deployment. Product, colour, dimension and technical images resolve through `NEXT_PUBLIC_ASSETS_URL`; local paths remain available only as a development fallback.

The R2 gateway configuration is `deploy/wrangler.assets.jsonc`. It allows public `GET` and `HEAD` only for known asset prefixes, never exposes bucket listing, and accepts uploads only while a temporary deployment token is present. The transfer script uploads bytes unchanged and resumes by comparing file sizes:

```bash
R2_UPLOAD_URL=https://assets-worker.example.workers.dev \
R2_UPLOAD_TOKEN=temporary-token \
node scripts/upload-r2-assets.mjs
```

Render uses the root `render.yaml` and deploys only `nora-trimtex-api`. Set `DATABASE_URL`, `CORS_ORIGINS`, `ASSETS_PUBLIC_URL`, `STOREFRONT_URL`, email variables and administrator bootstrap credentials in the Render dashboard. The first deployment imports the complete migrated catalogue into PostgreSQL; every API start applies versioned migrations before accepting traffic.

Before connecting the final Cloudflare domain, rebuild with final `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_ASSETS_URL` values so canonical URLs, hreflang, sitemap, structured data and image hosts are correct.

## Accounts and administration

The account button contains sign-in plus separate retail and partner registration forms. Retail accounts become active after email verification. Partner accounts move to `pending_approval` after verification and see partner prices only after an administrator approves them. There is no shared access password or separate login area.

Set `RESEND_API_KEY` and a verified `NOTIFICATION_FROM_EMAIL` to deliver confirmation and approval emails. Set `ADMIN_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` on the API service to bootstrap the administrator. The password is never committed to this repository.

The administration UI is available at `/admin`. Point an `admin` DNS record (for example `admin.example.com`) to the same frontend service; the Next proxy rewrites the subdomain root to `/admin`. Set `AUTH_COOKIE_DOMAIN=.example.com` only when the shop and admin UI use sibling subdomains. The panel lists registered clients, their saved cart, order history and pending partner applications.

## Verification

```bash
pnpm lint
pnpm build
pnpm --dir server typecheck
pnpm --dir server test
```

Set `NEXT_PUBLIC_SITE_URL` to the final domain before the production build so canonical URLs, hreflang, sitemap and structured data use the purchased domain. The current brand name is `Nora TrimTex`.
