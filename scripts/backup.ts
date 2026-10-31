/**
 * Back up the database and the photos.
 *
 *   pnpm backup
 *
 * Saves a dump of the database named in DATABASE_URL, and copies the photo
 * folder (public/uploads), into BACKUP_DIR - set in .env, and on another
 * drive: Time Machine leaves out the drive the shop is on.
 *
 * Every run keeps its own dump, named for when it was made, so an older one
 * can still be gone back to. Photos are only ever added to the copy, never
 * taken out of it, so a photo deleted since is still there for the older
 * dumps that need it. A dump is written under a temporary name and only
 * named as a backup once it is known to hold every table's rows.
 *
 * Restoring is in CLAUDE.md, under Backups.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, realpathSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

import { backupConfig, backupSummary, dumpName, missingFromDump } from "../src/lib/backup/backup";

/**
 * A command's output; what it says when it fails goes straight to the
 * terminal. Its arguments are not repeated, since one is the database's
 * address, password and all.
 */
function run(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    throw new Error(`${command} stopped with an error, given above.`);
  }
}

function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).length;
}

const result = backupConfig(process.env);
if ("problem" in result) {
  console.error(result.problem);
  process.exit(1);
}
const { database, pgUrl, backupDir } = result.config;

const dumps = join(backupDir, "database");
const photosCopy = join(backupDir, "uploads");
mkdirSync(dumps, { recursive: true });

const name = dumpName(database, new Date());
const dump = join(dumps, name);
const partial = `${dump}.partial`;

try {
  run("pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--file=${partial}`, pgUrl]);

  const tables = run("psql", ["--no-psqlrc", "--tuples-only", "--no-align", "--command", "select tablename from pg_tables where schemaname = 'public'", pgUrl])
    .split("\n")
    .map((table) => table.trim())
    .filter(Boolean);
  const missing = missingFromDump(run("pg_restore", ["--list", partial]), tables);
  if (missing.length > 0) throw new Error(`The dump is missing the rows of ${missing.join(", ")}.`);

  renameSync(partial, dump);

  const uploads = resolve("public/uploads");
  let photos: number | null = null;
  let newPhotos = 0;
  if (existsSync(uploads)) {
    mkdirSync(photosCopy, { recursive: true });
    const before = countFiles(photosCopy);
    // The trailing slashes copy the folder's contents; the real path follows a worktree's link to it.
    run("rsync", ["--archive", `${realpathSync(uploads)}/`, `${photosCopy}/`]);
    photos = countFiles(photosCopy);
    newPhotos = photos - before;
  }

  console.log(backupSummary({ dump: name, bytes: statSync(dump).size, tables: tables.length, photos, newPhotos }));
  console.log(`In ${backupDir}`);
} catch (error) {
  if (existsSync(partial)) unlinkSync(partial);
  console.error(`Nothing was saved as a backup. ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
