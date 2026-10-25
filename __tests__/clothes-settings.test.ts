import { parseClothing, stockFieldName } from "@/lib/clothes/settings";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

/** A colour or size row as the form posts it: its name, and the name it was saved under. */
const colour = (name: string, was = name): [string, string][] => [
  ["colour", name],
  ["colourWas", was],
];
const size = (name: string, was = name): [string, string][] => [
  ["size", name],
  ["sizeWas", was],
];

const triples = (result: ReturnType<typeof parseClothing>) =>
  result.ok ? result.data.combos.map(({ colour, size, stock }) => [colour, size, stock]) : result.errors;

describe("parseClothing", () => {
  it("reads the colours and sizes in the order they were set, tidied", () => {
    const result = parseClothing(form([...colour(" Lupin "), ...colour("Gypsum"), ...size("3-4 years"), ...size("4-5 years")]));

    expect(result).toMatchObject({ ok: true, data: { colours: ["Lupin", "Gypsum"], sizes: ["3-4 years", "4-5 years"] } });
  });

  it("reads a stock for each colour in each size, from the box named for its place", () => {
    const result = parseClothing(
      form([
        ...colour("Lupin"),
        ...colour("Gypsum"),
        ...size("S"),
        ...size("M"),
        [stockFieldName(0, 0), "2"],
        [stockFieldName(0, 1), "0"],
        [stockFieldName(1, 0), "5"],
        [stockFieldName(1, 1), "1"],
      ]),
    );

    expect(triples(result)).toEqual([
      ["Lupin", "S", 2],
      ["Lupin", "M", 0],
      ["Gypsum", "S", 5],
      ["Gypsum", "M", 1],
    ]);
  });

  it("counts a box left blank, or not sent at all, as none in stock", () => {
    const result = parseClothing(form([...colour("Lupin"), ...size("S"), ...size("M"), [stockFieldName(0, 0), " "]]));

    expect(triples(result)).toEqual([
      ["Lupin", "S", 0],
      ["Lupin", "M", 0],
    ]);
  });

  it("reads one stock per colour when there are no sizes, and one per size when there are no colours", () => {
    expect(triples(parseClothing(form([...colour("Red"), ...colour("Blue"), [stockFieldName(0, null), "3"], [stockFieldName(1, null), "1"]])))).toEqual([
      ["Red", null, 3],
      ["Blue", null, 1],
    ]);
    expect(triples(parseClothing(form([...size("S"), [stockFieldName(null, 0), "4"]])))).toEqual([[null, "S", 4]]);
  });

  it("has nothing to stock when there are neither colours nor sizes", () => {
    expect(parseClothing(form([]))).toEqual({ ok: true, data: { colours: [], sizes: [], combos: [] } });
  });

  it("remembers what each colour and size was called when the page loaded, so a rename keeps its stock", () => {
    const result = parseClothing(form([...colour("Sage", "Green"), ...size("S", ""), [stockFieldName(0, 0), "1"]]));

    expect(result.ok && result.data.combos).toEqual([{ colour: "Sage", colourWas: "Green", size: "S", sizeWas: null, stock: 1 }]);
  });

  it("refuses a colour or a size with no name, rather than guess one", () => {
    const result = parseClothing(form([...colour(" ", ""), ...size("", "")]));

    expect(result).toEqual({
      ok: false,
      errors: {
        colours: "Name every colour, or remove the empty one.",
        sizes: "Name every size, or remove the empty one.",
      },
    });
  });

  it("refuses the same colour twice, however it is written", () => {
    const result = parseClothing(form([...colour("Red"), ...colour(" red")]));

    expect(result).toEqual({ ok: false, errors: { colours: "There are two colours called “Red”." } });
  });

  it("refuses a name too long to sit on a tile", () => {
    const result = parseClothing(form([...size("x".repeat(41))]));

    expect(result).toEqual({ ok: false, errors: { sizes: "Keep each size to 40 characters." } });
  });

  it("refuses stock that is not a whole number, zero or more", () => {
    for (const typed of ["-1", "2.5", "lots"]) {
      const result = parseClothing(form([...colour("Red"), [stockFieldName(0, null), typed]]));
      expect(result).toEqual({ ok: false, errors: { variantStock: "Stock has to be a whole number, zero or more." } });
    }
  });
});
