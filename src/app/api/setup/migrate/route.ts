import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

/**
 * Idempotent schema upgrade for existing Turso / SQLite DBs.
 * POST with header: x-setup-secret: <SESSION_SECRET>
 * Runs ADD COLUMN / CREATE TABLE IF NOT EXISTS; ignores duplicate-column errors.
 */
async function getLibsqlClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if (tursoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    return createClient({ url: tursoUrl, authToken: tursoToken });
  }
  // Local sqlite via prisma $executeRawUnsafe fallback
  return null;
}

function isIgnorableMigrateError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("duplicate column") ||
    m.includes("already exists") ||
    m.includes("duplicate") ||
    m.includes("exists")
  );
}

export async function POST(req: NextRequest) {
  const expected = process.env.SESSION_SECRET || process.env.SETUP_SECRET;
  const got = req.headers.get("x-setup-secret");
  if (!expected || !got || got !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sqlPath = path.join(process.cwd(), "prisma", "migrate-addons.sql");
    const sql = await readFile(sqlPath, "utf8");
    const stripped = sql.replace(/^--.*$/gm, "");
    const statements = stripped
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const client = await getLibsqlClient();
    const applied: string[] = [];
    const skipped: string[] = [];
    const errors: { statement: string; error: string }[] = [];

    for (const statement of statements) {
      const full = statement.endsWith(";") ? statement : `${statement};`;
      try {
        if (client) {
          await client.execute(full);
        } else {
          await prisma.$executeRawUnsafe(full);
        }
        applied.push(statement.slice(0, 80));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (isIgnorableMigrateError(message)) {
          skipped.push(statement.slice(0, 80));
        } else {
          errors.push({ statement: statement.slice(0, 120), error: message });
        }
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      applied: applied.length,
      skipped: skipped.length,
      errors,
      note: "Idempotent migrate for breedType, Customer, Contract, reservation fees, puppy tracking fields",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
