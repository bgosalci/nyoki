import { formatGrams, productFacts } from "@/lib/storefront/facts";

describe("formatGrams", () => {
  it("shows grams below a kilo", () => {
    expect(formatGrams(450)).toBe("450g");
  });

  it("shows kilos above one, without a trailing zero", () => {
    expect(formatGrams(2600)).toBe("2.6kg");
    expect(formatGrams(2000)).toBe("2kg");
  });

  it("treats exactly a kilo as kilos", () => {
    expect(formatGrams(1000)).toBe("1kg");
  });
});

describe("productFacts", () => {
  const full = {
    dimensions: "9cm tall, 8cm across",
    materials: "Stoneware, matt glaze",
    weightGrams: 450,
    careInstructions: "Hand wash only.",
  };

  it("lists the making details in a settled order", () => {
    expect(productFacts(full)).toEqual([
      { label: "Size", value: "9cm tall, 8cm across", rich: false },
      { label: "Materials", value: "Stoneware, matt glaze", rich: true },
      { label: "Weight", value: "450g", rich: false },
      { label: "Care", value: "Hand wash only.", rich: false },
    ]);
  });

  it("marks only the materials as formatted text, the one written in the formatting editor", () => {
    // Size and care are typed into plain boxes, where an asterisk is just an
    // asterisk: read as formatting, "10*15*20cm" lost its stars to an italic.
    expect(productFacts(full).filter((fact) => fact.rich).map((fact) => fact.label)).toEqual(["Materials"]);
  });

  it("leaves out whatever was not filled in", () => {
    expect(productFacts({ ...full, materials: null, weightGrams: null })).toEqual([
      { label: "Size", value: "9cm tall, 8cm across", rich: false },
      { label: "Care", value: "Hand wash only.", rich: false },
    ]);
  });

  it("is empty when nothing is known, so the panel can be hidden entirely", () => {
    expect(productFacts({ dimensions: null, materials: null, weightGrams: null, careInstructions: null })).toEqual([]);
  });

  it("ignores a weight of zero rather than printing 0g", () => {
    expect(productFacts({ ...full, weightGrams: 0 })).not.toContainEqual(expect.objectContaining({ label: "Weight" }));
  });
});
