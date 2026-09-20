import { render, screen } from "@testing-library/react";

import { RemoveAdminButton } from "@/components/admin/remove-admin-button";

const noop = async () => ({ error: null });

describe("RemoveAdminButton", () => {
  it("names the account it removes", () => {
    render(<RemoveAdminButton action={noop} name="Njomza" />);

    expect(screen.getByRole("button", { name: /remove njomza/i })).toBeInTheDocument();
  });

  it("shows why a removal was refused", () => {
    render(<RemoveAdminButton action={noop} name="Njomza" initialState={{ error: "The last owner cannot be removed." }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("The last owner cannot be removed.");
  });
});
