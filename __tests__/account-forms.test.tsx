import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterForm } from "@/components/shop/register-form";
import { SignInForm } from "@/components/shop/sign-in-form";

describe("SignInForm", () => {
  const action = jest.fn(async () => ({ error: null }));

  it("asks for an email and a password, and points elsewhere for a new account", () => {
    render(<SignInForm action={action} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/account/register",
    );
  });

  it("shows the one message the server gives back", () => {
    render(<SignInForm action={action} initialState={{ error: "Those details are not right." }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Those details are not right.");
  });

  it("keeps the email so it need not be typed again, but never the password", async () => {
    render(
      <SignInForm action={action} initialState={{ error: "No.", email: "ada@example.com" }} />,
    );

    expect(screen.getByLabelText(/email/i)).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
  });

  it("does not carry the admin's dark-mode colours onto the light shop", () => {
    render(<SignInForm action={action} />);

    expect(screen.getByLabelText(/email/i).className).not.toMatch(/\bdark:/);
  });
});

describe("RegisterForm", () => {
  const action = jest.fn(async () => ({ errors: {} }));

  it("asks for a name as well, since that is how the shop will address them", () => {
    render(<RegisterForm action={action} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("puts each problem beside the box it belongs to", () => {
    render(
      <RegisterForm
        action={action}
        initialState={{ errors: { email: "Enter an email address we can reach you at." } }}
      />,
    );

    expect(screen.getByText(/enter an email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps what was typed, apart from the password", () => {
    render(
      <RegisterForm
        action={action}
        initialState={{ errors: { password: "Too short." }, values: { name: "Ada", email: "ada@example.com" } }}
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Ada");
    expect(screen.getByLabelText(/email/i)).toHaveValue("ada@example.com");
    expect(screen.getByLabelText(/password/i)).toHaveValue("");
  });

  it("sends people who already have an account to sign in", () => {
    render(<RegisterForm action={action} />);

    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/account/sign-in");
  });

  it("submits what was typed", async () => {
    const user = userEvent.setup();
    const submitted = jest.fn(async () => ({ errors: {} }));
    render(<RegisterForm action={submitted} />);

    await user.type(screen.getByLabelText(/name/i), "Ada");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct horse battery");
    await user.click(screen.getByRole("button", { name: /create/i }));

    expect(submitted).toHaveBeenCalled();
    const [, data] = submitted.mock.calls[0] as unknown as [unknown, FormData];
    expect(data.get("email")).toBe("ada@example.com");
  });
});
