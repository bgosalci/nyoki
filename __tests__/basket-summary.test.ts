import { madeToOrderNote, piecesLabel, shortDetails } from "@/lib/basket/summary";

const line = (name: string, madeToOrder: boolean, leadTimeDays: number | null) => ({ name, madeToOrder, leadTimeDays });

describe("piecesLabel", () => {
  it("counts pieces in words", () => {
    expect(piecesLabel(1)).toBe("1 piece");
    expect(piecesLabel(4)).toBe("4 pieces");
  });
});

describe("madeToOrderNote", () => {
  it("says nothing when nothing is made to order", () => {
    expect(madeToOrderNote([line("Card", false, null)])).toBeNull();
  });

  it("names the one piece made to order, and when it will be ready", () => {
    expect(madeToOrderNote([line("Card", false, null), line("Merino Hat", true, 14)])).toBe(
      "Merino Hat is made to order, so everything is sent together once it's ready, within 14 days.",
    );
  });

  it("takes the longest wait when several are made to order", () => {
    expect(madeToOrderNote([line("Hat", true, 14), line("Coat", true, 21)])).toBe(
      "Some pieces are made to order, so everything is sent together once they're ready, within 21 days.",
    );
  });

  it("leaves the days out when none are given", () => {
    expect(madeToOrderNote([line("Hat", true, null)])).toBe("Hat is made to order, so everything is sent together once it's ready.");
  });
});

describe("shortDetails", () => {
  it("puts a line's choices in a few words, a printed message by name rather than in full", () => {
    expect(
      shortDetails([
        { label: "Single or pack", value: "Pack of 3" },
        { label: "Inside the card", value: "Printed: “Merry Christmas from all of us”" },
        { label: "Names", value: "Rebecca & Oscar" },
      ]),
    ).toBe("Pack of 3 · Printed message · Rebecca & Oscar");
    expect(shortDetails([{ label: "Colour", value: "Seascape" }, { label: "Size", value: "2-3 years" }])).toBe("Seascape · 2-3 years");
    expect(shortDetails([])).toBe("");
  });
});
