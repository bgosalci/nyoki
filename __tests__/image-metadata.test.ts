/**
 * @jest-environment node
 */
import { crc32 } from "node:zlib";

import { stripLocation } from "@/lib/images/metadata";

import { QUANT, SCAN, XMP, concat, exifBlock, has, jpeg, jpegExif, readExif, text } from "./helpers/photos";

describe("stripLocation, JPEG", () => {
  it("takes the location out of a phone photo", () => {
    const stripped = stripLocation(jpeg(), "image/jpeg");

    const exif = readExif(jpegExif(stripped)!);
    expect(exif.latitude).toBeNull();
    expect(exif.longitudeRef).toBeNull();
    expect(Buffer.from(stripped).includes(Buffer.from(new Uint32Array([51, 1, 30, 1, 1234, 100]).buffer))).toBe(false);
  });

  it("keeps which way up the photo was taken, so it is not shown on its side", () => {
    expect(readExif(jpegExif(stripLocation(jpeg(), "image/jpeg"))!).orientation).toBe(6);
  });

  it("removes XMP, which can carry the location a second time", () => {
    const stripped = stripLocation(jpeg(), "image/jpeg");

    expect(has(stripped, "GPSLatitude")).toBe(false);
    expect(has(stripped, "ns.adobe.com/xap")).toBe(false);
  });

  it("leaves the picture itself untouched", () => {
    const stripped = stripLocation(jpeg(), "image/jpeg");

    expect(Buffer.from(stripped.subarray(stripped.length - SCAN.length)).equals(Buffer.from(SCAN))).toBe(true);
    expect(Buffer.from(stripped).includes(Buffer.from(QUANT))).toBe(true);
  });

  it("hands back a photo with no location exactly as it came", () => {
    const clean = jpeg({ exif: exifBlock({ gps: false }), xmp: false });

    expect(Buffer.from(stripLocation(clean, "image/jpeg")).equals(Buffer.from(clean))).toBe(true);
  });

  it("drops a camera data block it cannot read, rather than risk leaving a location in it", () => {
    const garbled = exifBlock();
    garbled[4] = 0xff; // IFD0 pointed off the end of the block

    const stripped = stripLocation(jpeg({ exif: garbled }), "image/jpeg");

    expect(jpegExif(stripped)).toBeNull();
    expect(Buffer.from(stripped.subarray(stripped.length - SCAN.length)).equals(Buffer.from(SCAN))).toBe(true);
  });
});

// PNG -----------------------------------------------------------------------

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type: string, data: Uint8Array) {
  const typed = concat(text(type), data);
  const out = new Uint8Array(12 + data.length);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(typed, 4);
  new DataView(out.buffer).setUint32(8 + data.length, crc32(typed));
  return out;
}

function pngChunks(bytes: Uint8Array) {
  const chunks: { type: string; data: Uint8Array; crcOk: boolean }[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 8; i < bytes.length; ) {
    const length = view.getUint32(i);
    const type = Buffer.from(bytes.subarray(i + 4, i + 8)).toString("latin1");
    const data = bytes.subarray(i + 8, i + 8 + length);
    chunks.push({ type, data, crcOk: view.getUint32(i + 8 + length) === crc32(bytes.subarray(i + 4, i + 8 + length)) });
    i += 12 + length;
  }
  return chunks;
}

const IHDR = chunk("IHDR", new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]));
const IDAT = chunk("IDAT", new Uint8Array([0x78, 0x9c, 0x63, 0x60, 0, 0, 0, 2, 0, 1]));
const IEND = chunk("IEND", new Uint8Array());

describe("stripLocation, PNG", () => {
  const png = concat(PNG_SIGNATURE, IHDR, chunk("eXIf", exifBlock()), chunk("iTXt", concat(text("XML:com.adobe.xmp\0\0\0\0\0"), XMP)), IDAT, IEND);

  it("takes the location out of its camera data, keeping the orientation, with a checksum that still holds", () => {
    const exif = pngChunks(stripLocation(png, "image/png")).find((c) => c.type === "eXIf")!;

    expect(readExif(exif.data)).toMatchObject({ latitude: null, orientation: 6 });
    expect(exif.crcOk).toBe(true);
  });

  it("removes XMP, and leaves the picture's own chunks as they were", () => {
    const chunks = pngChunks(stripLocation(png, "image/png"));

    expect(chunks.map((c) => c.type)).toEqual(["IHDR", "eXIf", "IDAT", "IEND"]);
    expect(chunks.every((c) => c.crcOk)).toBe(true);
  });
});

// WebP ----------------------------------------------------------------------

function riffChunk(fourcc: string, data: Uint8Array) {
  const out = new Uint8Array(8 + data.length + (data.length % 2));
  out.set(text(fourcc), 0);
  new DataView(out.buffer).setUint32(4, data.length, true);
  out.set(data, 8);
  return out;
}

function webp(parts: Uint8Array[]) {
  const body = concat(text("WEBP"), ...parts);
  const header = new Uint8Array(8);
  header.set(text("RIFF"));
  new DataView(header.buffer).setUint32(4, body.length, true);
  return concat(header, body);
}

function webpChunks(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: { fourcc: string; data: Uint8Array }[] = [];
  for (let i = 12; i < bytes.length; ) {
    const size = view.getUint32(i + 4, true);
    chunks.push({ fourcc: Buffer.from(bytes.subarray(i, i + 4)).toString("latin1"), data: bytes.subarray(i + 8, i + 8 + size) });
    i += 8 + size + (size % 2);
  }
  return { riffSize: view.getUint32(4, true), chunks };
}

describe("stripLocation, WebP", () => {
  // VP8X flags: 0x08 EXIF present, 0x04 XMP present.
  const vp8x = riffChunk("VP8X", new Uint8Array([0x08 | 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const image = riffChunk("VP8 ", new Uint8Array([1, 2, 3, 4, 5, 6]));
  const original = webp([vp8x, image, riffChunk("EXIF", exifBlock()), riffChunk("XMP ", XMP)]);

  it("takes the location out of its camera data, keeping the orientation", () => {
    const exif = webpChunks(stripLocation(original, "image/webp")).chunks.find((c) => c.fourcc === "EXIF")!;

    expect(readExif(exif.data)).toMatchObject({ latitude: null, orientation: 6 });
  });

  it("removes XMP, clears its flag, and keeps the file's own size right", () => {
    const stripped = stripLocation(original, "image/webp");
    const { riffSize, chunks } = webpChunks(stripped);

    expect(chunks.map((c) => c.fourcc)).toEqual(["VP8X", "VP8 ", "EXIF"]);
    expect(chunks[0].data[0] & 0x04).toBe(0);
    expect(chunks[0].data[0] & 0x08).toBe(0x08);
    expect(riffSize).toBe(stripped.length - 8);
    expect(Buffer.from(chunks[1].data).equals(Buffer.from([1, 2, 3, 4, 5, 6]))).toBe(true);
  });
});
