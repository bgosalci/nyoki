import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CheckoutForm, type CheckoutFormProps } from "@/components/shop/checkout-form";

const tracked48 = { id: "t48", name: "Royal Mail Tracked 48", pricePence: 395, freeOverPence: 4000, minDays: 2, maxDays: 3 };
const tracked24 = { id: "t24", name: "Royal Mail Tracked 24", pricePence: 550, freeOverPence: null, minDays: 1, maxDays: 2 };

const lines = [
  { id: "l1", name: "Silver Snowflake Card", image: null, quantity: 1, totalPence: 2190, vatRate: 20, summary: "Pack of 3 · Printed message" },
  { id: "l2", name: "Merino Hat", image: null, quantity: 1, totalPence: 4500, vatRate: 0, summary: "Seascape · 2-3 years" },
  { id: "l3", name: "Reindeer Card", image: null, quantity: 2, totalPence: 800, vatRate: 20, summary: "" },
];

function setup(overrides: Partial<CheckoutFormProps> = {}) {
  const user = userEvent.setup();
  const props: CheckoutFormProps = {
    lines,
    rates: [tracked48, tracked24],
    shopper: null,
    savedAddresses: [],
    madeToOrderNote: null,
    action: jest.fn().mockResolvedValue({ errors: {} }),
    applyCode: jest.fn().mockResolvedValue({ ok: true, code: "WINTER10", discountPence: 749, label: "10% off" }),
    ...overrides,
  };
  render(<CheckoutForm {...props} />);
  return { user, props };
}

/** The summary beside the form; a phone's folded copy holds the same. */
const summary = () => screen.getByRole("complementary", { name: "Your order" });

