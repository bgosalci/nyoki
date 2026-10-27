import { MAX_GRAMS, MAX_THICKNESS_MM, PARCEL_SIZES, ROYAL_MAIL_SERVICES, SIZE_NAMES, isLetterSize, royalMailService } from "@/lib/delivery/royal-mail";

// Royal Mail's online prices, as its own pages gave them on 27 October 2026
// (in force from 5 October 2026). A change here is a change to what shoppers pay.
describe("Royal Mail's online prices", () => {
  it("has Tracked 48 as royalmail.com/sending/uk/tracked-48 lists it", () => {
    expect(royalMailService("tracked-48")?.bands).toEqual([
      { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 290 },
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 375 },
      { size: "MEDIUM_PARCEL", upToGrams: 2000, pricePence: 570 },
      { size: "MEDIUM_PARCEL", upToGrams: 10000, pricePence: 755 },
      { size: "MEDIUM_PARCEL", upToGrams: 20000, pricePence: 1225 },
    ]);
  });

  it("has Tracked 24", () => {
    expect(royalMailService("tracked-24")?.bands).toEqual([
      { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 390 },
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 480 },
      { size: "MEDIUM_PARCEL", upToGrams: 2000, pricePence: 675 },
      { size: "MEDIUM_PARCEL", upToGrams: 10000, pricePence: 880 },
      { size: "MEDIUM_PARCEL", upToGrams: 20000, pricePence: 1430 },
    ]);
  });

  it("has 1st Class, a letter included", () => {
    expect(royalMailService("1st-class")?.bands).toEqual([
      { size: "LETTER", upToGrams: 100, pricePence: 180 },
      { size: "LARGE_LETTER", upToGrams: 100, pricePence: 320 },
      { size: "LARGE_LETTER", upToGrams: 250, pricePence: 330 },
      { size: "LARGE_LETTER", upToGrams: 500, pricePence: 330 },
      { size: "LARGE_LETTER", upToGrams: 750, pricePence: 330 },
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 570 },
      { size: "MEDIUM_PARCEL", upToGrams: 2000, pricePence: 820 },
      { size: "MEDIUM_PARCEL", upToGrams: 10000, pricePence: 1040 },
      { size: "MEDIUM_PARCEL", upToGrams: 20000, pricePence: 1640 },
    ]);
  });

  it("has 2nd Class", () => {
    expect(royalMailService("2nd-class")?.bands).toEqual([
      { size: "LETTER", upToGrams: 100, pricePence: 91 },
      { size: "LARGE_LETTER", upToGrams: 100, pricePence: 155 },
      { size: "LARGE_LETTER", upToGrams: 250, pricePence: 190 },
      { size: "LARGE_LETTER", upToGrams: 500, pricePence: 240 },
      { size: "LARGE_LETTER", upToGrams: 750, pricePence: 270 },
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 440 },
      { size: "MEDIUM_PARCEL", upToGrams: 2000, pricePence: 700 },
      { size: "MEDIUM_PARCEL", upToGrams: 10000, pricePence: 900 },
      { size: "MEDIUM_PARCEL", upToGrams: 20000, pricePence: 1370 },
    ]);
  });

  it("says how long each takes, as the options at checkout do", () => {
    expect(ROYAL_MAIL_SERVICES.map(({ name, minDays, maxDays }) => [name, minDays, maxDays])).toEqual([
      ["Royal Mail Tracked 48", 2, 3],
      ["Royal Mail Tracked 24", 1, 2],
      ["Royal Mail 1st Class", 1, 2],
      ["Royal Mail 2nd Class", 2, 3],
    ]);
  });

  it("lists every band smallest size first, then lightest first, in whole pence", () => {
    for (const service of ROYAL_MAIL_SERVICES) {
      const order = service.bands.map((band) => PARCEL_SIZES.indexOf(band.size) * 100000 + band.upToGrams);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      for (const band of service.bands) expect(Number.isInteger(band.pricePence)).toBe(true);
    }
  });

  it("knows nothing it was not given", () => {
    expect(royalMailService("special-delivery")).toBeNull();
  });
});

describe("Royal Mail's sizes", () => {
  it("are four, smallest first, named as Royal Mail names them", () => {
    expect(PARCEL_SIZES.map((size) => SIZE_NAMES[size])).toEqual(["Letter", "Large Letter", "Small Parcel", "Medium Parcel"]);
  });

  it("take a letter to 5 mm and a large letter to 25 mm, and nothing else by thickness", () => {
    expect(MAX_THICKNESS_MM).toEqual({ LETTER: 5, LARGE_LETTER: 25 });
    expect(PARCEL_SIZES.filter(isLetterSize)).toEqual(["LETTER", "LARGE_LETTER"]);
  });

  it("take 100 g, 750 g, 2 kg and 20 kg at most", () => {
    expect(MAX_GRAMS).toEqual({ LETTER: 100, LARGE_LETTER: 750, SMALL_PARCEL: 2000, MEDIUM_PARCEL: 20000 });
  });
});
