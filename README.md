# Doodledoggy

**Ancestry for dog breeding** — private kennel web app for Mini Golden Doodles Georgia.

Built for exactly **2 users** (no public signup). Soft kennel-friendly UI with dual header logos.

## Features (v1)

- **Dogs CRUD** — registered/call name, sex, breed, DOB, status, microchip/registration, photo, notes, mother/father links
- **Pedigree** — interactive 3–4 generation view on each dog page (live from relationships)
- **Inbreeding / COI** — Wright’s coefficient before mating/litter; warns on high COI or common ancestor within N gens; **requires confirmation** (never silent allow)
- **Litters & puppies** — dam/sire, whelp/expected dates, notes; puppies with temp name, sex, color, status, pick position
- **Deposits / DocuSign** — reservations with payment tracking; mock path + live JWT sandbox/production envelope send
- **Health/vet files** — notes + uploads on disk; timeline on dog page
- **Auth** — simple login; 2 seeded users
- **Dashboard** — active dogs, upcoming litters, open reservations, health follow-ups, new inquiries
- **Inquiries** — webhook-ready contact leads (GoDaddy/form planned); staff list + status

## Tech

- Next.js 14 App Router + TypeScript + Tailwind
- SQLite + Prisma
- Docker Compose with volumes for DB + uploads

## Default logins

| Email | Password | Name |
|-------|----------|------|
| `michael@doodledoggy.local` | `doodle2024!` | Michael |
| `partner@doodledoggy.local` | `doodle2024!` | Partner |

Change these after first login in production (re-seed or update `passwordHash` via Prisma).

## Local run

```bash
cd Doodledoggy
cp .env.example .env   # if needed
npm install
npm run db:setup       # prisma db push + seed
npm run dev            # http://localhost:3000
```

Other scripts:

- `npm run build` — generate Prisma client + production build
- `npm run start` — run production server
- `npm run db:seed` — re-seed fictional 3-generation pedigree

## Docker

```bash
docker compose up --build
```

- App: http://localhost:3000
- Volumes: `doodledoggy_data` (SQLite), `doodledoggy_uploads` (health/photo files)
- Set `SEED_ON_START=false` after first boot if you do not want re-seed attempts

## Environment variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | SQLite path | `file:../data/doodledoggy.db` |
| `SESSION_SECRET` | Cookie HMAC secret | (change in prod) |
| `COI_WARN_THRESHOLD` | Warn at/above this COI % | `6.25` |
| `COI_COMMON_ANCESTOR_GENS` | Common-ancestor window | `4` |
| `UPLOAD_DIR` | Disk path for uploads | `./public/uploads` |
| `DOCUSIGN_MODE` | `mock` \| `sandbox` \| `live` | `mock` |
| `DOCUSIGN_INTEGRATION_KEY` | DocuSign client ID | empty |
| `DOCUSIGN_USER_ID` | Impersonated user GUID | empty |
| `DOCUSIGN_ACCOUNT_ID` | Account ID | empty |
| `DOCUSIGN_AUTH_SERVER` | Auth host | `https://account-d.docusign.com` |
| `DOCUSIGN_ACCOUNT_BASE_URI` | REST API base | `https://demo.docusign.net` |
| `DOCUSIGN_PRIVATE_KEY` | RSA PEM string (Vercel) | empty |
| `DOCUSIGN_PRIVATE_KEY_PATH` | RSA private key file (local) | empty |

## DocuSign setup (JWT)

1. Create a DocuSign developer account and an Integration (JWT Grant).
2. Generate an RSA keypair; upload the **public** key to DocuSign; keep the **private** key out of git.
3. Set `DOCUSIGN_*` env vars and `DOCUSIGN_MODE=sandbox` (or `live`).
4. For Vercel, set `DOCUSIGN_PRIVATE_KEY` to the PEM text (newlines as `\n`). Locally you can use `DOCUSIGN_PRIVATE_KEY_PATH` instead.
5. Set `DOCUSIGN_ACCOUNT_BASE_URI` (`https://demo.docusign.net` for sandbox).
6. Grant one-time JWT consent (open the consent URL from a `CONSENT_REQUIRED` response or Settings guide).
7. Sandbox/live mode uses Node crypto RS256 JWT + REST envelope create with status `sent`. Success always returns a real DocuSign `envelopeId`. Mock mode is unchanged.

See **Settings** in the app for the same checklist.


## Website form / GoDaddy (planned)

Website contact forms and GoDaddy lead email are **not connected yet** (no live URL or form inbox). When ready, point the form (or a Zapier/Make bridge) at:

`POST /api/inquiries/webhook`

Header: `X-Webhook-Secret: <INQUIRY_WEBHOOK_SECRET>`

Expected JSON body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "404-555-0100",
  "message": "Interested in a mini golden doodle puppy this spring.",
  "source": "godaddy_form",
  "externalId": "optional-idempotency-key-from-form"
}
```

- Required: `name`, `email`. Optional: `phone`, `message` (or `body`), `source` (`godaddy_form` | `email` | `manual` | `webhook`), `externalId` / `idempotencyKey` (dedupes retries).
- Success: `201` with the created inquiry (or `200` if the same `externalId` already exists).
- Staff manage leads at **Inquiries** (`/inquiries`): filter by status, update status, view raw payload.
- Future email import: use `mapEmailToInquiry({ from, subject, text, date })` in `src/lib/inquiry.ts` (stub only — no IMAP).

Set `INQUIRY_WEBHOOK_SECRET` in `.env` before enabling the webhook.

## Logo replacement

Place replaceable assets under `public/branding/`:

1. `state-emblem.svg` (or PNG) — round emblem
2. `mini-golden-doodles.svg` (or PNG) — “Mini Golden Doodles Georgia” bone with three dogs

Update `src/components/Header.tsx` if filenames change. See `public/branding/README.txt`.

## Seed data notes

Fictional 3-generation Mini Golden Doodle pedigree (Ace/Belle/Prestige/Pearl/Duke/Apricot → Maple/Oak/Willow/Cedar → Honey/River/Luna) plus litters and reservations useful for **COI demos** (e.g. Willow × River, Honey × Cedar).

## Out of scope

Native mobile, public customer portal, payment processing, real logo artwork.

## Deploy (free public URL)

See **[DEPLOY.md](./DEPLOY.md)** for Turso + Vercel (recommended lasting free), Railway trial, and Fly.io.

Runtime toggles:

- Set `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` to use Turso instead of local SQLite.
- Set `BLOB_READ_WRITE_TOKEN` to store uploads on Vercel Blob (needed on serverless).
