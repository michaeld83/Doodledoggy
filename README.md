# Doodledoggy

**Ancestry for dog breeding** — private kennel web app for Mini Golden Doodles Georgia.

Built for exactly **2 users** (no public signup). Soft kennel-friendly UI with dual header logos.

## Features (v1)

- **Dogs CRUD** — registered/call name, sex, breed, DOB, status, microchip/registration, photo, notes, mother/father links
- **Pedigree** — interactive 3–4 generation view on each dog page (live from relationships)
- **Inbreeding / COI** — Wright’s coefficient before mating/litter; warns on high COI or common ancestor within N gens; **requires confirmation** (never silent allow)
- **Litters & puppies** — dam/sire, whelp/expected dates, notes; puppies with temp name, sex, color, status, pick position
- **Deposits / DocuSign stub** — reservations with payment tracking; payload builder + mock path; live send never faked
- **Health/vet files** — notes + uploads on disk; timeline on dog page
- **Auth** — simple login; 2 seeded users
- **Dashboard** — active dogs, upcoming litters, open reservations, health follow-ups

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
| `DOCUSIGN_PRIVATE_KEY_PATH` | RSA private key file | empty |

## DocuSign setup (JWT)

1. Create a DocuSign developer account and an Integration (JWT Grant).
2. Generate an RSA keypair; upload the **public** key to DocuSign; store the **private** key on the server.
3. Set `DOCUSIGN_*` env vars and `DOCUSIGN_MODE=sandbox` (or `live`).
4. Grant one-time JWT consent for the integration key.
5. This app **builds envelope payloads** and supports **mock** sends. With credentials present but no full `docusign-esign` JWT client wired, status is `CONFIGURED_PENDING` — it does **not** claim a successful live send.

See **Settings** in the app for the same checklist.

## Logo replacement

Place replaceable assets under `public/branding/`:

1. `state-emblem.svg` (or PNG) — round emblem
2. `mini-golden-doodles.svg` (or PNG) — “Mini Golden Doodles Georgia” bone with three dogs

Update `src/components/Header.tsx` if filenames change. See `public/branding/README.txt`.

## Seed data notes

Fictional 3-generation Mini Golden Doodle pedigree (Ace/Belle/Prestige/Pearl/Duke/Apricot → Maple/Oak/Willow/Cedar → Honey/River/Luna) plus litters and reservations useful for **COI demos** (e.g. Willow × River, Honey × Cedar).

## Out of scope

Native mobile, public customer portal, payment processing, real logo artwork.
