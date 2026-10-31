import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Checkbox } from "@/components/admin/checkbox";

function Featured({ initially }: { initially: boolean }) {
  const [on, setOn] = useState(initially);
  return (
    <form aria-label="Featured">
      <label>
        <Checkbox name="featured" checked={on} onChange={(event) => setOn(event.target.checked)} />
        Feature it
      </label>
    </form>
  );
}

const reset = () => act(() => (screen.getByRole("form", { name: "Featured" }) as HTMLFormElement).reset());

describe("Checkbox", () => {
  it("keeps showing a tick put in when its form is reset, as React does after every save", async () => {
    const user = userEvent.setup();
    render(<Featured initially={false} />);

    await user.click(screen.getByRole("checkbox", { name: "Feature it" }));
    reset();

    expect(screen.getByRole("checkbox", { name: "Feature it" })).toBeChecked();
  });

  it("keeps showing a tick taken out when its form is reset", async () => {
    const user = userEvent.setup();
    render(<Featured initially />);

    await user.click(screen.getByRole("checkbox", { name: "Feature it" }));
    reset();

    expect(screen.getByRole("checkbox", { name: "Feature it" })).not.toBeChecked();
  });

  it("can still be ticked and unticked after a reset", async () => {
    const user = userEvent.setup();
    render(<Featured initially={false} />);
    const box = screen.getByRole("checkbox", { name: "Feature it" });

    await user.click(box);
    reset();
    await user.click(box);
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });
});
