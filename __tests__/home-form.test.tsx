import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeForm, type HomeFormContent, type PhotoOption } from "@/components/admin/home-form";
import { HOME_DEFAULTS } from "@/lib/home/content";
import type { LoadedTile } from "@/lib/home/tiles";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const LABELS = [
  "For Christmas",
  "For love",
  "For birthdays",
  "For Dad",
  "For anniversaries",
  "For little ones",
  "For book lovers",
  "For little dreamers",
  "For word lovers",
  "Just because",
];

const tiles: LoadedTile[] = LABELS.map((label, index) => ({
  label,
  link: { kind: "category", categoryId: index === 0 ? "c-xmas" : "c-cards" },
  photo: index === 1 ? null : { kind: "shop", imageId: `i${index}` },
  photoUrl: index === 1 ? null : `/photo-${index}.jpg`,
}));

const content: HomeFormContent = { ...HOME_DEFAULTS, tiles };

const categories = [
  { id: "c-cards", path: "Cards" },
  { id: "c-xmas", path: "Cards › Christmas Cards" },
];

const photos: PhotoOption[] = [
  { choice: "image:i0", title: "Let It Snow", details: ["Photo 2"], url: "/photo-0.jpg", searchText: "Let It Snow Christmas" },
  { choice: "image:i9", title: "Car Brooch", details: ["Photo 1"], url: "/photo-9.jpg", searchText: "Car Brooch" },
];

function setup(overrides: Partial<React.ComponentProps<typeof HomeForm>> = {}) {
  const action = jest.fn(async () => ({ errors: {} }));
  const upload = jest.fn(async () => ({ ok: true as const, photo: { id: "u1", url: "/uploads/home/u1.jpg" } }));
  const utils = render(
    <HomeForm
      content={content}
      categories={categories}
      photos={photos}
      automatic={{ "c-cards": "/first-card.jpg" }}
      action={action}
      upload={upload}
      prepare={async (file) => file}
      {...overrides}
    />,
  );
  return { action, upload, ...utils };
}

const editor = () => screen.getByRole("group", { name: /^editing/i });
const posted = (form: HTMLFormElement, name: string) => new FormData(form).getAll(name);

