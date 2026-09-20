import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Which env var the Prisma CLI connects through. CLI-ONLY: the running app
// builds its own connection from DATABASE_URL, so nothing here touches
// request traffic.
//
// Migrations MUST NOT run through a connection pooler. `migrate deploy` holds a
// session-level advisory lock, and PgBouncer either loses it across the pool or
// strands it on a recycled connection, so the run dies with P1002 ("Timed out
// trying to acquire a postgres advisory lock"). Hence the unpooled names first.
//
// DATABASE_PRISMA_URL is deliberately NOT the top choice despite its name:
// Neon's Vercel integration sets it to the POOLED url with `?pgbouncer=true`.
// Names that don't exist fall through; local dev has only DATABASE_URL and
// lands on the last entry.
const DATABASE_URL_VARS = [
  "DATABASE_URL_UNPOOLED",
  "DATABASE_URL_NON_POOLING",
  "DATABASE_PRISMA_URL",
  "DATABASE_URL",
] as const;

const urlVar =
  DATABASE_URL_VARS.find((name) => process.env[name]) ?? "DATABASE_URL";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env(urlVar),
  },
});
