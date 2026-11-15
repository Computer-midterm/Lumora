import { decodeWindow } from './frameMath';

export type Drawable = ImageBitmap | HTMLImageElement;

export interface FrameCacheOptions {
  /** URL for each sequence position. */
  urls: readonly string[];
  /** Maximum decoded frames kept around the current position (pinned frames are extra). */
  windowSize: number;
  /** Positions that stay decoded once ready (keyframes), so a near frame is always available. */
  pinned: readonly number[];
  fetchConcurrency: number;
  decodeConcurrency: number;
  /** Called whenever a frame finishes decoding. */
  onDecoded: (position: number) => void;
}

const canBitmap = typeof createImageBitmap === 'function';

/**
 * Fetches encoded frames progressively, decodes them off the main thread (createImageBitmap) and
 * keeps a bounded set decoded: a window around the current position plus pinned keyframes.
 * Encoded bytes (tens of KB per frame) are kept for every fetched frame so re-decoding never
 * re-downloads. Decoded bitmaps (width x height x 4 bytes: 8 MB each at 1920x1080) are what is bounded.
 */
export class FrameCache {
  private readonly opts: FrameCacheOptions;
  private readonly count: number;
  private readonly blobs: (Blob | undefined)[];
  private readonly decoded = new Map<number, Drawable>();
  private readonly fetching = new Set<number>();
  private readonly decoding = new Set<number>();
  private readonly failures = new Map<number, number>();
  private readonly allowed = new Set<number>();
  private readonly queue: number[] = [];
  private readonly pinned: Set<number>;
  private readonly abort = new AbortController();
  private focus = 0;
  private direction: 1 | -1 = 1;
  private retained = 0;
  private disposed = false;

  constructor(opts: FrameCacheOptions) {
    this.opts = opts;
    this.count = opts.urls.length;
    this.blobs = new Array(this.count);
    this.pinned = new Set(opts.pinned);
  }

  /** Provide an already-decoded frame (the poster <img>) so it never needs fetching or decoding. */
  seed(position: number, drawable: Drawable) {
    this.decoded.set(position, drawable);
    this.pinned.add(position);
  }

  has(position: number) {
    return this.decoded.has(position);
  }

  get(position: number) {
    return this.decoded.get(position);
  }

  /** Never evict this position (the frame currently on the canvas). */
  retain(position: number) {
    this.retained = position;
  }

  /** Allow these positions to be fetched, in the given priority order. */
  enable(order: readonly number[]) {
    for (const p of order) {
      if (p < 0 || p >= this.count || this.allowed.has(p)) continue;
      this.allowed.add(p);
      this.queue.push(p);
    }
    this.pump();
  }

  setFocus(position: number, direction: 1 | -1) {
    if (position === this.focus && direction === this.direction) return;
    this.focus = position;
    this.direction = direction;
    this.pump();
  }

  get stats() {
    let fetched = 0;
    for (const b of this.blobs) if (b) fetched++;
    return { fetched, decoded: this.decoded.size, fetching: this.fetching.size, decoding: this.decoding.size };
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    for (const d of this.decoded.values()) close(d);
    this.decoded.clear();
  }

  private pump() {
    if (this.disposed) return;
    this.pumpFetch();
    this.pumpDecode();
  }

  // --- fetching -----------------------------------------------------------------------------

  private nextFetch(): number {
    // 1) Allowed frames near where the visitor is, ahead first.
    const near = decodeWindow(this.focus, this.count, Math.max(12, this.opts.windowSize >> 1), this.direction);
    for (const p of near) if (this.wantsFetch(p)) return p;
    // 2) Otherwise the coarse-to-fine queue.
    while (this.queue.length && !this.wantsFetch(this.queue[0])) this.queue.shift();
    return this.queue.length ? this.queue[0] : -1;
  }

  private wantsFetch(p: number) {
    return this.allowed.has(p) && !this.blobs[p] && !this.fetching.has(p) && !this.decoded.has(p) && (this.failures.get(p) ?? 0) < 3;
  }

  private pumpFetch() {
    while (this.fetching.size < this.opts.fetchConcurrency) {
      const p = this.nextFetch();
      if (p < 0) return;
      this.fetching.add(p);
      const init: RequestInit & { priority?: 'high' | 'low' | 'auto' } = {
        signal: this.abort.signal,
        priority: Math.abs(p - this.focus) <= 8 ? 'high' : 'low',
      };
      fetch(this.opts.urls[p], init)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.blob();
        })
        .then((blob) => {
          this.blobs[p] = blob;
        })
        .catch(() => {
          if (this.disposed) return;
          // Keep the last good frame on screen; retry later (max 3 attempts per frame).
          this.failures.set(p, (this.failures.get(p) ?? 0) + 1);
          if ((this.failures.get(p) ?? 0) < 3) setTimeout(() => this.pump(), 1500);
        })
        .finally(() => {
          this.fetching.delete(p);
          this.pump();
        });
    }
  }

  // --- decoding -----------------------------------------------------------------------------

  private pumpDecode() {
    while (this.decoding.size < this.opts.decodeConcurrency) {
      const p = this.nextDecode();
      if (p < 0) break;
      this.decoding.add(p);
      decode(this.blobs[p] as Blob)
        .then((drawable) => {
          if (this.disposed) return close(drawable);
          this.decoded.set(p, drawable);
          this.evict();
          this.opts.onDecoded(p);
        })
        .catch(() => {
          // A frame that will not decode is dropped; neighbours cover it.
          this.blobs[p] = undefined;
          this.failures.set(p, 3);
        })
        .finally(() => {
          this.decoding.delete(p);
          this.pump();
        });
    }
  }

  private nextDecode(): number {
    const win = decodeWindow(this.focus, this.count, this.opts.windowSize, this.direction);
    for (const p of win) if (this.wantsDecode(p)) return p;
    for (const p of this.pinned) if (this.wantsDecode(p)) return p;
    return -1;
  }

  private wantsDecode(p: number) {
    return !!this.blobs[p] && !this.decoded.has(p) && !this.decoding.has(p);
  }

  private evict() {
    const keep = new Set(decodeWindow(this.focus, this.count, this.opts.windowSize, this.direction));
    let unpinned = 0;
    for (const p of this.decoded.keys()) if (!this.pinned.has(p)) unpinned++;
    if (unpinned <= this.opts.windowSize) return;
    const candidates = [...this.decoded.keys()]
      .filter((p) => !this.pinned.has(p) && p !== this.retained && !keep.has(p))
      .sort((a, b) => Math.abs(b - this.focus) - Math.abs(a - this.focus));
    for (const p of candidates) {
      if (unpinned <= this.opts.windowSize) break;
      const d = this.decoded.get(p);
      this.decoded.delete(p);
      if (d) close(d);
      unpinned--;
    }
  }
}

function close(d: Drawable) {
  if (!(d instanceof HTMLImageElement)) d.close();
}

async function decode(blob: Blob): Promise<Drawable> {
  if (canBitmap) {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Fall through to the <img> path (older Safari can reject some blob types).
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded image stays usable for drawImage after the URL is revoked.
    URL.revokeObjectURL(url);
  }
}