describe("HomeForm", () => {
  it("opens with what the page currently says", () => {
    setup();

    expect(screen.getByLabelText(/^banner/i)).toHaveValue(HOME_DEFAULTS.bannerText);
    expect(screen.getByLabelText(/band above the pieces/i)).toHaveValue(HOME_DEFAULTS.bandText);
    expect(screen.getByLabelText(/^button words/i)).toHaveValue(HOME_DEFAULTS.ctaLabel);
    expect(screen.getByRole("checkbox", { name: /badges/i })).toBeChecked();
  });

  it("draws the tiles as the shop lays them out, each one a button to edit it", () => {
    setup();

    for (const label of LABELS) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("opens the first tile for editing", () => {
    setup();

    expect(within(editor()).getByLabelText(/words on the tile/i)).toHaveValue("For Christmas");
    expect(screen.getByRole("button", { name: "For Christmas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens another tile when it is clicked", async () => {
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "For Dad" }));

    expect(within(editor()).getByLabelText(/words on the tile/i)).toHaveValue("For Dad");
  });

  it("changes the tile on the page as its words are typed", async () => {
    setup();
    const user = userEvent.setup();

    const words = within(editor()).getByLabelText(/words on the tile/i);
    await user.clear(words);
    await user.type(words, "For Mum");

    expect(screen.getByRole("button", { name: "For Mum" })).toBeInTheDocument();
  });

  it("offers the shop's pages and every category, by its place in the tree", () => {
    setup();

    const leads = within(editor()).getByRole("combobox", { name: /leads to/i });
    expect(within(leads).getByRole("option", { name: "The whole shop" })).toBeInTheDocument();
    expect(within(leads).getByRole("option", { name: "Cards › Christmas Cards" })).toBeInTheDocument();
    expect(leads).toHaveValue("category:c-xmas");
  });

  it("asks for an address only when somewhere else is chosen", async () => {
    setup();
    const user = userEvent.setup();

    expect(within(editor()).queryByLabelText(/^address/i)).not.toBeInTheDocument();
    await user.selectOptions(within(editor()).getByRole("combobox", { name: /leads to/i }), "other");

    expect(within(editor()).getByLabelText(/^address/i)).toBeInTheDocument();
  });

  it("says a category's tile takes its first piece's photo when none is chosen", async () => {
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "For love" }));

    expect(within(editor()).getByText(/automatic/i)).toBeInTheDocument();
  });

  it("chooses a tile's photo by looking at it", async () => {
    const { container } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "For love" }));
    await user.click(within(editor()).getByRole("button", { name: /^choose$/i }));
    await user.click(screen.getByRole("button", { name: /car brooch/i }));

    expect(posted(container.querySelector("form")!, "tilePhoto")[1]).toBe("image:i9");
  });

  it("uploads a photo for a tile and uses it", async () => {
    const { container, upload } = setup();
    const user = userEvent.setup();

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "mum.jpg", { type: "image/jpeg" });
    await user.upload(within(editor()).getByLabelText(/upload a photo/i), file);

    await waitFor(() => expect(posted(container.querySelector("form")!, "tilePhoto")[0]).toBe("upload:u1"));
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("says why an upload was refused, and keeps the photo it had", async () => {
    const upload = jest.fn(async () => ({ ok: false as const, error: "That is not a photo we can use." }));
    const { container } = setup({ upload });
    const user = userEvent.setup();

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "mum.jpg", { type: "image/jpeg" });
    await user.upload(within(editor()).getByLabelText(/upload a photo/i), file);

    expect(await within(editor()).findByText("That is not a photo we can use.")).toBeInTheDocument();
    expect(posted(container.querySelector("form")!, "tilePhoto")[0]).toBe("image:i0");
  });

  it("posts every tile, in order", () => {
    const { container } = setup();

    const form = container.querySelector("form")!;
    expect(posted(form, "tileLabel")).toEqual(LABELS);
    expect(posted(form, "tileLink")[0]).toBe("category:c-xmas");
    expect(posted(form, "tilePhoto")[1]).toBe("");
    expect(posted(form, "tileAddress")).toHaveLength(10);
  });

  it("adds five tiles at a time, the way the mosaic is built", async () => {
    setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /add five more tiles/i }));

    expect(screen.getAllByRole("button", { name: /^new tile$/i })).toHaveLength(5);
  });

  it("takes away a block of five, but never the last", async () => {
    const { container } = setup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /remove block 2/i }));

    expect(posted(container.querySelector("form")!, "tileLabel")).toEqual(LABELS.slice(0, 5));
    expect(screen.queryByRole("button", { name: /remove block/i })).not.toBeInTheDocument();
  });

  it("opens the tile a problem belongs to and says what it is", () => {
    setup({ initialState: { errors: { tile: { 3: { label: "Give the tile its words." } } } } });

    expect(within(editor()).getByLabelText(/words on the tile/i)).toHaveValue("For Dad");
    expect(within(editor()).getByText("Give the tile its words.")).toBeInTheDocument();
  });

  it("puts a problem with the button beside it", () => {
    setup({ initialState: { errors: { ctaLabel: "Give the button some words." } } });

    expect(screen.getByLabelText(/^button words/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("says when it has saved", () => {
    setup({ initialState: { errors: {}, saved: true } });

    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });
});

describe("HomeForm, when a save is rejected", () => {
  it("keeps what was typed, the tiles included", async () => {
    const action = jest.fn(async () => ({ errors: { ctaLabel: "Give the button some words." } }));
    setup({ action });
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/^banner/i));
    await user.type(screen.getByLabelText(/^banner/i), "Made slowly");
    const words = within(editor()).getByLabelText(/words on the tile/i);
    await user.clear(words);
    await user.type(words, "For Mum");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await screen.findByText("Give the button some words.");

    expect(screen.getByLabelText(/^banner/i)).toHaveValue("Made slowly");
    expect(screen.getByRole("button", { name: "For Mum" })).toBeInTheDocument();
  });
});
