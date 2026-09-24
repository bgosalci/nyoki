import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilePicker } from "@/components/admin/file-picker";

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

function setup(props: Partial<React.ComponentProps<typeof FilePicker>> = {}) {
  const onFiles = jest.fn();
  const utils = render(
    <form>
      <FilePicker
        id="product-photos"
        name="files"
        label="Add photos"
        prompt="Choose photos"
        hint="JPEG, PNG or WebP, up to 10MB each."
        accept="image/jpeg,image/png,image/webp"
        multiple
        onFiles={onFiles}
        {...props}
      />
    </form>,
  );
  return { ...utils, onFiles, user: userEvent.setup() };
}

describe("FilePicker", () => {
  it("is named by its label, and posts its files under its name", () => {
    setup();

    const input = screen.getByLabelText("Add photos");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("name", "files");
    expect(input).toHaveAccessibleDescription("JPEG, PNG or WebP, up to 10MB each.");
  });

  it("looks like something to click: a button to choose, and room to drop", () => {
    setup();

    expect(screen.getByText("Choose photos")).toBeInTheDocument();
    expect(screen.getByText(/or drag them here/i)).toBeInTheDocument();
  });

  it("opens the chooser from anywhere on its area", () => {
    setup();

    // The whole area is the input's label, so a click anywhere on it is a click on the input.
    const area = screen.getByText("Choose photos").closest("label");
    expect(area).toHaveAttribute("for", "product-photos");
  });

  it("says which files were chosen, and hands them over", async () => {
    const { user, onFiles } = setup();

    await user.upload(screen.getByLabelText("Add photos"), [photo("stars.jpg"), photo("tree.jpg")]);

    expect(screen.getByText("2 chosen: stars.jpg, tree.jpg")).toBeInTheDocument();
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "stars.jpg" }), expect.objectContaining({ name: "tree.jpg" })]);
  });

  it("takes files dropped onto it", () => {
    const { onFiles } = setup();
    const area = screen.getByText("Choose photos").closest("label")!;

    fireEvent.dragOver(area, { dataTransfer: { files: [] } });
    fireEvent.drop(area, { dataTransfer: { files: [photo("dropped.jpg")] } });

    expect(screen.getByText("1 chosen: dropped.jpg")).toBeInTheDocument();
    expect(onFiles).toHaveBeenLastCalledWith([expect.objectContaining({ name: "dropped.jpg" })]);
  });

  it("forgets its choice when the form is reset, as it is after an upload", async () => {
    const { user, container, onFiles } = setup();
    await user.upload(screen.getByLabelText("Add photos"), [photo("stars.jpg")]);

    fireEvent.reset(container.querySelector("form")!);

    expect(screen.queryByText(/chosen:/)).not.toBeInTheDocument();
    expect(onFiles).toHaveBeenLastCalledWith([]);
  });
});
