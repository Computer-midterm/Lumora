// Pure helpers for the scroll-driven frame sequence. No DOM access, so they are unit-tested
// directly with `node --test` (see tests/unit/frameMath.test.ts).

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/**
 * Scroll position -> sequence progress in [0, 1].
 * 0 while the top of the track is at or below the top of the viewport; 1 once `distance` px have scrolled.
 */
export function progressFromScroll(scrollY: number, trackTop: number, distance: number): number {
  if (!(distance > 0)) return 0;
  return clamp((scrollY - trackTop) / distance, 0, 1);
}

/** Progress in [0, 1] -> frame index in [0, count - 1]. Progress 0 is always exactly frame 0. */
export function frameFromProgress(progress: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(clamp(progress, 0, 1) * (count - 1));
}

/**
 * Frame-rate independent exponential approach toward `target`.
 * `rate` is per second (9 ≈ a 0.14 lerp per 60 Hz frame). Snaps when within `epsilon`,
 * so the value lands exactly on the target (frame 0 at the top is exact, never "almost").
 */
export function approach(current: number, target: number, dtMs: number, rate = 9, epsilon = 0.0005): number {
  const diff = target - current;
  if (Math.abs(diff) <= epsilon) return target;
  const k = 1 - Math.exp((-rate * Math.max(0, Math.min(dtMs, 100))) / 1000);
  const next = current + diff * k;
  return Math.abs(target - next) <= epsilon ? target : next;
}

/** Hermite smoothstep of x between edges a and b, in [0, 1]. */
export function smoothstep(a: number, b: number, x: number): number {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Coarse-to-fine fetch order: frame 0 and the last frame, then every 8th, every 4th, every 2nd, then the rest.
 * A visitor who scrolls early always has a nearby valid frame; detail fills in progressively.
 * Indices in `skip` are left out entirely.
 */
export function coarseToFineOrder(count: number, strides: number[] = [8, 4, 2, 1], skip: ReadonlySet<number> = new Set()): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  const push = (i: number) => {
    if (i < 0 || i >= count || seen.has(i) || skip.has(i)) return;
    seen.add(i);
    order.push(i);
  };
  push(0);
  push(count - 1);
  for (const stride of strides) for (let i = 0; i < count; i += stride) push(i);
  return order;
}

/**
 * Nearest index (to `target`) for which `has(i)` is true, searching outward. Ties prefer the frame on
 * the side we are coming from (`direction` = +1 scrolling down, -1 up), which reads as "holding" the
 * last frame instead of jumping ahead. Returns -1 when nothing is available.
 */
export function nearestAvailable(target: number, count: number, has: (i: number) => boolean, direction: 1 | -1 = 1): number {
  if (target >= 0 && target < count && has(target)) return target;
  for (let d = 1; d < count; d++) {
    const behind = target - d * direction;
    const ahead = target + d * direction;
    if (behind >= 0 && behind < count && has(behind)) return behind;
    if (ahead >= 0 && ahead < count && has(ahead)) return ahead;
  }
  return -1;
}

/**
 * Nearest available index that is NOT past `target` in the direction of travel: the target itself,
 * else the closest one we have already passed (target - 1, - 2, ... when scrolling down). Showing a
 * frame from beyond the target and then stepping back to the right one would read as a flicker.
 * Returns -1 when nothing on that side is available.
 */
export function nearestNotPast(target: number, count: number, has: (i: number) => boolean, direction: 1 | -1): number {
  for (let i = target; i >= 0 && i < count; i -= direction) if (has(i)) return i;
  return -1;
}

/** Frame indices to keep decoded around the current position, nearest first, biased in the scroll direction. */
export function decodeWindow(center: number, count: number, size: number, direction: 1 | -1): number[] {
  const out: number[] = [];
  const ahead = Math.ceil(size * 0.65);
  const behind = size - ahead;
  out.push(center);
  for (let d = 1; out.length < size + 1 && (d <= ahead || d <= behind); d++) {
    if (d <= ahead) out.push(center + d * direction);
    if (d <= behind) out.push(center - d * direction);
  }
  return out.filter((i) => i >= 0 && i < count);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fractions of the box width/height that are melted (transparent edge) on each side. */
export interface Melt {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Where the media box ends up when "immersed".
 *  - If the whole frame can cover the stage within `maxScale`, it does: centred, edges un-melted
 *    (`meltEnd` = 0). No zoom beyond what covering needs, so the frame is shown as it was shot.
 *  - Otherwise (very wide or portrait stages) the melted edges stay (`meltEnd` = 1) and the opaque
 *    area is centred and scaled up to `maxScale`.
 * `t` in [0, 1] interpolates from the composed position (identity) to that end state.
 */
export function immersionTransform(stage: { w: number; h: number }, box: Rect, melt: Melt, maxScale: number, t: number) {
  const cover = Math.max(stage.w / Math.max(1, box.w), stage.h / Math.max(1, box.h));
  const covers = cover <= maxScale;
  const k = covers ? 0 : 1;
  const m = { left: melt.left * k, right: melt.right * k, top: melt.top * k, bottom: melt.bottom * k };
  const opaqueW = box.w * (1 - m.left - m.right);
  const opaqueH = box.h * (1 - m.top - m.bottom);
  const need = Math.max(stage.w / Math.max(1, opaqueW), stage.h / Math.max(1, opaqueH));
  const scale = Math.min(maxScale, Math.max(1, need));
  // Centre of the opaque area, in stage coordinates, before transforming.
  const ox = box.x + box.w * (m.left + (1 - m.left - m.right) / 2);
  const oy = box.y + box.h * (m.top + (1 - m.top - m.bottom) / 2);
  // transform-origin is the box centre; the opaque centre moves by (ox - cx) * scale relative to it.
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const targetX = stage.w / 2 - (cx + (ox - cx) * scale);
  const targetY = stage.h / 2 - (cy + (oy - cy) * scale);
  const e = clamp(t, 0, 1);
  return { tx: targetX * e, ty: targetY * e, scale: 1 + (scale - 1) * e, meltK: 1 - e * (1 - k) };
}
