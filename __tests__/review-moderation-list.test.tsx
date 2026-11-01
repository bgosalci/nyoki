import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ReviewModerationList, type ModerationRow, type ReplyState } from "@/components/admin/review-list";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const waiting: ModerationRow = {
  id: "r1",
  rating: 2,
  body: "Smaller than I expected.\nStill sweet.",
  name: "Ada L.",
  email: "ada@example.com",
  productId: "p1",
  productName: "Robin Card",
  verifiedOrderNumber: "NYK-1042",
  status: "PENDING",
  hiddenReason: null,
  reply: null,
  submittedAt: new Date("2026-10-30T10:00:00Z"),
  moderatedAt: null,
};

function setup(reviews: ModerationRow[] = [waiting]) {
  const publish = jest.fn(async (_data: FormData) => {});
  const hide = jest.fn(async (_data: FormData) => {});
  const remove = jest.fn(async (_data: FormData) => {});
  const saveReply = jest.fn(async (_state: ReplyState, _data: FormData): Promise<ReplyState> => ({ saved: true }));
  render(<ReviewModerationList reviews={reviews} publish={publish} hide={hide} saveReply={saveReply} remove={remove} />);
  return { publish, hide, remove, saveReply, user: userEvent.setup() };
}

const card = () => screen.getByRole("article");

describe("ReviewModerationList", () => {
  it("shows the stars, the name shown, the account it came from, the piece, and the words", () => {
    setup();

    expect(within(card()).getByRole("img", { name: "Rated 2 out of 5" })).toBeInTheDocument();
    expect(card()).toHaveTextContent("Ada L.");
    expect(card()).toHaveTextContent("ada@example.com");
    expect(within(card()).getByRole("link", { name: "Robin Card" })).toHaveAttribute("href", "/admin/products/p1");
    expect(card()).toHaveTextContent("Smaller than I expected.");
    expect(card()).toHaveTextContent("Sent 30 Oct 2026, 10:00");
  });

  it("names the order that shows the shopper bought the piece", () => {
    setup();

    expect(card()).toHaveTextContent("Verified purchase");
    expect(within(card()).getByRole("link", { name: "NYK-1042" })).toHaveAttribute("href", "/admin/orders/NYK-1042");
  });

  it("says plainly when the account had not bought it from the shop", () => {
    setup([{ ...waiting, verifiedOrderNumber: null }]);

    expect(card()).toHaveTextContent("Not bought from the shop by this account");
  });

  it("publishes a review waiting to be read", async () => {
    const { publish, user } = setup();

    await user.click(within(card()).getByRole("button", { name: "Publish" }));

    expect(publish).toHaveBeenCalled();
    expect(publish.mock.calls[0][0].get("id")).toBe("r1");
  });

  it("keeps a review off the shop only for one of the reasons the policy names", async () => {
    const { hide, user } = setup();

    const reason = within(card()).getByRole("combobox", { name: "Reason" });
    expect(reason).toBeRequired();
    expect(within(reason).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choose a reason",
      "Offensive or abusive",
      "Gives personal details",
      "Advertising or spam",
      "Not a genuine review",
    ]);

    await user.selectOptions(reason, "Offensive or abusive");
    await user.click(within(card()).getByRole("button", { name: "Don't publish" }));

    expect(hide).toHaveBeenCalled();
    expect(hide.mock.calls[0][0].get("reason")).toBe("OFFENSIVE");
  });

  it("reminds whoever reads it that an unfavourable review is published like any other", () => {
    setup();

    expect(screen.getByText(/never for being unfavourable/i)).toBeInTheDocument();
  });

  it("takes a published review off the shop, for a reason", () => {
    setup([{ ...waiting, status: "PUBLISHED", moderatedAt: new Date("2026-10-31T09:30:00Z") }]);

    expect(card()).toHaveTextContent("Published 31 Oct 2026, 09:30");
    expect(within(card()).getByRole("button", { name: "Take off the shop" })).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("says why a review was kept off, and can publish it after all", () => {
    setup([{ ...waiting, status: "HIDDEN", hiddenReason: "ADVERTISING", moderatedAt: new Date("2026-10-31T09:30:00Z") }]);

    expect(card()).toHaveTextContent("Not published: Advertising or spam");
    expect(within(card()).getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(within(card()).queryByRole("combobox", { name: "Reason" })).not.toBeInTheDocument();
  });

  it("saves a reply, which goes beneath the review on the shop", async () => {
    const { saveReply, user } = setup();

    const reply = within(card()).getByLabelText("Reply, shown beneath the review on the shop");
    await user.type(reply, "Thank you, Ada.");
    await user.click(within(card()).getByRole("button", { name: "Save reply" }));

    expect(saveReply).toHaveBeenCalled();
    expect(saveReply.mock.calls[0][1].get("reply")).toBe("Thank you, Ada.");
    expect(await within(card()).findByRole("status")).toHaveTextContent("Saved.");
  });

  it("starts from the reply already given", () => {
    setup([{ ...waiting, reply: "Thank you!" }]);

    expect(within(card()).getByLabelText("Reply, shown beneath the review on the shop")).toHaveValue("Thank you!");
  });

  it("asks before deleting a review", async () => {
    const { remove, user } = setup();

    await user.click(within(card()).getByRole("button", { name: "Delete" }));
    expect(remove).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "Delete this review?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete review" }));

    expect(remove).toHaveBeenCalled();
  });
});
