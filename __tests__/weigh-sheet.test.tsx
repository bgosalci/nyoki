import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WeighSheet, type WeighRow } from "@/components/admin/weigh-sheet";
import { DELIVERY_DEFAULTS } from "@/lib/delivery/parcel";
import { royalMailService } from "@/lib/delivery/royal-mail";

const noop = async () => ({ errors: {} });

const context = {
  settings: DELIVERY_DEFAULTS,
  rates: [
    { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3, byWeight: true, bands: royalMailService("tracked-48")!.bands },
  ],
};

const cards = { categoryId: "cards", categoryName: "Cards", grams: 40, size: "LARGE_LETTER" as const, mm: 5 };
const nothing = { grams: null, size: null, mm: null };

const rows: WeighRow[] = [
  { id: "snowman", name: "Snowman Christmas Card", image: null, categories: ["Cards › Christmas Cards"], own: nothing, usual: cards },
  { id: "wooden", name: "Silver Snowflake Wooden Card", image: null, categories: ["Cards › Christmas Cards"], own: { grams: 62, size: null, mm: 8 }, usual: cards },
  { id: "hairband", name: "Bow Hairband - Pink", image: null, categories: ["Accessories › Hairbands"], own: nothing, usual: null },
  { id: "hat", name: "Merino Unisex Hat", image: null, categories: ["Clothing › Unisex Hat"], own: { grams: 100, size: "SMALL_PARCEL", mm: null }, usual: null },
];

const row = (name: string) => screen.getByRole("row", { name: new RegExp(name, "i") });

describe("WeighSheet", () => {
  it("lists every piece with its postage, an empty box showing the usual it would use", () => {
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    expect(screen.getByLabelText("Weight of Silver Snowflake Wooden Card, in grams")).toHaveValue("62");
    expect(screen.getByLabelText("Weight of Snowman Christmas Card, in grams")).toHaveValue("");
    expect(screen.getByLabelText("Weight of Snowman Christmas Card, in grams")).toHaveAttribute("placeholder", "40 · usual");
    expect(within(row("Snowman")).getByRole("option", { name: "Usual: Large Letter" })).toHaveValue("");
  });

  it("works out what each piece costs to send on its own", () => {
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    expect(within(row("Snowman")).getByText("Large Letter · 80 g")).toBeInTheDocument();
    expect(within(row("Snowman")).getAllByText(/£2.90 by Royal Mail Tracked 48/)).not.toHaveLength(0);
    expect(within(row("Merino")).getByText("Small Parcel · 210 g")).toBeInTheDocument();
    expect(within(row("Hairband")).getByText("Not weighed")).toBeInTheDocument();
    expect(within(row("Hairband")).getByText(/counts as a 500 g small parcel/i)).toBeInTheDocument();
  });

  it("asks a thickness only of what could go as a letter", () => {
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    expect(screen.getByLabelText("Thickness of Silver Snowflake Wooden Card, in millimetres")).toBeVisible();
    expect(screen.queryByLabelText("Thickness of Merino Unisex Hat, in millimetres")).not.toBeInTheDocument();
  });

  it("works the figures out again as a weight is typed", async () => {
    const user = userEvent.setup();
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    await user.type(screen.getByLabelText("Weight of Bow Hairband - Pink, in grams"), "18");
    await user.selectOptions(screen.getByLabelText("How Bow Hairband - Pink goes in the post"), "LARGE_LETTER");
    await user.type(screen.getByLabelText("Thickness of Bow Hairband - Pink, in millimetres"), "22");

    expect(within(row("Hairband")).getByText("Large Letter · 58 g")).toBeInTheDocument();
  });

  it("moves down to the next piece's weight on Enter, as a spreadsheet does", async () => {
    const user = userEvent.setup();
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    await user.click(screen.getByLabelText("Weight of Snowman Christmas Card, in grams"));
    await user.keyboard("40{Enter}");

    expect(screen.getByLabelText("Weight of Silver Snowflake Wooden Card, in grams")).toHaveFocus();
  });

  it("shows only the pieces not weighed, or only those using a usual, keeping the others in the form", async () => {
    const user = userEvent.setup();
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    await user.click(screen.getByRole("button", { name: /not weighed/i }));
    expect(screen.getByLabelText("Weight of Bow Hairband - Pink, in grams")).toBeVisible();
    expect(screen.getByLabelText("Weight of Merino Unisex Hat, in grams")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: /using a usual/i }));
    expect(screen.getByLabelText("Weight of Snowman Christmas Card, in grams")).toBeVisible();
    expect(screen.getByLabelText("Weight of Bow Hairband - Pink, in grams")).not.toBeVisible();
  });

  it("counts each kind in its button", () => {
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    expect(screen.getByRole("button", { name: "Not weighed 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Using a usual 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weighed 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All 4" })).toHaveAttribute("aria-pressed", "true");
  });

  it("finds a piece by its name or its category", async () => {
    const user = userEvent.setup();
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    await user.type(screen.getByRole("searchbox", { name: /search/i }), "hairbands");
    expect(screen.getByLabelText("Weight of Bow Hairband - Pink, in grams")).toBeVisible();
    expect(screen.getByLabelText("Weight of Snowman Christmas Card, in grams")).not.toBeVisible();
  });

  it("says how many pieces have changed, and puts them back on request", async () => {
    const user = userEvent.setup();
    render(<WeighSheet rows={rows} context={context} action={noop} />);

    expect(screen.queryByText(/changed/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Weight of Snowman Christmas Card, in grams"), "45");
    await user.clear(screen.getByLabelText("Weight of Merino Unisex Hat, in grams"));
    await user.type(screen.getByLabelText("Weight of Merino Unisex Hat, in grams"), "110");
    expect(screen.getByText("2 pieces changed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Put back" }));
    expect(screen.getByLabelText("Weight of Snowman Christmas Card, in grams")).toHaveValue("");
    expect(screen.getByLabelText("Weight of Merino Unisex Hat, in grams")).toHaveValue("100");
  });

  it("shows what is wrong on the row it belongs to", () => {
    render(<WeighSheet rows={rows} context={context} action={noop} initialState={{ errors: { "w.hat": "Weight has to be a whole number of grams." } }} />);

    expect(screen.getByLabelText("Weight of Merino Unisex Hat, in grams")).toHaveAttribute("aria-invalid", "true");
    expect(within(row("Merino")).getByText("Weight has to be a whole number of grams.")).toBeInTheDocument();
  });
});
