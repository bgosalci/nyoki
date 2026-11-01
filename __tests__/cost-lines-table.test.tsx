import { render, screen } from "@testing-library/react";

import { CostLinesTable } from "@/components/admin/cost-lines-table";

const rows = [{ key: 1, label: "Yarn - merino, two skeins", unit: "4.50", quantity: "2" }];

describe("CostLinesTable", () => {
  it("gives what each line is the room, and the figures only what they need", () => {
    // Beside the Price tab's figures at 1024px, with the sidebar open, the
    // labels were cut to "Yarn - me" and "Making c" while the number columns
    // took two thirds of the row.
    render(<CostLinesTable rows={rows} onChange={() => {}} />);

    expect(screen.getByRole("table")).toHaveClass("table-fixed");
    const [what, each, many, cost, remove] = screen.getAllByRole("columnheader");
    expect(what.className).not.toMatch(/\bw-/);
    expect(each).toHaveClass("w-20");
    expect(many).toHaveClass("w-18");
    expect(cost).toHaveClass("w-16");
    expect(remove).toHaveClass("w-8");
  });

  it("keeps a line's cost on one line, however narrow its column", () => {
    render(<CostLinesTable rows={rows} onChange={() => {}} />);

    expect(screen.getByRole("cell", { name: "£9.00" })).toHaveClass("whitespace-nowrap");
  });
});
