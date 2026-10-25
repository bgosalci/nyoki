import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AskLink, QuestionForm, type QuestionState } from "@/components/shop/question-form";
import { HONEYPOT } from "@/lib/questions/validate";

const sent = async (): Promise<QuestionState> => ({ errors: {}, sent: { name: "Ada" } });

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "Ada");
  await user.type(screen.getByLabelText("Your email"), "ada@example.com");
  await user.type(screen.getByLabelText("Your question"), "Do you have it in 5-6 years?");
}

describe("QuestionForm", () => {
  it("asks for a name, an email to reply to, and the question", () => {
    render(<QuestionForm action={sent} />);

    expect(screen.getByLabelText("Your name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Your email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Your question").tagName).toBe("TEXTAREA");
    expect(screen.getByRole("button", { name: "Send question" })).toBeInTheDocument();
  });

  it("fills in who a signed-in shopper is", () => {
    render(<QuestionForm action={sent} shopper={{ name: "Ada", email: "ada@example.com" }} />);

    expect(screen.getByLabelText("Your name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Your email")).toHaveValue("ada@example.com");
  });

  it("sends the piece it is about with the question", () => {
    render(<QuestionForm action={sent} productId="p1" />);

    expect(document.querySelector('input[name="productId"]')).toHaveValue("p1");
  });

  it("hides the box that only a bot fills in from everyone else, keyboard and screen reader included", () => {
    render(<QuestionForm action={sent} />);

    const trap = document.querySelector<HTMLInputElement>(`input[name="${HONEYPOT}"]`)!;
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it("thanks the shopper by name once it is sent, in place of the form", async () => {
    const action = jest.fn(async (_state: QuestionState, _data: FormData) => sent());
    render(<QuestionForm action={action} />);
    const user = userEvent.setup();

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Thank you, Ada. We will reply by email as soon as we can.");
    expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
    expect(action.mock.calls[0][1].get("message")).toBe("Do you have it in 5-6 years?");
  });

  it("shows what is wrong beside its box, and keeps what was typed", async () => {
    render(<QuestionForm action={async () => ({ errors: { email: "That does not look like an email address." } })} />);
    const user = userEvent.setup();

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByText("That does not look like an email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Your email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Your question")).toHaveValue("Do you have it in 5-6 years?");
  });

  it("says so when it has to ask the shopper to wait", async () => {
    render(<QuestionForm action={async () => ({ errors: {}, notice: "Please wait a little before sending another." })} />);
    const user = userEvent.setup();

    await fillIn(user);
    await user.click(screen.getByRole("button", { name: "Send question" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait a little before sending another.");
  });
});

describe("AskLink", () => {
  it("opens the Ask a question section it leads to", async () => {
    render(
      <>
        <details id="ask-a-question">
          <summary>Ask a question</summary>
        </details>
        <AskLink>send us a question</AskLink>
      </>,
    );

    await userEvent.setup().click(screen.getByRole("link", { name: "send us a question" }));

    expect(document.getElementById("ask-a-question")).toHaveAttribute("open");
  });
});