describe("checkout", () => {
  describe("your details", () => {
    it("asks a guest for their email, and offers to sign in instead", () => {
      setup();

      expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/account/sign-in?next=/checkout");
    });

    it("shows a signed-in shopper who they are, and asks no email", () => {
      setup({ shopper: { name: "Ella Morgan", email: "ella@example.com" } });

      expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
      expect(screen.getByText("ella@example.com")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sign out" })).toHaveAttribute("href", "/account/sign-out");
    });
  });

  describe("who it is for", () => {
    it("is for the shopper to begin with, asking their name", () => {
      setup();

      expect(screen.getByRole("radio", { name: /for me/i })).toBeChecked();
      expect(screen.getByLabelText("Full name")).toBeInTheDocument();
      expect(screen.queryByLabelText(/a note for the parcel/i)).not.toBeInTheDocument();
    });

    it("asks for the recipient's name and a note for a gift, and leaves the prices off unless told otherwise", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("radio", { name: /a gift for someone else/i }));

      expect(screen.getByRole("heading", { name: "Where should it go?" })).toBeInTheDocument();
      expect(screen.getByLabelText("Their full name")).toBeInTheDocument();
      await user.type(screen.getByLabelText(/a note for the parcel/i), "Happy Christmas");
      expect(screen.getByText("15 / 300")).toBeInTheDocument();
      expect(screen.getByLabelText(/leave the prices off/i)).toBeChecked();
    });
  });

  describe("the address", () => {
    const saved = [{ id: "a1", name: "Ella Morgan", line1: "3 Mill Yard", line2: null, city: "Leeds", county: null, postcode: "LS1 4AB" }];

    it("offers a signed-in shopper's saved addresses first", async () => {
      const { user } = setup({ shopper: { name: "Ella", email: "ella@example.com" }, savedAddresses: saved });

      expect(screen.getByRole("radio", { name: /3 mill yard/i })).toBeChecked();
      expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: /a new address/i }));
      expect(screen.getByLabelText("Full name")).toBeInTheDocument();
      expect(screen.getByLabelText(/save it to your account/i)).toBeInTheDocument();
    });

    it("lets the phone fill the address, and says delivery is UK only for now", () => {
      setup();

      expect(screen.getByLabelText("Address")).toHaveAttribute("autocomplete", "shipping address-line1");
      expect(screen.getByLabelText("Postcode")).toHaveAttribute("autocomplete", "shipping postal-code");
      expect(screen.getByText(/we deliver within the uk for now/i)).toBeInTheDocument();
    });

    it("offers a guest no saving, having no account to save to", () => {
      setup();

      expect(screen.queryByLabelText(/save it to your account/i)).not.toBeInTheDocument();
    });
  });

  describe("delivery and the total", () => {
    it("offers each way of sending it, free where the goods have earned it", () => {
      setup();

      const free = screen.getByRole("radio", { name: /tracked 48/i });
      expect(free).toHaveAccessibleName(expect.stringMatching(/free/i));
      expect(screen.getByRole("radio", { name: /tracked 24/i })).toHaveAccessibleName(expect.stringMatching(/£5\.50/));
    });

    it("leaves delivery out of the total until one is chosen, when every way costs something, then adds it", async () => {
      const { user } = setup({ rates: [{ ...tracked48, freeOverPence: null }, tracked24] });

      expect(screen.getByRole("radio", { name: /tracked 48/i })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: /tracked 24/i })).not.toBeChecked();
      expect(within(summary()).getByText("Choose below")).toBeInTheDocument();
      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£74.90");

      await user.click(screen.getByRole("radio", { name: /tracked 24/i }));

      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£80.40");
    });

    it("starts on the free way of sending, so nobody has to choose what costs nothing", () => {
      const always = { ...tracked48, freeOverPence: 0 };
      setup({ rates: [always, tracked24] });

      expect(screen.getByRole("radio", { name: /tracked 48/i })).toBeChecked();
      expect(within(summary()).queryByText("Choose below")).not.toBeInTheDocument();
      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£74.90");
    });

    it("still offers faster delivery at its price, and adds it once chosen", async () => {
      const always = { ...tracked48, freeOverPence: 0 };
      const { user } = setup({ rates: [always, tracked24] });

      await user.click(screen.getByRole("radio", { name: /tracked 24/i }));

      expect(screen.getByRole("radio", { name: /tracked 24/i })).toBeChecked();
      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£80.40");
    });

    it("says the VAT the total includes", async () => {
      const { user } = setup();

      await user.click(screen.getByRole("radio", { name: /tracked 48/i }));

      expect(summary()).toHaveTextContent("Includes £4.98 VAT");
    });
  });

  describe("a promo code", () => {
    it("takes a code off the total, and sends it with the order", async () => {
      const { user, props } = setup();

      await user.type(within(summary()).getByLabelText("Promo code"), "winter10");
      await user.click(within(summary()).getByRole("button", { name: "Apply" }));

      expect(props.applyCode).toHaveBeenCalledWith("winter10");
      expect(summary()).toHaveTextContent("WINTER10");
      expect(summary()).toHaveTextContent("−£7.49");
      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£67.41");
      expect(document.querySelector<HTMLInputElement>('form input[name="code"]')!.value).toBe("WINTER10");
    });

    it("says why a code cannot be used", async () => {
      const { user } = setup({ applyCode: jest.fn().mockResolvedValue({ ok: false, message: "That code is not available." }) });

      await user.type(within(summary()).getByLabelText("Promo code"), "nope");
      await user.click(within(summary()).getByRole("button", { name: "Apply" }));

      expect(within(summary()).getByText("That code is not available.")).toBeInTheDocument();
    });

    it("can be taken off again", async () => {
      const { user } = setup();
      await user.type(within(summary()).getByLabelText("Promo code"), "winter10");
      await user.click(within(summary()).getByRole("button", { name: "Apply" }));

      await user.click(within(summary()).getByRole("button", { name: /remove/i }));

      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£74.90");
      expect(document.querySelector<HTMLInputElement>('form input[name="code"]')!.value).toBe("");
    });
  });

  describe("what the server said", () => {
    it("shows each problem beside its box, and a notice above the button", () => {
      setup({ initialState: { errors: { postcode: "Enter a UK postcode, like LS29 9AA." }, notice: "Your basket has changed." } });

      expect(screen.getByLabelText("Postcode")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Enter a UK postcode, like LS29 9AA.")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("Your basket has changed.");
    });

    it("marks the address's second line and the county when they are too long", () => {
      setup({ initialState: { errors: { line2: "Keep this line to 100 characters.", county: "Keep the county to 100 characters." } } });

      expect(screen.getByLabelText(/second line/i)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Keep this line to 100 characters.")).toBeInTheDocument();
      expect(screen.getByLabelText(/county/i)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Keep the county to 100 characters.")).toBeInTheDocument();
    });

    it("moves nowhere on arrival, whatever the page starts with", () => {
      setup({ initialState: { errors: { postcode: "Enter a UK postcode, like LS29 9AA." } } });

      expect(document.body).toHaveFocus();
    });
  });

  describe("when Continue is turned down", () => {
    // jsdom has no scrollIntoView; this records where the page was asked to scroll.
    const scrolled = jest.fn();
    beforeEach(() => {
      scrolled.mockClear();
      Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
        scrolled(this, options);
      };
    });

    const refused = (state: Awaited<ReturnType<CheckoutFormProps["action"]>>) => jest.fn().mockResolvedValue(state);

    it("goes to the first problem in page order, in the middle of the screen, clear of the header and the bar", async () => {
      const { user } = setup({ action: refused({ errors: { postcode: "Enter a UK postcode, like LS29 9AA.", city: "Enter the town or city." } }) });

      await user.click(screen.getAllByRole("button", { name: /continue/i })[0]);

      await screen.findByText("Enter the town or city.");
      expect(screen.getByLabelText("Town or city")).toHaveFocus();
      expect(scrolled).toHaveBeenCalledWith(screen.getByLabelText("Town or city"), { block: "center" });
    });

    it("goes to it from the phone's slim bar too, where the postcode is far down the page", async () => {
      const { user } = setup({ action: refused({ errors: { postcode: "Enter a UK postcode, like LS29 9AA." } }) });

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await screen.findByText("Enter a UK postcode, like LS29 9AA.");
      expect(screen.getByLabelText("Postcode")).toHaveFocus();
    });

    it("goes to the way of sending it when none was chosen", async () => {
      const { user } = setup({
        rates: [{ ...tracked48, freeOverPence: null }, tracked24],
        action: refused({ errors: { rate: "Choose how it should be sent." } }),
      });

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await screen.findByText("Choose how it should be sent.");
      expect(screen.getByRole("radio", { name: /tracked 48/i })).toHaveFocus();
    });

    it("goes to the saved address the order could not find, with why beside the addresses", async () => {
      const saved = [{ id: "a1", name: "Ella Morgan", line1: "3 Mill Yard", line2: null, city: "Leeds", county: null, postcode: "LS1 4AB" }];
      const { user } = setup({
        shopper: { name: "Ella", email: "ella@example.com" },
        savedAddresses: saved,
        action: refused({ errors: { address: "Choose where it should go." } }),
      });

      await user.click(screen.getByRole("button", { name: "Continue" }));

      await screen.findByText("Choose where it should go.");
      expect(screen.getByRole("radiogroup", { name: "Where should it go?" })).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("radio", { name: /3 mill yard/i })).toHaveFocus();
    });

    it("goes to what was said about the whole order when no box is wrong", async () => {
      const { user } = setup({ action: refused({ errors: {}, notice: "Your basket has changed. Reindeer Card has sold out." }) });

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByRole("alert")).toHaveFocus();
    });

    it("takes off a code the order would not take, and says why beside the box, unfolding the order on a phone", async () => {
      const { user } = setup({ action: refused({ errors: { code: "That code has been used up." } }) });
      await user.type(within(summary()).getByLabelText("Promo code"), "winter10");
      await user.click(within(summary()).getByRole("button", { name: "Apply" }));

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await within(summary()).findByText("That code has been used up.")).toBeInTheDocument();
      expect(within(summary()).getByTestId("checkout-total")).toHaveTextContent("£74.90");
      expect(document.querySelector<HTMLInputElement>('form input[name="code"]')!.value).toBe("");
      const folded = screen.getByText("Show your order").closest("details")!;
      expect(folded).toHaveAttribute("open");
      expect(within(folded).getByLabelText("Promo code")).toHaveFocus();
    });
  });

  describe("coming back to change something", () => {
    const waiting = {
      email: "ella@example.com",
      phone: null,
      gift: true,
      giftNote: "Love, Ella",
      hidePrices: false,
      address: { name: "Margaret Morgan", line1: "12 Orchard Lane", line2: null, city: "Ilkley", county: null, postcode: "LS29 9AA" },
      rateId: "t24",
      code: { code: "WINTER10", discountPence: 749, label: "10% off" },
    };

    it("starts from the order already waiting", () => {
      setup({ prefill: waiting });

      expect(screen.getByLabelText("Email")).toHaveValue("ella@example.com");
      expect(screen.getByLabelText("Full name")).toHaveValue("Margaret Morgan");
      expect(screen.getByLabelText("Postcode")).toHaveValue("LS29 9AA");
      expect(summary()).toHaveTextContent("WINTER10");
    });

    it("starts on For me all the same, though it was a gift before", () => {
      setup({ prefill: waiting });

      expect(screen.getByRole("radio", { name: /for me/i })).toBeChecked();
      expect(screen.getByRole("radio", { name: /a gift/i })).not.toBeChecked();
      expect(screen.queryByLabelText(/a note for the parcel/i)).not.toBeInTheDocument();
    });

    it("keeps the gift note and the prices as they were, should it be a gift again", async () => {
      const { user } = setup({ prefill: waiting });

      await user.click(screen.getByRole("radio", { name: /a gift/i }));

      expect(screen.getByLabelText(/a note for the parcel/i)).toHaveValue("Love, Ella");
      expect(screen.getByLabelText(/leave the prices off/i)).not.toBeChecked();
      expect(screen.getByLabelText("Their full name")).toHaveValue("Margaret Morgan");
    });

    it("starts on free delivery all the same, though faster was chosen before", () => {
      setup({ prefill: waiting, rates: [{ ...tracked48, freeOverPence: 0 }, tracked24] });

      expect(screen.getByRole("radio", { name: /tracked 48/i })).toBeChecked();
      expect(screen.getByRole("radio", { name: /tracked 24/i })).not.toBeChecked();
    });

    it("keeps the way chosen before when none is free", () => {
      setup({ prefill: waiting, rates: [{ ...tracked48, freeOverPence: null }, tracked24] });

      expect(screen.getByRole("radio", { name: /tracked 24/i })).toBeChecked();
    });
  });

  it("says plainly when no way of sending takes the order, and where to ask", () => {
    setup({ rates: [] });

    expect(screen.getByText(/we can't send this order just now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get in touch/i })).toHaveAttribute("href", "/contact");
    expect(screen.getAllByRole("button", { name: /continue/i })[0]).toBeDisabled();
  });
});
