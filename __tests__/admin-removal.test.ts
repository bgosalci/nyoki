import { removalBlockedBecause } from "@/lib/admin/removal";

const owner = { id: "u_owner", role: "OWNER" as const };
const secondOwner = { id: "u_owner2", role: "OWNER" as const };
const staff = { id: "u_staff", role: "STAFF" as const };

describe("removalBlockedBecause", () => {
  it("lets an owner remove a staff account", () => {
    expect(removalBlockedBecause([owner, staff], { actorId: owner.id, targetId: staff.id })).toBeNull();
  });

  it("lets an owner remove another owner while one remains", () => {
    expect(removalBlockedBecause([owner, secondOwner, staff], { actorId: owner.id, targetId: secondOwner.id })).toBeNull();
  });

  it("stops anyone removing their own account", () => {
    // Locking yourself out mid-session is never what was meant.
    expect(removalBlockedBecause([owner, secondOwner], { actorId: owner.id, targetId: owner.id })).toMatch(/your own/i);
  });

  it("stops the last owner being removed", () => {
    expect(removalBlockedBecause([owner, staff], { actorId: owner.id, targetId: owner.id })).toMatch(/your own|last owner/i);
    expect(removalBlockedBecause([owner, secondOwner, staff], { actorId: secondOwner.id, targetId: owner.id })).toBeNull();
    // Down to one owner: nobody can remove it, even another kind of account.
    expect(removalBlockedBecause([owner, staff], { actorId: staff.id, targetId: owner.id })).toMatch(/last owner|owner/i);
  });

  it("stops staff removing anyone", () => {
    expect(removalBlockedBecause([owner, staff, { id: "u_staff2", role: "STAFF" }], { actorId: staff.id, targetId: "u_staff2" })).toMatch(/owner/i);
  });

  it("reports an account that is already gone", () => {
    expect(removalBlockedBecause([owner], { actorId: owner.id, targetId: "u_missing" })).toMatch(/no longer/i);
  });
});
