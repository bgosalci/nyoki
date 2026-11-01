import { isValidElement, type ReactNode } from "react";

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: async () => ({ email: "njomza@nyoki.co.uk", role: "OWNER" }) }));
jest.mock("../src/lib/db", () => ({ db: { question: { count: async () => 0 }, review: { count: async () => 0 } } }));
jest.mock("../src/app/admin/(protected)/actions", () => ({ signOut: async () => {} }));

import AdminLayout from "@/app/admin/(protected)/layout";

/** Every element the layout itself writes, without drawing the components inside it. */
function elements(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node as never, ...elements(node.props.children)];
}

describe("the admin's layout", () => {
  it("renders no script: React never runs one it renders on a client-side arrival, and warns that it will not", async () => {
    const tree = await AdminLayout({ children: <p>The page</p> });

    expect(elements(tree).filter((element) => element.type === "script")).toEqual([]);
  });
});
