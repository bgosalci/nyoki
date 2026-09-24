import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImportProducts, type ImportPreview, type ImportResult } from "@/components/admin/import-products";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const FILE_TEXT = "Web address,Price\r\nsnowflake-card,6.50\r\n";
const csvFile = (text = FILE_TEXT) => new File([text], "products.csv", { type: "text/csv" });

const preview = (overrides: Partial<ImportPreview> = {}): ImportPreview => ({
  error: null,
  format: "csv",
  unit: "Row",
  columns: { used: ["Web address", "Price"], workedOut: ["Profit"], notImported: ["Photos"], unknown: [] },
  counts: { added: 1, changed: 1, unchanged: 235, withProblems: 0 },
  rows: [
    { row: 2, kind: "update", name: "Snowflake Card", changes: [{ label: "Price", from: "£6.00", to: "£6.50" }], problems: [] },
    { row: 3, kind: "new", name: "Bud Vase", changes: [{ label: "Price", from: "(none)", to: "£18.00" }], problems: [] },
  ],
  signature: "sig-1",
  ...overrides,
});

function setup({ checked = preview(), applied = { error: null, added: 1, changed: 1 } }: { checked?: ImportPreview; applied?: ImportResult } = {}) {
  const check = jest.fn(async (_csv: string) => checked);
  const apply = jest.fn(async (_csv: string, _signature: string) => applied);
  render(<ImportProducts check={check} apply={apply} />);
  return { check, apply, user: userEvent.setup() };
}

async function choose(user: ReturnType<typeof userEvent.setup>, file = csvFile()) {
  await user.upload(screen.getByLabelText("Product file"), file);
}

describe("ImportProducts", () => {
  it("asks for a file in a way that looks clickable, and says nothing changes yet", () => {
    setup();

    expect(screen.getByText("Choose a CSV, JSON or XML file")).toBeInTheDocument();
    expect(screen.getByText(/nothing changes until you have seen what will/i)).toBeInTheDocument();
  });

  it("checks the file as soon as it is chosen, and shows what would change", async () => {
    const { user, check } = setup();

    await choose(user);

    await waitFor(() => expect(check).toHaveBeenCalledWith(FILE_TEXT));
    expect(await screen.findByText("1 new, 1 to change, 235 unchanged.")).toBeInTheDocument();
    const changes = screen.getByRole("list", { name: /what would change/i });
    expect(within(changes).getByText("Snowflake Card")).toBeInTheDocument();
    expect(within(changes).getByText("Price: £6.00 → £6.50")).toBeInTheDocument();
    expect(within(changes).getByText("Bud Vase")).toBeInTheDocument();
    expect(within(changes).getByText("New")).toBeInTheDocument();
  });

  it("says which columns it works out rather than imports, and which it leaves alone", async () => {
    const { user } = setup();
    await choose(user);

    expect(await screen.findByText(/worked out, so not imported: profit/i)).toBeInTheDocument();
    expect(screen.getByText(/not imported: photos/i)).toBeInTheDocument();
  });

  it("imports only once asked, and says what it did", async () => {
    const { user, apply } = setup();
    await choose(user);

    await user.click(await screen.findByRole("button", { name: "Import 2 changes" }));
    const dialog = screen.getByRole("dialog", { name: "Import 2 changes?" });
    expect(dialog).toHaveTextContent(/export a copy first/i);
    expect(apply).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Import 2 changes" }));

    expect(apply).toHaveBeenCalledWith(FILE_TEXT, "sig-1");
    expect(await screen.findByRole("status")).toHaveTextContent("Imported: 1 added, 1 changed.");
    expect(screen.queryByRole("list", { name: /what would change/i })).not.toBeInTheDocument();
  });

  it("will not import a file with problems, and names the rows", async () => {
    const { user } = setup({
      checked: preview({
        counts: { added: 1, changed: 0, unchanged: 235, withProblems: 1 },
        rows: [{ row: 4, kind: "update", name: "Snowflake Card", changes: [], problems: ["Price: write it as pounds and pence, like 8.50."] }],
      }),
    });

    await choose(user);

    const problems = await screen.findByRole("alert");
    expect(problems).toHaveTextContent("Row 4 (Snowflake Card): Price: write it as pounds and pence, like 8.50.");
    expect(problems).toHaveTextContent(/nothing has been imported/i);
    expect(screen.getByRole("button", { name: /import/i })).toBeDisabled();
  });

  it("says when a file cannot be read at all", async () => {
    const { user } = setup({ checked: preview({ error: "The file needs a Name or a Web address column, to know which products it is about.", rows: [] }) });

    await choose(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("needs a Name or a Web address column");
  });

  it("says so when the file changes nothing", async () => {
    const { user } = setup({ checked: preview({ counts: { added: 0, changed: 0, unchanged: 237, withProblems: 0 }, rows: [] }) });

    await choose(user);

    expect(await screen.findByText(/everything in the file matches the shop already/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /import \d/i })).not.toBeInTheDocument();
  });

  it("shows why an import was refused - the products changed since the file was checked", async () => {
    const { user } = setup({ applied: { error: "The products have changed since the file was checked. Choose it again.", added: 0, changed: 0 } });
    await choose(user);

    await user.click(await screen.findByRole("button", { name: "Import 2 changes" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Import 2 changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("changed since the file was checked");
  });

  it("takes JSON and XML files as well as CSV", () => {
    setup();

    expect(screen.getByLabelText("Product file")).toHaveAttribute("accept", expect.stringContaining(".json"));
    expect(screen.getByLabelText("Product file")).toHaveAttribute("accept", expect.stringContaining(".xml"));
  });

  it("says how it read the file, and names a JSON or XML product by its place in the list", async () => {
    const { user } = setup({
      checked: preview({
        format: "json",
        unit: "Product",
        counts: { added: 0, changed: 0, unchanged: 1, withProblems: 1 },
        rows: [{ row: 2, kind: "update", name: "Snowflake Card", changes: [], problems: ["Stock: write a whole number, zero or more."] }],
      }),
    });

    await choose(user, new File(['[{"webAddress":"snowflake-card"}]'], "products.json", { type: "application/json" }));

    expect(await screen.findByText("Read as JSON.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Product 2 (Snowflake Card): Stock: write a whole number, zero or more.");
  });
});

