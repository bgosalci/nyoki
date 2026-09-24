import type { ImageContentType } from "@/lib/images/validate";

/**
 * Taking the location out of a photo before it is stored.
 *
 * A phone writes where a photo was taken into it, and a product photo is
 * served publicly at its own address - taken at home, it would publish the
 * home. So the GPS block of the photo's camera data (EXIF) is wiped, and any
 * XMP, which can repeat the location, is removed.
 *
 * Nothing else changes. The picture is never decoded or saved again, so it
 * loses nothing; and the orientation - which way up the camera was held -
 * stays where it is, so the photo is not shown on its side. Camera data that
 * cannot be read safely is dropped whole: a photo on its side is a smaller
 * harm than a location left in by mistake.
 *
 * Pure bytes in, bytes out; a photo with no location comes back as it was.
 */

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
const GPS_POINTER = 0x8825;

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const EXIF_HEADER = ascii("Exif\0\0");
const XMP_HEADERS = [ascii("http://ns.adobe.com/xap/1.0/\0"), ascii("http://ns.adobe.com/xmp/extension/\0")];
const PNG_XMP_KEYWORD = ascii("XML:com.adobe.xmp\0");

function startsWith(bytes: Uint8Array, at: number, prefix: Uint8Array): boolean {
  if (at + prefix.length > bytes.length) return false;
  for (let i = 0; i < prefix.length; i += 1) if (bytes[at + i] !== prefix[i]) return false;
  return true;
}

/**
 * Wipes the GPS block of a TIFF-structured camera data block, in place: every
 * GPS entry, every value it points to, and the block's count. Returns false
 * when the block cannot be read safely - the caller then drops it whole.
 */
function wipeGps(tiff: Uint8Array): boolean {
  if (tiff.length < 8) return false;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  const big = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!little && !big) return false;

  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const u16 = (at: number) => view.getUint16(at, little);
  const u32 = (at: number) => view.getUint32(at, little);
  const fits = (at: number, length: number) => at >= 0 && length >= 0 && at + length <= tiff.length;

  if (u16(2) !== 42) return false;
  const ifd0 = u32(4);
  if (!fits(ifd0, 2)) return false;
  const count = u16(ifd0);
  if (!fits(ifd0 + 2, count * 12)) return false;

  for (let i = 0; i < count; i += 1) {
    const entry = ifd0 + 2 + i * 12;
    if (u16(entry) !== GPS_POINTER) continue;

    const gps = u32(entry + 8);
    if (!fits(gps, 2)) return false;
    const gpsCount = u16(gps);
    if (!fits(gps + 2, gpsCount * 12)) return false;

    for (let j = 0; j < gpsCount; j += 1) {
      const gpsEntry = gps + 2 + j * 12;
      const size = (TYPE_SIZE[u16(gpsEntry + 2)] ?? 1) * u32(gpsEntry + 4);
      // Values over four bytes - the latitude itself - live elsewhere in the block.
      if (size > 4) {
        const at = u32(gpsEntry + 8);
        if (!fits(at, size)) return false;
        tiff.fill(0, at, at + size);
      }
    }
    tiff.fill(0, gps + 2, gps + 2 + gpsCount * 12);
    view.setUint16(gps, 0, little);
  }
  return true;
}

/** The bytes, less the ranges given. */
function without(bytes: Uint8Array, ranges: [start: number, end: number][]): Uint8Array {
  if (ranges.length === 0) return bytes;
  const kept: Uint8Array[] = [];
  let from = 0;
  for (const [start, end] of ranges) {
    kept.push(bytes.subarray(from, start));
    from = end;
  }
  kept.push(bytes.subarray(from));
  const out = new Uint8Array(kept.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of kept) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function stripJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const copy = bytes.slice();
  const removed: [number, number][] = [];

  let i = 2;
  while (i + 4 <= copy.length && copy[i] === 0xff) {
    const marker = copy[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    // From the start of the scan on, it is the picture itself.
    if (marker === 0xda || marker === 0xd9) break;
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }

    const end = i + 2 + ((copy[i + 2] << 8) | copy[i + 3]);
    if (end > copy.length || end < i + 4) break;
    const payload = i + 4;

    if (marker === 0xe1) {
      if (startsWith(copy, payload, EXIF_HEADER)) {
        if (!wipeGps(copy.subarray(payload + EXIF_HEADER.length, end))) removed.push([i, end]);
      } else if (XMP_HEADERS.some((header) => startsWith(copy, payload, header))) {
        removed.push([i, end]);
      }
    }
    i = end;
  }
  return without(copy, removed);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function stripPng(bytes: Uint8Array): Uint8Array {
  const copy = bytes.slice();
  const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
  const removed: [number, number][] = [];

  for (let i = 8; i + 12 <= copy.length; ) {
    const length = view.getUint32(i);
    const data = i + 8;
    const end = data + length + 4;
    if (end > copy.length) break;
    const type = String.fromCharCode(...copy.subarray(i + 4, i + 8));

    if (type === "eXIf") {
      const exif = copy.subarray(data, data + length);
      const tiff = startsWith(exif, 0, EXIF_HEADER) ? exif.subarray(EXIF_HEADER.length) : exif;
      if (wipeGps(tiff)) view.setUint32(data + length, crc32(copy.subarray(i + 4, data + length)));
      else removed.push([i, end]);
    } else if ((type === "iTXt" || type === "tEXt" || type === "zTXt") && startsWith(copy, data, PNG_XMP_KEYWORD)) {
      removed.push([i, end]);
    }

    if (type === "IEND") break;
    i = end;
  }
  return without(copy, removed);
}

function stripWebp(bytes: Uint8Array): Uint8Array {
  if (!startsWith(bytes, 0, ascii("RIFF")) || !startsWith(bytes, 8, ascii("WEBP"))) return bytes;
  const copy = bytes.slice();
  const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
  const removed: [number, number][] = [];
  let vp8x = -1;
  let flagsCleared = 0;

  for (let i = 12; i + 8 <= copy.length; ) {
    const fourcc = String.fromCharCode(...copy.subarray(i, i + 4));
    const size = view.getUint32(i + 4, true);
    const data = i + 8;
    if (data + size > copy.length) break;
    const end = Math.min(copy.length, data + size + (size % 2));

    if (fourcc === "VP8X") vp8x = i;
    if (fourcc === "EXIF") {
      const exif = copy.subarray(data, data + size);
      const tiff = startsWith(exif, 0, EXIF_HEADER) ? exif.subarray(EXIF_HEADER.length) : exif;
      if (!wipeGps(tiff)) {
        removed.push([i, end]);
        flagsCleared |= 0x08;
      }
    }
    if (fourcc === "XMP ") {
      removed.push([i, end]);
      flagsCleared |= 0x04;
    }
    i = end;
  }

  if (vp8x >= 0) copy[vp8x + 8] &= ~flagsCleared;
  const out = without(copy, removed);
  if (removed.length > 0) new DataView(out.buffer, out.byteOffset, out.byteLength).setUint32(4, out.length - 8, true);
  return out;
}

export function stripLocation(bytes: Uint8Array, type: ImageContentType): Uint8Array {
  switch (type) {
    case "image/jpeg":
      return stripJpeg(bytes);
    case "image/png":
      return stripPng(bytes);
    case "image/webp":
      return stripWebp(bytes);
  }
}
