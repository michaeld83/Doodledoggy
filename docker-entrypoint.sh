#!/bin/sh
set -e
mkdir -p /app/data /app/public/uploads
npx prisma db push --skip-generate
if [ "$SEED_ON_START" = "true" ]; then
  npx tsx prisma/seed.ts || true
fi
exec "$@"
