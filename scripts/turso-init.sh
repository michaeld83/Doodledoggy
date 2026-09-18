#!/usr/bin/env bash
# Apply Prisma schema + seed to a Turso database (requires turso CLI logged in).
set -euo pipefail
DB_NAME="${1:-doodledoggy}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SQL="$(mktemp)"
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$SQL"
echo "Applying schema to Turso DB: $DB_NAME"
turso db shell "$DB_NAME" < "$SQL"
rm -f "$SQL"
if [[ -z "${TURSO_DATABASE_URL:-}" || -z "${TURSO_AUTH_TOKEN:-}" ]]; then
  echo "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN, then run: npm run db:seed"
  exit 0
fi
npm run db:seed
