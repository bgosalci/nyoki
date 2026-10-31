/**
 * The rules of `pnpm backup` (scripts/backup.ts): where it saves, what each
 * copy is called, and whether a dump holds the whole database. Pure; the
 * script does the copying.
 */

export interface BackupConfig {
  database: string;
  /** DATABASE_URL as pg_dump takes it. */
  pgUrl: string;
  backupDir: string;
}

export function backupConfig(env: Record<string, string | undefined>): { config: BackupConfig } | { problem: string } {
  const url = env.DATABASE_URL?.trim();
  if (!url) return { problem: "DATABASE_URL is not set, so there is no database to back up." };

  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!database) return { problem: "DATABASE_URL has no database name at its end, so there is nothing to back up." };
  // Prisma's own setting: libpq refuses a URL that carries it.
  parsed.searchParams.delete("schema");

  const written = env.BACKUP_DIR?.trim();
  if (!written) {
    return {
      problem:
        "Set BACKUP_DIR in .env to the folder backups go in - not on the drive the shop is on, " +
        'which a backup there would not survive. For iCloud Drive: BACKUP_DIR="~/Library/Mobile Documents/com~apple~CloudDocs/Nyoki backups"',
    };
  }
  // An .env file is not read by a shell, so nothing else would expand ~.
  const backupDir = written.startsWith("~/") && env.HOME ? `${env.HOME}${written.slice(1)}` : written;
  if (!backupDir.startsWith("/")) return { problem: `BACKUP_DIR has to be a whole path, starting with / or ~/, not "${written}".` };

  return { config: { database, pgUrl: parsed.toString(), backupDir } };
}

/** "nyoki-2026-10-31-153012.dump": the database and the time in London, so the copies sort in the order they were made. */
export function dumpName(database: string, at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${database}-${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}${parts.second}.dump`;
}

/**
 * The tables whose rows a dump does not hold, from what `pg_restore --list`
 * says it holds. A table's rows are its TABLE DATA entry; its definition
 * alone restores an empty table.
 */
export function missingFromDump(listing: string, tables: readonly string[]): string[] {
  const held = new Set<string>();
  for (const line of listing.split("\n")) {
    const match = /\bTABLE DATA \S+ (\S+) /.exec(line);
    if (match) held.add(match[1]);
  }
  return tables.filter((table) => !held.has(table));
}

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function backupSummary({
  dump,
  bytes,
  tables,
  photos,
  newPhotos,
}: {
  dump: string;
  bytes: number;
  tables: number;
  /** Null when there is no photo folder: photos kept in Vercel Blob are not on this machine. */
  photos: number | null;
  newPhotos: number;
}): string {
  const database = `Saved the database (${plural(tables, "table", "tables")}, ${size(bytes)}) as ${dump}`;
  if (photos === null) return `${database}. There is no photo folder here to save.`;
  return `${database}, and ${plural(photos, "photo", "photos")}, ${newPhotos === 0 ? "none" : newPhotos} of them new.`;
}
