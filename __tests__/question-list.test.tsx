import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuestionList, type QuestionRow } from "@/components/admin/question-list";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const coat: QuestionRow = {
  id: "q1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Do you have it in 5-6 years?\nThank you",
  productId: "p1",
  productName: "Girl’s Coat",
  createdAt: new Date("2026-10-20T10:00:00Z"),
  answeredAt: null,
};
const general: QuestionRow = { ...coat, id: "q2", name: "Grace", email: "grace@example.com", productId: null, productName: null };
const gone: QuestionRow = { ...coat, id: "q3", name: "Mary", productId: null, productName: "Old Hat" };

function setup(questions: QuestionRow[] = [coat]) {
  const setAnswered = jest.fn(async (_data: FormData) => {});
  const remove = jest.fn(async (_data: FormData) => {});
  render(<QuestionList questions={questions} setAnswered={setAnswered} remove={remove} />);
  return { setAnswered, remove, user: userEvent.setup() };
}

const card = (name: string) => screen.getByRole("article", { name: new RegExp(name) });

describe("QuestionList", () => {
  it("shows who asked, when, about what, and what they asked, line breaks and all", () => {
    setup();

    const question = card("Ada Lovelace");
    expect(question).toHaveTextContent("ada@example.com");
    expect(question).toHaveTextContent("Sent 20 Oct 2026, 11:00");
    expect(within(question).getByText(/Do you have it in 5-6 years\?/)).toHaveClass("whitespace-pre-line");
  });

  it("marks the times up for a machine as well as a reader", () => {
    setup([{ ...coat, answeredAt: new Date("2026-10-21T09:00:00Z") }]);

    const times = card("Ada Lovelace").querySelectorAll("time");
    expect([...times].map((time) => time.getAttribute("datetime"))).toEqual(["2026-10-20T10:00:00.000Z", "2026-10-21T09:00:00.000Z"]);
  });

  it("links the piece to its page in the admin, and says where a question came from otherwise", () => {
    setup([coat, general, gone]);

    expect(within(card("Ada Lovelace")).getByRole("link", { name: "Girl’s Coat" })).toHaveAttribute("href", "/admin/products/p1");
    expect(card("Grace")).toHaveTextContent("From the Contact page");
    expect(card("Mary")).toHaveTextContent("Old Hat (no longer in the shop)");
    expect(within(card("Mary")).queryByRole("link", { name: /Old Hat/ })).not.toBeInTheDocument();
  });

  it("offers a reply by email, already addressed and titled", () => {
    setup();

    const reply = within(card("Ada Lovelace")).getByRole("link", { name: "Reply by email" });
    expect(reply.getAttribute("href")).toMatch(/^mailto:ada@example\.com\?subject=Your%20question%20about%20/);
  });

  it("marks a question answered", async () => {
    const { setAnswered, user } = setup();

    await user.click(within(card("Ada Lovelace")).getByRole("button", { name: "Mark answered" }));

    const posted = setAnswered.mock.calls[0][0];
    expect(posted.get("id")).toBe("q1");
    expect(posted.get("answered")).toBe("true");
  });

  it("says when an answered one was answered, and can put it back to waiting", async () => {
    const { setAnswered, user } = setup([{ ...coat, answeredAt: new Date("2026-10-21T09:00:00Z") }]);

    expect(card("Ada Lovelace")).toHaveTextContent("Answered 21 Oct 2026, 10:00");
    await user.click(within(card("Ada Lovelace")).getByRole("button", { name: "Mark as waiting" }));

    expect(setAnswered.mock.calls[0][0].get("answered")).toBe("false");
  });

  it("asks before deleting, and deletes only once that is confirmed", async () => {
    const { remove, user } = setup();

    await user.click(within(card("Ada Lovelace")).getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete this question/i });
    expect(remove).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Delete question" }));
    expect(remove.mock.calls[0][0].get("id")).toBe("q1");
  });
});
