import { roleChangeBlockedBecause } from "@/lib/admin/removal";

const owner = { id: "u_owner", role: "OWNER" as const };
const secondOwner = { id: "u_owner2", role: "OWNER" as const };
const staff = { id: "u_staff", role: "STAFF" as const };

describe("roleChangeBlockedBecause", () => {
  it("lets an owner promote staff", () => {
    expect(roleChangeBlockedBecause([owner, staff], { actorId: owner.id, targetId: staff.id, newRole: "OWNER" })).toBeNull();
  });

  it("lets an owner demote another owner while one remains", () => {
    expect(roleChangeBlockedBecause([owner, secondOwner], { actorId: owner.id, targetId: secondOwner.id, newRole: "STAFF" })).toBeNull();
  });

  it("stops the last owner being demoted, including by themselves", () => {
    expect(roleChangeBlockedBecause([owner, staff], { actorId: owner.id, targetId: owner.id, newRole: "STAFF" })).toMatch(/last owner/i);
  });

  it("treats keeping the same role as fine", () => {
    expect(roleChangeBlockedBecause([owner, staff], { actorId: owner.id, targetId: owner.id, newRole: "OWNER" })).toBeNull();
  });

  it("stops staff changing anyone's role", () => {
    expect(roleChangeBlockedBecause([owner, staff], { actorId: staff.id, targetId: staff.id, newRole: "OWNER" })).toMatch(/owner/i);
  });

  it("reports an account that is already gone", () => {
    expect(roleChangeBlockedBecause([owner], { actorId: owner.id, targetId: "u_missing", newRole: "STAFF" })).toMatch(/no longer/i);
  });
});
