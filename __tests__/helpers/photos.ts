/**
 * Photos built the way a phone writes them - camera data with a location and
 * an orientation - and read back with a reader of our own, independent of
 * the code under test. Shared by the tests that care where a photo was taken.
 */
export const LATITUDE = [51, 1, 30, 1, 1234, 100]; // 51° 30' 12.34"
export const LONGITUDE = [0, 1, 7, 1, 500, 100];

/** A little-endian TIFF block: orientation, and a GPS block holding a latitude and longitude. */
export function exifBlock({ gps = true, orientation = 6 } = {}): Uint8Array {
  const bytes: number[] = [];
  const u16 = (n: number) => bytes.push(n & 0xff, (n >> 8) & 0xff);
  const u32 = (n: number) => bytes.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff);

  const ifd0 = 8;
  const ifd0Entries = gps ? 2 : 1;
  const gpsIfd = ifd0 + 2 + ifd0Entries * 12 + 4;
  const gpsEntries = 4;
  const latData = gpsIfd + 2 + gpsEntries * 12 + 4;
  const lonData = latData + 24;

  bytes.push(0x49, 0x49); // "II"
  u16(42);
  u32(ifd0);
  u16(ifd0Entries);
  u16(0x0112); u16(3); u32(1); u16(orientation); u16(0); // Orientation, SHORT
  if (gps) {
    u16(0x8825); u16(4); u32(1); u32(gpsIfd); // GPSInfo pointer, LONG
  }
  u32(0);
  if (gps) {
    u16(gpsEntries);
    u16(0x0001); u16(2); u32(2); bytes.push(0x4e, 0, 0, 0); // GPSLatitudeRef "N"
    u16(0x0002); u16(5); u32(3); u32(latData); // GPSLatitude, 3 RATIONALs
    u16(0x0003); u16(2); u32(2); bytes.push(0x57, 0, 0, 0); // GPSLongitudeRef "W"
    u16(0x0004); u16(5); u32(3); u32(lonData); // GPSLongitude
    u32(0);
    for (const n of LATITUDE) u32(n);
    for (const n of LONGITUDE) u32(n);
  }
  return new Uint8Array(bytes);
}

/** What a reader finds in a TIFF block: its orientation, and any location. */
export function readExif(tiff: Uint8Array): { orientation: number | null; latitude: number[] | null; longitudeRef: string | null } {
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const le = tiff[0] === 0x49;
  const u16 = (at: number) => view.getUint16(at, le);
  const u32 = (at: number) => view.getUint32(at, le);
  const result = { orientation: null as number | null, latitude: null as number[] | null, longitudeRef: null as string | null };

  const ifd0 = u32(4);
  for (let i = 0; i < u16(ifd0); i += 1) {
    const at = ifd0 + 2 + i * 12;
    if (u16(at) === 0x0112) result.orientation = u16(at + 8);
    if (u16(at) === 0x8825) {
      const gps = u32(at + 8);
      for (let j = 0; j < u16(gps); j += 1) {
        const entry = gps + 2 + j * 12;
        if (u16(entry) === 0x0002) {
          const data = u32(entry + 8);
          result.latitude = Array.from({ length: 6 }, (_, k) => u32(data + k * 4));
        }
        if (u16(entry) === 0x0003) result.longitudeRef = String.fromCharCode(tiff[entry + 8]);
      }
    }
  }
  return result;
}

export const XMP = new TextEncoder().encode(
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:Description exif:GPSLatitude="51,30.2N" exif:GPSLongitude="0,7.08W"/></x:xmpmeta>',
);
export const has = (haystack: Uint8Array, needle: string) => Buffer.from(haystack).includes(Buffer.from(needle));

// JPEG ----------------------------------------------------------------------

export const segment = (marker: number, payload: Uint8Array) =>
  new Uint8Array([0xff, marker, ((payload.length + 2) >> 8) & 0xff, (payload.length + 2) & 0xff, ...payload]);
export const text = (s: string) => new TextEncoder().encode(s);
export const concat = (...parts: Uint8Array[]) => new Uint8Array(parts.flatMap((part) => Array.from(part)));

export const SCAN = concat(segment(0xda, new Uint8Array([1, 1, 0, 0, 63, 0])), new Uint8Array([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd9]));
export const QUANT = segment(0xdb, new Uint8Array(65).fill(7));

export function jpeg({ exif = exifBlock(), xmp = true } = {}) {
  return concat(
    new Uint8Array([0xff, 0xd8]),
    segment(0xe1, concat(text("Exif\0\0"), exif)),
    ...(xmp ? [segment(0xe1, concat(text("http://ns.adobe.com/xap/1.0/\0"), XMP))] : []),
    QUANT,
    SCAN,
  );
}

/** The TIFF block of a JPEG's EXIF segment, found by walking its segments. */
export function jpegExif(bytes: Uint8Array): Uint8Array | null {
  let i = 2;
  while (bytes[i] === 0xff && bytes[i + 1] !== 0xda) {
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const payload = bytes.subarray(i + 4, i + 2 + length);
    if (bytes[i + 1] === 0xe1 && Buffer.from(payload.subarray(0, 6)).equals(Buffer.from("Exif\0\0", "latin1"))) return payload.subarray(6);
    i += 2 + length;
  }
  return null;
}

