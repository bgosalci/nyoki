import { render, screen } from "@testing-library/react";

import { DetailsForm } from "@/components/shop/details-form";
import { PasswordForm } from "@/components/shop/password-form";

const shopper = { id: "c1", email: "ada@example.com", name: "Ada Lovelace" };

describe("DetailsForm", () => {
  const action = jest.fn(async () => ({ errors: {} }));

  it("opens with what the shop already knows", () => {
    render(<DetailsForm shopper={shopper} action={action} />);

    expect(screen.getByLabelText(/name/i)).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText(/email/i)).toHaveValue("ada@example.com");
  });

  it("puts a problem beside the box it belongs to", () => {
    render(
      <DetailsForm shopper={shopper} action={action} initialState={{ errors: { email: "Already in use." } }} />,
    );

    expect(screen.getByText("Already in use.")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("says so when it has saved, rather than leaving it to be guessed", () => {
    render(<DetailsForm shopper={shopper} action={action} initialState={{ errors: {}, saved: true }} />);

    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });
});

describe("PasswordForm", () => {
  const action = jest.fn(async () => ({ errors: {} }));

  it("asks for the current password as well as the new one, twice", () => {
    render(<PasswordForm action={action} />);

    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
  });

  it("never carries a password back into the form", () => {
    render(
      <PasswordForm action={action} initialState={{ errors: { currentPassword: "That is not your password." } }} />,
    );

    for (const label of [/current password/i, /^new password/i, /repeat/i]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
    expect(screen.getByText("That is not your password.")).toBeInTheDocument();
  });

  it("confirms a change that went through", () => {
    render(<PasswordForm action={action} initialState={{ errors: {}, changed: true }} />);

    expect(screen.getByRole("status")).toHaveTextContent(/changed/i);
  });
});
