# Deploy Doodledoggy (free + durable)

## Recommendation (2026)

| Option | Durable data? | Always free? | Notes |
|--------|---------------|--------------|-------|
| **D) Turso + Vercel Hobby + Blob** | Yes | Yes (Hobby + Turso Free + Blob Hobby caps) | Best lasting free path |
| A) Fly.io + volume | Yes while paid | No — trial ~2 VM hours / 7 days, then card | `fly.toml` ready |
| B) Render free + disk | No on Free | Free web has **no** persistent disk | SQLite/uploads lost on sleep |
| C) Railway trial | Yes during trial | Trial $5/30d then Free $1/mo (usually too little for always-on) | `railway.toml` ready |

Docker + SQLite + local uploads still work via `docker compose` / Fly / Railway.

---

## Path D — Turso + Vercel (phone-friendly)

### 1) Turso (free DB, no card)

1. On phone Safari open **https://app.turso.tech**
2. Tap **Sign up** → **Continue with GitHub** (use `michaeld83`)
3. Accept / authorize Turso
4. Tap **Create Database** → name `doodledoggy` → region near you → Create
5. Open the DB → **Connect** / tokens:
   - Copy **URL** (`libsql://…`) → this is `TURSO_DATABASE_URL`
   - Create token → copy → `TURSO_AUTH_TOKEN`

Apply schema (from a computer with Turso CLI, or ask the agent after login):

```bash
# generate SQL from Prisma schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/doodledoggy.sql
turso db shell doodledoggy < /tmp/doodledoggy.sql
TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:seed
```

### 2) Vercel (free Hobby host)

1. Phone Safari: **https://vercel.com/signup**
2. **Continue with GitHub** → authorize
3. **Add New… → Project** → Import **`michaeld83/Doodledoggy`**
4. Environment Variables (Production):

| Name | Value |
|------|--------|
| `TURSO_DATABASE_URL` | from Turso |
| `TURSO_AUTH_TOKEN` | from Turso |
| `SESSION_SECRET` | long random string |
| `DATABASE_URL` | `file:./placeholder.db` (build-time Prisma only) |
| `DOCUSIGN_MODE` | `mock` |
| `COI_WARN_THRESHOLD` | `6.25` |
| `COI_COMMON_ANCESTOR_GENS` | `4` |

5. **Storage → Create → Blob** (Hobby free caps) → connect to project → copies `BLOB_READ_WRITE_TOKEN`
6. Deploy → open the `*.vercel.app` URL → should show login

### 3) Logins (seed)

| Email | Password |
|-------|----------|
| `michael@doodledoggy.local` | `doodle2024!` |
| `partner@doodledoggy.local` | `doodle2024!` |

Change after first login in production.

---

## Path C — Railway (trial, Docker as-is)

1. Safari: **https://railway.app** → Login with GitHub
2. **New Project → Deploy from GitHub** → `Doodledoggy`
3. Settings → add **Volume** mount `/app/data` (0.5 GB on trial/free)
4. Variables: `SESSION_SECRET`, `SEED_ON_START=true`, `DATABASE_URL=file:/app/data/doodledoggy.db`, `UPLOAD_DIR=/app/public/uploads`
5. Generate domain → open HTTPS URL

Note: trial volumes may be deleted ~30 days after trial ends unless you upgrade (paid). Not lasting free.

---

## Path A — Fly.io

1. Safari: **https://fly.io/app/sign-up** → GitHub
2. On a computer (or agent with token): `fly auth login` then:

```bash
fly apps create doodledoggy
fly volumes create doodledoggy_data --size 1 --region ord
fly secrets set SESSION_SECRET='…' SEED_ON_START=true
fly deploy
```

Trial is short; durable use needs a payment method (do not add a card if you want $0).

---

## Local Docker (unchanged)

```bash
docker compose up --build
```
