/**
 * Create or update a CMS account.
 *
 *   pnpm admin:create "njomza@nyoki.co.uk" "Njomza" OWNER
 *
 * The password is read from the ADMIN_PASSWORD environment variable rather
 * than an argument, so it does not end up in shell history or the process
 * list. Omit it and one is generated and printed once.
 */

import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { normaliseEmail } from "../src/lib/auth/authenticate";

async function main() {
  const [rawEmail, name, rawRole = "STAFF"] = process.argv.slice(2);

  if (!rawEmail || !name) {
    console.error(
      'Usage: pnpm admin:create "<email>" "<name>" [OWNER|STAFF]\n' +
        "Set ADMIN_PASSWORD to choose the password, or leave it unset to generate one.",
    );
    process.exit(1);
  }

  if (rawRole !== "OWNER" && rawRole !== "STAFF") {
    console.error(`Role must be OWNER or STAFF, got "${rawRole}".`);
    process.exit(1);
  }

  const email = normaliseEmail(rawEmail);
  // 18 bytes of base64url is ~24 characters, well inside bcrypt's 72-byte limit.
  const generated = process.env.ADMIN_PASSWORD
    ? null
    : randomBytes(18).toString("base64url");
  const password = process.env.ADMIN_PASSWORD ?? generated!;

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    const passwordHash = await hashPassword(password);

    const admin = await db.adminUser.upsert({
      where: { email },
      create: { email, name, role: rawRole, passwordHash },
      update: { name, role: rawRole, passwordHash },
    });

    console.log(`\n  ${admin.email}  (${admin.role})`);
    if (generated) {
      console.log(`  password: ${generated}`);
      console.log("  Shown once. Store it in a password manager now.\n");
    } else {
      console.log("  password: set from ADMIN_PASSWORD\n");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
