import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PhotoField } from "@/components/admin/photo-field";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const items = [
  { id: "a", title: "Cards / Christmas / row 18", details: ["Costs £3.50", "Was £8.90"], imageUrl: "/a.jpg", searchText: "snowman" },
  { id: "b", title: "Clothes / Spring/Summer / row 15", details: [], imageUrl: null, searchText: "" },
];

function setup(overrides: Partial<React.ComponentProps<typeof PhotoField>> = {}) {
  const onChange = jest.fn();
  const utils = render(
    <PhotoField
      label="From your price lists"
      items={items}
      value={null}
      onChange={onChange}
      emptyLabel="None chosen"
      missingLabel="A row no longer offered"
      chooserTitle="Which row is this piece?"
      {...overrides}
    />,
  );
  return { ...utils, onChange, user: userEvent.setup() };
}

describe("PhotoField", () => {
  it("labels itself as a group, leaving Choose to say what it does", () => {
    setup();

    expect(screen.getByRole("group", { name: "From your price lists" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose" })).toBeInTheDocument();
  });

  it("says what choosing nothing means, and offers nothing to clear", () => {
    setup();

    expect(screen.getByText("None chosen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear/i })).not.toBeInTheDocument();
  });

  it("shows what is chosen by its photo, its name and its details", () => {
    const { container } = setup({ value: "a" });

    const field = screen.getByRole("group", { name: "From your price lists" });
    expect(within(field).getByText("Cards / Christmas / row 18")).toBeInTheDocument();
    expect(within(field).getByText(/costs £3\.50/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("names a chosen id that is no longer offered, rather than dropping it", () => {
    setup({ value: "gone" });

    expect(screen.getByText("A row no longer offered")).toBeInTheDocument();
  });

  it("opens the chooser, with whatever is being matched above it", async () => {
    const { user } = setup({ lead: <p>Looking for Snowman Card</p> });

    await user.click(screen.getByRole("button", { name: "Choose" }));

    const dialog = screen.getByRole("dialog", { name: "Which row is this piece?" });
    expect(within(dialog).getByText("Looking for Snowman Card")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: /row/i })).toHaveLength(2);
  });

  it("hands the choice back and shuts", async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByRole("button", { name: "Choose" }));
    await user.click(screen.getByRole("button", { name: /spring\/summer/i }));

    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hands back nothing when cleared", async () => {
    const { user, onChange } = setup({ value: "a" });

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("closes without choosing when called off", async () => {
    const { user, onChange } = setup();

    await user.click(screen.getByRole("button", { name: "Choose" }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("posts its value when it is given a name, and nothing when it is not", () => {
    const named = setup({ name: "fromEntry", value: "a" });
    expect(named.container.querySelector('input[name="fromEntry"]')).toHaveValue("a");
    named.unmount();

    const unnamed = setup({ value: "a" });
    expect(unnamed.container.querySelector("input[type=hidden]")).toBeNull();
  });
});
