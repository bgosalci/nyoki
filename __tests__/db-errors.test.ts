import { isUniqueViolationOn } from "@/lib/db-errors";

/** The shape Prisma 7's driver adapter actually produces: no meta.target, the constraint only in the message. */
function adapterP2002(constraint: string, modelName: string) {
  const error = new Error(`Invalid \`db.adminUser.create()\` invocation\n\nUnique constraint failed on the constraint: \`${constraint}\``);
  return Object.assign(error, {
    code: "P2002",
    meta: { driverAdapterError: new Error("UniqueConstraintViolation"), modelName },
    clientVersion: "7.10.0",
  });
}

/** The classic engine shape, still worth accepting. */
const classicP2002 = (target: string[]) => ({ code: "P2002", meta: { target } });

describe("isUniqueViolationOn", () => {
  it("reads the column out of the constraint name when there is no meta.target", () => {
    expect(isUniqueViolationOn(adapterP2002("admin_users_email_key", "AdminUser"), { table: "admin_users", column: "email" })).toBe(true);
    expect(isUniqueViolationOn(adapterP2002("products_sku_key", "Product"), { table: "products", column: "sku" })).toBe(true);
  });

  it("does not match a different column's constraint", () => {
    expect(isUniqueViolationOn(adapterP2002("products_slug_key", "Product"), { table: "products", column: "sku" })).toBe(false);
  });

  it("does not match a column that merely appears inside another word", () => {
    // "customers_stripe_customer_id_key" must not count as a violation on customers.id.
    expect(isUniqueViolationOn(adapterP2002("customers_stripe_customer_id_key", "Customer"), { table: "customers", column: "id" })).toBe(false);
  });

  it("still recognises the classic meta.target shape", () => {
    expect(isUniqueViolationOn(classicP2002(["email"]), { table: "admin_users", column: "email" })).toBe(true);
    expect(isUniqueViolationOn(classicP2002(["sku"]), { table: "admin_users", column: "email" })).toBe(false);
  });

  it("ignores other Prisma errors and plain errors", () => {
    expect(isUniqueViolationOn({ code: "P2025" }, { table: "admin_users", column: "email" })).toBe(false);
    expect(isUniqueViolationOn(new Error("boom"), { table: "admin_users", column: "email" })).toBe(false);
    expect(isUniqueViolationOn(null, { table: "admin_users", column: "email" })).toBe(false);
  });
});
