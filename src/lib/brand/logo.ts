/**
 * The Nyoki Handmade wordmark, the only place its files are named. The shop's
 * header, checkout, the admin's top bar and the brand board all draw it from
 * here, so a new logo is a change to this module and the files.
 *
 * The 2026 wordmark arrived on white and was cut out onto a clear ground,
 * each pixel taking its own ink - the script or HANDMADE - exactly, its
 * opacity from how far it was from white. It is set in the frame the first
 * logo had, the same size and shape, so the headers built around that one
 * kept their layout. The first logo is in docs/brand/old-logo/.
 *
 * New file names rather than the old ones overwritten: the image optimiser
 * and browsers cache by address, and would have gone on showing the old one.
 */

export type LogoFile = {
  /** Under public/. */
  src: string;
  width: number;
  height: number;
};

export const LOGO: LogoFile = { src: "/brand/nyoki-handmade-logo.png", width: 959, height: 600 };

/** For the admin's top bar and the brand board. */
export const LOGO_SMALL: LogoFile = { src: "/brand/nyoki-handmade-logo-small.png", width: 227, height: 142 };

/** In white on a sage ground, for the brand board. */
export const LOGO_ON_SAGE: LogoFile = { src: "/brand/nyoki-handmade-logo-on-sage.png", width: 207, height: 140 };
