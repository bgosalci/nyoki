/**
 * @jest-environment node
 */
import { backupConfig, backupSummary, dumpName, missingFromDump } from "@/lib/backup/backup";

describe("backupConfig", () => {
  const env = { DATABASE_URL: "postgresql://burim@localhost:5432/nyoki?schema=public", BACKUP_DIR: "/Users/burim/Nyoki backups", HOME: "/Users/burim" };

  it("reads the database and the folder backups go in", () => {
    expect(backupConfig(env)).toEqual({
      config: { database: "nyoki", pgUrl: "postgresql://burim@localhost:5432/nyoki", backupDir: "/Users/burim/Nyoki backups" },
    });
  });

  it("drops Prisma's schema setting, which pg_dump refuses, and keeps the rest", () => {
    const result = backupConfig({ ...env, DATABASE_URL: "postgresql://burim@db.example.com/nyoki?sslmode=require&schema=public" });
    expect(result).toMatchObject({ config: { pgUrl: "postgresql://burim@db.example.com/nyoki?sslmode=require" } });
  });

  it("starts a folder written from the home folder there, as a shell would", () => {
    expect(backupConfig({ ...env, BACKUP_DIR: "~/Library/Mobile Documents/com~apple~CloudDocs/Nyoki backups" })).toMatchObject({
      config: { backupDir: "/Users/burim/Library/Mobile Documents/com~apple~CloudDocs/Nyoki backups" },
    });
  });

  it("says what to set when the folder is missing, or not a whole path", () => {
    expect(backupConfig({ ...env, BACKUP_DIR: undefined })).toEqual({ problem: expect.stringMatching(/set BACKUP_DIR in \.env/i) });
    expect(backupConfig({ ...env, BACKUP_DIR: "  " })).toEqual({ problem: expect.stringMatching(/set BACKUP_DIR in \.env/i) });
    expect(backupConfig({ ...env, BACKUP_DIR: "backups" })).toEqual({ problem: expect.stringMatching(/whole path/i) });
  });

  it("says so when there is no database to back up", () => {
    expect(backupConfig({ ...env, DATABASE_URL: undefined })).toEqual({ problem: expect.stringMatching(/DATABASE_URL/) });
    expect(backupConfig({ ...env, DATABASE_URL: "postgresql://burim@localhost:5432/" })).toEqual({ problem: expect.stringMatching(/no database name/i) });
  });
});

describe("dumpName", () => {
  it("names a backup after its database and the time in London, so they sort in the order they were made", () => {
    expect(dumpName("nyoki", new Date("2026-10-31T15:30:12Z"))).toBe("nyoki-2026-10-31-153012.dump");
    // British Summer Time: an hour ahead of UTC.
    expect(dumpName("nyoki", new Date("2026-07-01T12:05:09Z"))).toBe("nyoki-2026-07-01-130509.dump");
  });
});

describe("missingFromDump", () => {
  // As pg_restore --list writes a custom-format dump's contents.
  const listing = [
    ";",
    "; Archive created at 2026-10-31 15:30:12 GMT",
    ";     dbname: nyoki",
    "246; 1259 16420 TABLE public products burim",
    "3712; 0 16420 TABLE DATA public products burim",
    "3713; 0 16433 TABLE DATA public product_images burim",
    "3714; 0 16401 TABLE DATA public categories burim",
    "3715; 0 16388 TABLE DATA public _prisma_migrations burim",
  ].join("\n");

  it("finds every table's rows in the dump", () => {
    expect(missingFromDump(listing, ["products", "product_images", "categories", "_prisma_migrations"])).toEqual([]);
  });

  it("names each table whose rows are not there - a table's definition alone is not its rows", () => {
    const withoutRows = listing.replace("3712; 0 16420 TABLE DATA public products burim", "");
    expect(missingFromDump(withoutRows, ["products", "orders", "categories"])).toEqual(["products", "orders"]);
  });

  it("does not take one table's name inside another's for it", () => {
    expect(missingFromDump("3713; 0 16433 TABLE DATA public product_images burim", ["products"])).toEqual(["products"]);
  });
});

describe("backupSummary", () => {
  it("says what was saved, and how many photos are new", () => {
    expect(backupSummary({ dump: "nyoki-2026-10-31-153012.dump", bytes: 148_732, tables: 52, photos: 481, newPhotos: 3 })).toBe(
      "Saved the database (52 tables, 145 KB) as nyoki-2026-10-31-153012.dump, and 481 photos, 3 of them new.",
    );
  });

  it("says when no photo is new, and counts one as one", () => {
    expect(backupSummary({ dump: "nyoki.dump", bytes: 2_500_000, tables: 1, photos: 1, newPhotos: 0 })).toBe(
      "Saved the database (1 table, 2.4 MB) as nyoki.dump, and 1 photo, none of them new.",
    );
  });

  it("says when there are no photos to save", () => {
    expect(backupSummary({ dump: "nyoki.dump", bytes: 900, tables: 52, photos: null, newPhotos: 0 })).toBe(
      "Saved the database (52 tables, 1 KB) as nyoki.dump. There is no photo folder here to save.",
    );
  });
});
