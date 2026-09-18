import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Bootstrap schema + logins on serverless (Turso + Vercel).
 * POST with header: x-setup-secret: <SESSION_SECRET>
 */
async function ensureTursoSchema() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (!tursoUrl) return { applied: false, reason: "no TURSO_DATABASE_URL" };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
  const client = createClient({ url: tursoUrl, authToken: tursoToken });

  const existing = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
  );
  if (existing.rows.length > 0) {
    return { applied: false, reason: "tables already exist" };
  }

  const sqlPath = path.join(process.cwd(), "prisma", "turso-schema.sql");
  const sql = await readFile(sqlPath, "utf8");
  // Split on statement boundaries Prisma emits; skip empty / comment-only chunks.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    await client.execute(statement.endsWith(";") ? statement : `${statement};`);
  }
  return { applied: true, statements: statements.length };
}

export async function POST(req: NextRequest) {
  const expected = process.env.SESSION_SECRET || process.env.SETUP_SECRET;
  const got = req.headers.get("x-setup-secret");
  if (!expected || !got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schema = await ensureTursoSchema();

    const hash = await bcrypt.hash("doodle2024!", 10);
    const users = [
      { email: "michael@doodledoggy.local", name: "Michael", passwordHash: hash },
      { email: "partner@doodledoggy.local", name: "Partner", passwordHash: hash },
    ] as const;

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        create: { ...u },
        update: { passwordHash: u.passwordHash, name: u.name },
      });
    }

    return NextResponse.json({
      ok: true,
      schema,
      userCount: await prisma.user.count(),
      logins: users.map((u) => u.email),
      note: "For full pedigree demo data, run locally with TURSO_* set: npm run db:seed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
