import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FavouriteButton } from "@/components/shop/favourite-button";

describe("FavouriteButton", () => {
  const toggle = jest.fn(async () => {});

  beforeEach(() => jest.clearAllMocks());

  it("invites a signed-out visitor to sign in rather than pretending to save", async () => {
    render(<FavouriteButton productId="p1" name="Bud Vase" saved={false} signedIn={false} toggle={toggle} />);

    const control = screen.getByRole("link", { name: /sign in to save/i });
    expect(control).toHaveAttribute("href", "/account/sign-in");
    expect(toggle).not.toHaveBeenCalled();
  });

  it("names the piece it would save, since a page is full of these", () => {
    render(<FavouriteButton productId="p1" name="Bud Vase" saved={false} signedIn toggle={toggle} />);

    expect(screen.getByRole("button", { name: /save bud vase/i })).toBeInTheDocument();
  });

  it("says it is already saved, and offers to undo that", () => {
    render(<FavouriteButton productId="p1" name="Bud Vase" saved signedIn toggle={toggle} />);

    const control = screen.getByRole("button", { name: /remove bud vase/i });
    expect(control).toHaveAttribute("aria-pressed", "true");
  });

  it("saves the piece it was given", async () => {
    const user = userEvent.setup();
    render(<FavouriteButton productId="p1" name="Bud Vase" saved={false} signedIn toggle={toggle} />);

    await user.click(screen.getByRole("button", { name: /save bud vase/i }));

    expect(toggle).toHaveBeenCalledWith("p1");
  });

  it("fills the heart in once saved and leaves it hollow before", () => {
    const { rerender, container } = render(
      <FavouriteButton productId="p1" name="Bud Vase" saved={false} signedIn toggle={toggle} />,
    );
    expect(container.querySelector("svg")).toHaveAttribute("fill", "none");

    rerender(<FavouriteButton productId="p1" name="Bud Vase" saved signedIn toggle={toggle} />);
    expect(container.querySelector("svg")).not.toHaveAttribute("fill", "none");
  });
});
