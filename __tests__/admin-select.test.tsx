import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Select } from "@/components/admin/select";

function Sizes() {
  const [size, setSize] = useState("");
  return (
    <form aria-label="Sizes">
      <Select aria-label="Size" name="size" value={size} onChange={(event) => setSize(event.target.value)}>
        <option value="">Not set</option>
        <option value="LETTER">Letter</option>
        <option value="LARGE_LETTER">Large Letter</option>
      </Select>
    </form>
  );
}

describe("Select", () => {
  it("keeps showing the option chosen when its form is reset, as React does after every save", async () => {
    const user = userEvent.setup();
    render(<Sizes />);

    await user.selectOptions(screen.getByLabelText("Size"), "LARGE_LETTER");
    act(() => (screen.getByRole("form", { name: "Sizes" }) as HTMLFormElement).reset());

    expect(screen.getByLabelText("Size")).toHaveValue("LARGE_LETTER");
  });

  it("lets every other option be chosen still", async () => {
    const user = userEvent.setup();
    render(<Sizes />);

    await user.selectOptions(screen.getByLabelText("Size"), "LETTER");
    await user.selectOptions(screen.getByLabelText("Size"), "");

    expect(screen.getByLabelText("Size")).toHaveValue("");
  });
});
