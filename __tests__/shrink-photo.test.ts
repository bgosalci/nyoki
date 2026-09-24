import { fitWithin, MAX_EDGE, needsShrinking, SHRINK_ABOVE_BYTES, shrinkPhoto, type PhotoCodec } from "@/lib/images/shrink";

const MB = 1024 * 1024;

describe("fitWithin", () => {
  it("scales the long side down to the limit, keeping the shape", () => {
    expect(fitWithin(4900, 3267, 3000)).toEqual({ width: 3000, height: 2000 });
    expect(fitWithin(3024, 4032, 3000)).toEqual({ width: 2250, height: 3000 });
  });

  it("never enlarges a photo that already fits", () => {
    expect(fitWithin(1200, 800, 3000)).toEqual({ width: 1200, height: 800 });
  });
});

describe("needsShrinking", () => {
  it("leaves a photo alone that is small enough in both bytes and pixels", () => {
    expect(needsShrinking({ bytes: 2 * MB, width: 2000, height: 1500 })).toBe(false);
  });

  it("shrinks one too heavy to send to Vercel, or larger than the shop could ever show", () => {
    expect(needsShrinking({ bytes: SHRINK_ABOVE_BYTES + 1, width: 2000, height: 1500 })).toBe(true);
    expect(needsShrinking({ bytes: 1 * MB, width: MAX_EDGE + 1, height: 1500 })).toBe(true);
  });
});

describe("shrinkPhoto", () => {
  const photo = (name: string, bytes: number, type = "image/jpeg") => new File([new Uint8Array(bytes)], name, { type });

  /** A stand-in for the browser's canvas: records what it was asked, answers with a blob of a chosen size. */
  function codec({ width = 4032, height = 3024, outBytes = 900 * 1024, outType }: { width?: number; height?: number; outBytes?: number; outType?: string } = {}) {
    const asked: { width: number; height: number; type: string; quality: number }[] = [];
    const fake: PhotoCodec = {
      decode: async () => ({ width, height, close: () => {} }),
      encode: async (_image, size, type, quality) => {
        asked.push({ ...size, type, quality });
        return new Blob([new Uint8Array(outBytes)], { type: outType ?? type });
      },
    };
    return { fake, asked };
  }

  it("sends a photo that needs nothing done exactly as it was", async () => {
    const original = photo("card.jpg", 2 * MB);
    const { fake, asked } = codec({ width: 2000, height: 1500 });

    expect(await shrinkPhoto(original, fake)).toBe(original);
    expect(asked).toEqual([]);
  });

  it("scales a large phone photo to fit, and keeps its name", async () => {
    const { fake, asked } = codec();

    const shrunk = await shrinkPhoto(photo("IMG_2044.jpg", 6 * MB), fake);

    expect(asked[0]).toEqual({ width: 3000, height: 2250, type: "image/jpeg", quality: 0.9 });
    expect(shrunk.name).toBe("IMG_2044.jpg");
    expect(shrunk.type).toBe("image/jpeg");
    expect(shrunk.size).toBe(900 * 1024);
  });

  it("keeps a PNG's see-through parts by making it WebP, and names it so", async () => {
    const { fake, asked } = codec();

    const shrunk = await shrinkPhoto(photo("i adore you.png", 5 * MB, "image/png"), fake);

    expect(asked[0].type).toBe("image/webp");
    expect(shrunk.name).toBe("i adore you.webp");
  });

  it("falls back to JPEG where the browser cannot write WebP", async () => {
    // Some browsers hand back a PNG when asked for a WebP they cannot encode.
    const { fake, asked } = codec({ outType: "image/png" });
    let call = 0;
    const encode = fake.encode;
    fake.encode = async (...args) => (call++ === 0 ? encode(...args) : new Blob([new Uint8Array(800 * 1024)], { type: args[2] }));

    const shrunk = await shrinkPhoto(photo("bow.png", 5 * MB, "image/png"), fake);

    expect(asked[0].type).toBe("image/webp");
    expect(shrunk.type).toBe("image/jpeg");
    expect(shrunk.name).toBe("bow.jpg");
  });

  it("steps the quality down until it is light enough to send", async () => {
    const { fake, asked } = codec();
    const sizes = [5 * MB, 4 * MB, 2 * MB];
    const encode = fake.encode;
    fake.encode = async (...args) => {
      await encode(...args);
      return new Blob([new Uint8Array(sizes[asked.length - 1])], { type: args[2] });
    };

    const shrunk = await shrinkPhoto(photo("big.jpg", 9 * MB), fake);

    expect(asked.map((a) => a.quality)).toEqual([0.9, 0.8, 0.7]);
    expect(shrunk.size).toBe(2 * MB);
  });

  it("sends the original when the browser cannot read or write it, rather than failing", async () => {
    const original = photo("odd.jpg", 6 * MB);
    const broken: PhotoCodec = {
      decode: async () => {
        throw new Error("cannot decode");
      },
      encode: async () => new Blob(),
    };

    expect(await shrinkPhoto(original, broken)).toBe(original);
  });
});
