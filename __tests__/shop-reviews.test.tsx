import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RatingLink, ReviewList, ReviewsSummary, type ShopReview } from "@/components/shop/reviews";
import { ReviewForm, type ReviewState } from "@/components/shop/review-form";
import { YourReview } from "@/components/shop/your-review";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const review = (over: Partial<ShopReview> = {}): ShopReview => ({
  id: "r1",
  name: "Ada L.",
  rating: 5,
  body: "Beautiful, and beautifully wrapped.\nIt arrived the next day.",
  verified: false,
  submittedAt: new Date("2026-10-30T10:00:00Z"),
  reply: null,
  ...over,
});

describe("ReviewList", () => {
  it("shows each review's stars, who wrote it, when, and what they said", () => {
    render(<ReviewList reviews={[review()]} />);

    const item = screen.getByRole("article");
    expect(within(item).getByRole("img", { name: "Rated 5 out of 5" })).toBeInTheDocument();
    expect(item).toHaveTextContent("Ada L.");
    expect(within(item).getByText("30 Oct 2026")).toHaveAttribute("datetime", "2026-10-30T10:00:00.000Z");
    expect(item).toHaveTextContent("Beautiful, and beautifully wrapped.");
  });

  it("says a review comes from someone who bought the piece from the shop, and only then", () => {
    render(<ReviewList reviews={[review({ id: "r1", verified: true }), review({ id: "r2", name: "Bo P.", verified: false })]} />);

    const [bought, other] = screen.getAllByRole("article");
    expect(bought).toHaveTextContent("Verified purchase");
    expect(other).not.toHaveTextContent("Verified purchase");
  });

  it("shows the shop's reply beneath a review, marked as the shop's", () => {
    render(<ReviewList reviews={[review({ reply: "Thank you, Ada!" })]} />);

    const reply = screen.getByRole("region", { name: "Reply from Nyoki Handmade" });
    expect(reply).toHaveTextContent("Thank you, Ada!");
  });
});

describe("ReviewsSummary", () => {
  it("gives the average of every review on the shop, in stars and in figures, and how many there are", () => {
    render(<ReviewsSummary count={3} tenths={47} />);

    expect(screen.getByRole("img", { name: "Rated 4.7 out of 5" })).toBeInTheDocument();
    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("3 reviews")).toBeInTheDocument();
  });

  it("says so when there are none yet", () => {
    render(<ReviewsSummary count={0} tenths={null} />);

    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("RatingLink", () => {
  it("leads from beneath the name to the reviews, saying the average and how many", () => {
    render(<RatingLink count={12} tenths={46} />);

    const link = screen.getByRole("link", { name: "Rated 4.6 out of 5, 12 reviews" });
    expect(link).toHaveAttribute("href", "#reviews");
  });

  it("is not there with no reviews", () => {
    const { container } = render(<RatingLink count={0} tenths={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

const sent = async (): Promise<ReviewState> => ({ errors: {}, sent: true });

describe("ReviewForm", () => {
  it("asks for one to five stars, a few words, and the name to show", () => {
    render(<ReviewForm action={sent} productId="p1" defaults={{ rating: null, body: "", name: "Ada L." }} />);

    const stars = screen.getByRole("group", { name: "Your rating" });
    expect(within(stars).getAllByRole("radio")).toHaveLength(5);
    for (const name of ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"]) {
      expect(within(stars).getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Write your review").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Name shown with your review")).toHaveValue("Ada L.");
    expect(document.querySelector('input[name="productId"]')).toHaveValue("p1");
    expect(screen.getByRole("button", { name: "Send review" })).toBeInTheDocument();
  });

  it("sends what was chosen and written, and says it will be read before it goes on the shop", async () => {
    const action = jest.fn(async (_state: ReviewState, _data: FormData) => sent());
    render(<ReviewForm action={action} productId="p1" defaults={{ rating: null, body: "", name: "Ada L." }} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: "4 stars" }));
    await user.type(screen.getByLabelText("Write your review"), "Lovely.");
    await user.click(screen.getByRole("button", { name: "Send review" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Thank you. We read every review before it goes on the shop");
    const sentData = action.mock.calls[0][1];
    expect(sentData.get("rating")).toBe("4");
    expect(sentData.get("body")).toBe("Lovely.");
    expect(sentData.get("name")).toBe("Ada L.");
  });

  it("marks the stars when none were chosen, and keeps what was written", async () => {
    render(
      <ReviewForm
        action={async () => ({ errors: { rating: "Please choose how many stars to give it." } })}
        productId="p1"
        defaults={{ rating: null, body: "", name: "Ada L." }}
      />,
    );
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Write your review"), "Lovely.");
    await user.click(screen.getByRole("button", { name: "Send review" }));

    expect(await screen.findByText("Please choose how many stars to give it.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Your rating" })).toHaveAttribute("data-invalid");
    expect(screen.getByLabelText("Write your review")).toHaveValue("Lovely.");
  });

  it("starts from the review as it was when it is being changed, and says a change is read again", () => {
    render(<ReviewForm action={sent} productId="p1" defaults={{ rating: 3, body: "Nice.", name: "Ada" }} editing />);

    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked();
    expect(screen.getByLabelText("Write your review")).toHaveValue("Nice.");
    expect(screen.getByRole("button", { name: "Send changes" })).toBeInTheDocument();
    expect(screen.getByText(/read again before it goes back on the shop/)).toBeInTheDocument();
  });

  it("says so when it has to ask the shopper to wait", async () => {
    render(
      <ReviewForm
        action={async () => ({ errors: {}, notice: "Please wait a little before writing another." })}
        productId="p1"
        defaults={{ rating: 5, body: "Lovely.", name: "Ada" }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Send review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait a little before writing another.");
  });
});

describe("YourReview", () => {
  const own = {
    id: "r1",
    rating: 4,
    body: "Lovely card.",
    name: "Ada L.",
    status: "PENDING" as const,
    hiddenReason: null,
    verified: true,
    reply: null,
  };

  it("shows the shopper their own review and where it stands", () => {
    render(<YourReview review={own} productId="p1" write={sent} remove={jest.fn()} />);

    const mine = screen.getByRole("region", { name: "Your review" });
    expect(mine).toHaveTextContent("Waiting to be read. We read every review before it goes on the shop.");
    expect(mine).toHaveTextContent("Lovely card.");
    expect(within(mine).getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
    expect(mine).toHaveTextContent("Verified purchase");
  });

  it("says why a review was not published", () => {
    render(<YourReview review={{ ...own, status: "HIDDEN", hiddenReason: "ADVERTISING" }} productId="p1" write={sent} remove={jest.fn()} />);

    expect(screen.getByRole("region", { name: "Your review" })).toHaveTextContent(
      "We have not published your review, because it advertises something or links elsewhere.",
    );
  });

  it("opens the form, filled in, to change it", async () => {
    render(<YourReview review={own} productId="p1" write={sent} remove={jest.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Change your review" }));

    expect(screen.getByRole("radio", { name: "4 stars" })).toBeChecked();
    expect(screen.getByLabelText("Write your review")).toHaveValue("Lovely card.");
  });

  it("asks before deleting it", async () => {
    const remove = jest.fn(async (_data: FormData) => {});
    render(<YourReview review={own} productId="p1" write={sent} remove={remove} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete your review" }));
    expect(remove).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "Delete your review?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete review" }));

    expect(remove).toHaveBeenCalled();
    expect(remove.mock.calls[0][0].get("id")).toBe("r1");
  });
});
