/** Postgres unique-violation, surfaced by Prisma as P2002. */
const UNIQUE_VIOLATION = "P2002";

export interface UniqueColumn {
  /** The mapped table name, e.g. "admin_users". */
  table: string;
  /** The mapped column name, e.g. "email". */
  column: string;
}

/**
 * Whether `error` is a unique-constraint failure on `table.column`, so an
 * action can turn it into a field error instead of a crash.
 *
 * Prisma's classic engine reports the column in `meta.target`. The driver
 * adapter used here (Prisma 7 + pg) sends no target at all - only the
 * constraint's name inside the message, e.g. "admin_users_email_key". Both
 * shapes are accepted. The name is matched whole, as `<table>_<column>_key`,
 * because a suffix match cannot tell customers.id from
 * customers.stripe_customer_id.
 */
export function isUniqueViolationOn(error: unknown, { table, column }: UniqueColumn): boolean {
  if (typeof error !== "object" || error === null) return false;

  const { code, meta, message } = error as { code?: unknown; meta?: { target?: unknown }; message?: unknown };
  if (code !== UNIQUE_VIOLATION) return false;

  if (Array.isArray(meta?.target)) return meta.target.includes(column);

  if (typeof message !== "string") return false;
  const constraint = /constraint: `([^`]+)`/.exec(message)?.[1];
  return constraint === `${table}_${column}_key`;
}
