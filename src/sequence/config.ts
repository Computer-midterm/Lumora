import manifest from './manifest.json';
import type { Tier } from './tiers';

/**
 * Source frames left out of playback, as 1-based frame numbers. Order is never changed.
 *
 * Frames 005-007 of the supplied footage are colour-inverted (dark grey backdrop, white figure).
 * Scrubbed, they read as a dark flash the moment a visitor starts scrolling, which conflicts with
 * the "never flash" requirement, so they are skipped pending the owner's decision. The encoded
 * files are still generated. To play all 201 frames exactly as supplied, set this to [].
 */
export const SKIPPED_FRAMES: readonly number[] = [5, 6, 7];

const skip = new Set(SKIPPED_FRAMES.map((n) => n - 1));

export type FrameFormat = 'avif' | 'webp';

export const SEQUENCE = {
  count: manifest.count,
  /** Every width is 16:9. */
  aspect: manifest.aspect[0] / manifest.aspect[1],
  /** AVIF widths (all of them) and the WebP widths kept for browsers without AVIF. */
  tiers: manifest.tiers as readonly Tier[],
  fallbackTiers: manifest.fallback as readonly Tier[],
  backdrops: manifest.backdrops as readonly string[],
  /** 0-based source frames in play order. */
  frames: Array.from({ length: manifest.count }, (_, i) => i).filter((i) => !skip.has(i)),
  url: (i: number, width: number, format: FrameFormat = 'avif') =>
    `${import.meta.env.BASE_URL}sequence/w${width}/f${String(i + 1).padStart(3, '0')}.${format}`,
  /** Progress window in which the image glides from its composed position to full-bleed. */
  immersion: [0.5, 0.68] as const,
};

/** `srcset` for a still frame (poster, closing image). */
export function frameSrcSet(i: number, format: FrameFormat) {
  const tiers = format === 'avif' ? SEQUENCE.tiers : SEQUENCE.fallbackTiers;
  return tiers.map((t) => `${SEQUENCE.url(i, t.width, format)} ${t.width}w`).join(', ');
}

let avifSupport: Promise<boolean> | null = null;

/** Can this browser decode AVIF? (Decodes a 1x1 image once; the answer is cached.) */
export function supportsAvif(): Promise<boolean> {
  avifSupport ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src =
      'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAAA+gABAAAAAAAAABwAAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABhdjAxAAAAAA5waXRtAAAAAAABAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAkbWRhdBIACgc4AAaQENBpMg8cQmLk6aaaYWNgAJA1jjU=';
  });
  return avifSupport;
}
