import { moveImage, nextPosition, renumber } from "@/lib/images/order";

const imgs = (ids: string[]) => ids.map((id, position) => ({ id, position }));

describe("nextPosition", () => {
  it("starts at zero for a product with no images", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("goes one past the highest position, not the count", () => {
    // Positions can have gaps after a deletion; the count would collide.
    expect(nextPosition([{ position: 0 }, { position: 4 }])).toBe(5);
  });
});

describe("renumber", () => {
  it("closes gaps while keeping the order", () => {
    const gappy = [
      { id: "a", position: 0 },
      { id: "c", position: 5 },
      { id: "b", position: 2 },
    ];

    expect(renumber(gappy)).toEqual(imgs(["a", "b", "c"]));
  });

  it("does not mutate its input", () => {
    const input = [{ id: "a", position: 3 }];
    renumber(input);

    expect(input[0].position).toBe(3);
  });
});

describe("moveImage", () => {
  it("swaps with the previous image on up", () => {
    expect(moveImage(imgs(["a", "b", "c"]), "b", "up")).toEqual(imgs(["b", "a", "c"]));
  });

  it("swaps with the next image on down", () => {
    expect(moveImage(imgs(["a", "b", "c"]), "b", "down")).toEqual(imgs(["a", "c", "b"]));
  });

  it("leaves the first image alone on up", () => {
    expect(moveImage(imgs(["a", "b"]), "a", "up")).toEqual(imgs(["a", "b"]));
  });

  it("leaves the last image alone on down", () => {
    expect(moveImage(imgs(["a", "b"]), "b", "down")).toEqual(imgs(["a", "b"]));
  });

  it("ignores an id that is not there", () => {
    expect(moveImage(imgs(["a", "b"]), "zzz", "up")).toEqual(imgs(["a", "b"]));
  });

  it("orders by position before moving, not by array order", () => {
    const shuffled = [
      { id: "c", position: 2 },
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];

    expect(moveImage(shuffled, "c", "up")).toEqual(imgs(["a", "c", "b"]));
  });
});
