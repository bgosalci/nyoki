import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import Link from "next/link";

import { UnsavedChanges } from "@/components/admin/unsaved-changes";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const WORKING_OUT = ["margin"];

/** A form, a way out of the page, and the guard - as a product page has them. */
function Page({ saved = null, onFollow }: { saved?: object | null; onFollow: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form ref={formRef}>
        <input aria-label="Name" name="name" defaultValue="Snowflake Card" />
        <input aria-label="Margin" name="margin" defaultValue="" />
      </form>
      {/* A real next/link: its own onClick is what starts a navigation. */}
      <Link
        href="/admin/products/p3"
        onClick={(event) => {
          event.preventDefault();
          onFollow();
        }}
      >
        Next
      </Link>
      <UnsavedChanges formRef={formRef} saved={saved} ignore={WORKING_OUT} />
    </>
  );
}

function setup() {
  const onFollow = jest.fn();
  const utils = render(<Page onFollow={onFollow} />);
  return { ...utils, onFollow, user: userEvent.setup() };
}

describe("UnsavedChanges", () => {
  it("lets you leave when nothing has changed", async () => {
    const { user, onFollow } = setup();

    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(onFollow).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks before leaving with changes not yet saved", async () => {
    const { user, onFollow } = setup();

    await user.type(screen.getByLabelText("Name"), " - Blue");
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
    expect(onFollow).not.toHaveBeenCalled();
  });

  it("stays, changes and all, when you choose to", async () => {
    const { user, onFollow } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");
    await user.click(screen.getByRole("link", { name: "Next" }));

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onFollow).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Snowflake Card - Blue");
  });

  it("follows the link after all when you choose to leave", async () => {
    const { user, onFollow } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");
    await user.click(screen.getByRole("link", { name: "Next" }));

    await user.click(screen.getByRole("button", { name: /leave without saving/i }));

    expect(onFollow).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not count a change put back as it was", async () => {
    const { user, onFollow } = setup();
    const name = screen.getByLabelText("Name");

    await user.type(name, "x");
    await user.type(name, "{Backspace}");
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(onFollow).toHaveBeenCalled();
  });

  it("does not count what is only there to work things out", async () => {
    const { user, onFollow } = setup();

    await user.type(screen.getByLabelText("Margin"), "40");
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(onFollow).toHaveBeenCalled();
  });

  it("stops asking once the changes are saved", async () => {
    const { user, onFollow, rerender } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");

    rerender(<Page onFollow={onFollow} saved={{}} />);
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(onFollow).toHaveBeenCalled();
  });

  it("keeps asking when a save did not go through", async () => {
    const { user, onFollow, rerender } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");

    rerender(<Page onFollow={onFollow} saved={null} />);
    await user.click(screen.getByRole("link", { name: "Next" }));

    expect(screen.getByRole("dialog", { name: /leave without saving/i })).toBeInTheDocument();
  });

  it("has the browser warn before the tab is closed or reloaded with changes not saved", async () => {
    const { user } = setup();
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(unload()).toBe(false);

    await user.type(screen.getByLabelText("Name"), " - Blue");
    expect(unload()).toBe(true);
  });

  it("stops listening once the page has gone", async () => {
    const { user, unmount, onFollow } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");
    unmount();

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(onFollow).not.toHaveBeenCalled();
  });

  it("leaves a link opened in a new tab alone, since this page stays open", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText("Name"), " - Blue");

    fireEvent.click(screen.getByRole("link", { name: "Next" }), { metaKey: true });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
