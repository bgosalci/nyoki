import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "@/components/admin/field";
import { RichTextField } from "@/components/admin/rich-text-field";

function renderField(defaultValue: string, error?: string) {
  render(
    <form aria-label="Product">
      <Field label="Description" name="description" error={error}>
        {(props) => <RichTextField {...props} defaultValue={defaultValue} />}
      </Field>
    </form>,
  );
  return screen.findByRole("textbox", { name: "Description" });
}

const posted = () => new FormData(screen.getByRole<HTMLFormElement>("form", { name: "Product" })).get("description");

/** Everything in the box selected, as Ctrl+A would. */
async function selectAll(box: HTMLElement) {
  act(() => box.focus());
  await userEvent.setup().keyboard("{Control>}a{/Control}");
}

describe("RichTextField", () => {
  it("shows the saved text formatted, not as markers", async () => {
    const box = await renderField("Send **heavenly** wishes.\n\n- Card\n- Envelope");

    expect(within(box).getByText("heavenly").tagName).toBe("STRONG");
    expect(within(box).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["Card", "Envelope"]);
    expect(box).not.toHaveTextContent("**");
  });

  it("posts the saved text untouched until something is changed", async () => {
    // Written a way the editor would not write it - but rewriting it on
    // arrival would count as an unsaved change nobody made.
    await renderField("* Card");

    expect(posted()).toBe("* Card");
  });

  it("makes the selection bold", async () => {
    const box = await renderField("Handmade card");
    await selectAll(box);

    await userEvent.setup().click(screen.getByRole("button", { name: "Bold" }));

    expect(posted()).toBe("**Handmade card**");
    expect(within(box).getByText("Handmade card").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  });

  it("makes the selection italic", async () => {
    const box = await renderField("Handmade card");
    await selectAll(box);

    await userEvent.setup().click(screen.getByRole("button", { name: "Italic" }));

    expect(posted()).toBe("*Handmade card*");
  });

  it("turns paragraphs into bullets", async () => {
    const box = await renderField("Card\n\nEnvelope");
    await selectAll(box);

    await userEvent.setup().click(screen.getByRole("button", { name: "Bullet list" }));

    expect(posted()).toBe("- Card\n- Envelope");
  });

  it("posts what is typed", async () => {
    const box = await renderField("");

    await userEvent.setup().type(box, "Crocheted by hand.");

    expect(posted()).toBe("Crocheted by hand.");
  });

  it("never submits the form from its buttons", async () => {
    await renderField("");

    for (const name of ["Bold", "Italic", "Bullet list"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("type", "button");
    }
  });

  it("is marked invalid and described by its error, like any other field", async () => {
    const box = await renderField("", "Keep the description under 5,000 characters.");

    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).toHaveAccessibleDescription("Keep the description under 5,000 characters.");
  });
});
