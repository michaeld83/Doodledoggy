# Deploy Doodledoggy — free durable public URL

**Goal:** `https://….vercel.app` login page on Safari, with data that survives redeploys.  
**No Cursor Pro / Azure / credit card.**

Plain SQLite on Vercel serverless does **not** persist. Use:

| Piece | Free product | Role |
|-------|--------------|------|
| Host | **Vercel Hobby** | Next.js HTTPS |
| DB | **Turso Free** | SQLite-compatible, durable |
| Uploads | **Vercel Blob** (Hobby) | Photos / health files |

Fly / Render / Railway free tiers are **not** lasting for SQLite+uploads without paying (Fly trial ≈ 2 VM-hours; Render free has no persistent disk). Config files remain if you later accept paid volumes.

---

## Phone steps (Safari) — do once

### 1) Turso (no card)

1. Open **https://app.turso.tech**
2. **Sign up** → **Continue with GitHub** → authorize as **`michaeld83`**
3. **Create Database** → name **`doodle2024!`** → US region → Create
4. Open the DB → copy **LibSQL URL** (`libsql://doodledoggy-….turso.io`) → save as Notes
5. **Tokens → Create Token** (full access) → copy token → save as Notes

### 2) Vercel (Hobby free, no card)

1. Open **https://vercel.com/signup**
2. **Continue with GitHub** → authorize **`michaeld83`**
3. **Add New… → Project** → import **`michaeld83/Doodledoggy`**
4. Before Deploy, open **Environment Variables** and add (Production + Preview):

| Name | Value |
|------|--------|
| `DATABASE_URL` | `file:./tmp/build.db` |
| `TURSO_DATABASE_URL` | LibSQL URL from step 1 |
| `TURSO_AUTH_TOKEN` | Turso token from step 1 |
| `SESSION_SECRET` | any long random string (e.g. 32+ chars from a password generator) |
| `DOCUSIGN_MODE` | `mock` |
| `COI_WARN_THRESHOLD` | `6.25` |
| `COI_COMMON_ANCESTOR_GENS` | `4` |

5. **Storage → Create → Blob** → connect to this project (adds `BLOB_READ_WRITE_TOKEN`)
6. **Deploy** → wait until Ready → open the `https://….vercel.app` URL → you should see **Login**

### 3) Create login users (once)

On any computer (or iOS Shortcuts / Termius):

```bash
curl -X POST https://YOUR-APP.vercel.app/api/setup/seed \
  -H "x-setup-secret: YOUR_SESSION_SECRET"
```

This applies the Turso schema (if empty) and creates the two logins.

### 4) Log in on Safari

| Email | Password |
|-------|----------|
| `michael@doodledoggy.local` | `doodle2024!` |
| `partner@doodledoggy.local` | `doodle2024!` |

Optional full pedigree demo from a laptop with Turso env set: `npm run db:seed`

---

## After you finish OAuth

Reply with the Vercel URL (and optionally paste Turso URL/token privately). An agent can re-run seed and verify `/login` returns 200.

## Temporary Cloudflare tunnel

A `*.trycloudflare.com` URL may expose the Cursor box for short demos. It dies when the box/tunnel stops — **prefer Vercel+Turso**.

## Repo deploy files

- `vercel.json` — Vercel build
- `prisma/turso-schema.sql` — applied by `/api/setup/seed`
- `fly.toml` / `Dockerfile` / `railway.toml` — paid/volume hosts later
