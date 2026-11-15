import { FrameCache, type Drawable } from './FrameCache';
import {
  approach,
  coarseToFineOrder,
  frameFromProgress,
  immersionTransform,
  nearestAvailable,
  nearestNotPast,
  progressFromScroll,
  smoothstep,
  type Melt,
} from './frameMath';
import { planTiers, type Tier, type TierPlan } from './tiers';

export interface SequenceElements {
  /** The tall scroll track; its scroll distance is measured from `end`. */
  track: HTMLElement;
  /** Marks where progress reaches 1 (positioned by CSS inside the track). */
  end: HTMLElement;
  stage: HTMLElement;
  media: HTMLElement;
  canvas: HTMLCanvasElement;
  poster: HTMLImageElement;
  counter?: HTMLElement | null;
  meter?: HTMLElement | null;
}

export interface SequenceConfig {
  /** Source frame numbers (0-based) shown in order. */
  frames: readonly number[];
  /** Available resolutions for this browser (AVIF tiers, or the WebP fallback tiers). */
  tiers: readonly Tier[];
  url: (sourceIndex: number, width: number) => string;
  /** Backdrop colour per source frame. */
  backdrops: readonly string[];
  /** Progress range over which the image glides from its composed position to full-bleed. */
  immersion: readonly [number, number];
}

type Connection = { saveData?: boolean; effectiveType?: string };
const connection = () => (navigator as Navigator & { connection?: Connection }).connection;

/** How long scrolling must be still before the resting frame is sharpened. */
const REST_DELAY_MS = 180;

/**
 * Drives the canvas from scroll position.
 *  - progress = how far the track has scrolled (0 at the top, 1 at `end`), smoothed with a
 *    frame-rate independent ease and snapped exactly onto the target, so the top is always frame 001;
 *  - one resolution ("scrub tier") is chosen per device and streamed; decoded frames are bounded by a
 *    memory budget around the current position;
 *  - the canvas only redraws when the shown frame changes and never clears without drawing, so a
 *    frame that is not ready holds the nearest decoded frame instead of flashing;
 *  - when scrolling rests, that one frame is redrawn from a sharper file ("rest tier");
 *  - rAF runs only while the smoothed value is still moving.
 */
export class SequenceEngine {
  private readonly el: SequenceElements;
  private readonly cfg: SequenceConfig;
  private readonly n: number;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cleanups: (() => void)[] = [];
  private cache!: FrameCache;
  private plan!: TierPlan;

  private trackTop = 0;
  private distance = 1;
  private stageW = 0;
  private stageH = 0;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private melt: Melt = { left: 0, right: 0, top: 0, bottom: 0 };
  private maxScale = 1;

  private target = 0;
  private current = 0;
  private direction: 1 | -1 = 1;
  private drawn = -1;
  private drawnBackdrop = '';
  private lastTransform = '';
  private lastMeltK = '';
  private lastCounter = '';
  private raf = 0;
  private lastTime = 0;
  private initialised = false;
  private fineEnabled = false;
  /** Until the visitor scrolls themselves, jumps (scroll restoration, a #hash on load) snap instead of easing. */
  private interacted = false;
  private destroyed = false;

  private restTimer = 0;
  private restToken = 0;
  private restBitmap: ImageBitmap | null = null;
  private restPosition = -1;
  private restPending = -1;

  constructor(el: SequenceElements, cfg: SequenceConfig) {
    this.el = el;
    this.cfg = cfg;
    this.n = cfg.frames.length;
    const ctx = el.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
  }

  start() {
    this.measure();
    const c = connection();
    this.plan = planTiers(this.cfg.tiers, {
      boxCssWidth: this.box.w,
      dpr: window.devicePixelRatio || 1,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      constrainedNetwork: !!c && (c.saveData === true || /(^|-)2g$|^3g$/.test(c.effectiveType ?? '')),
    });
    const width = this.plan.scrub.width;
    this.cache = new FrameCache({
      urls: this.cfg.frames.map((f) => this.cfg.url(f, width)),
      windowSize: this.plan.windowSize,
      pinned: [],
      fetchConcurrency: 6,
      decodeConcurrency: 3,
      onDecoded: (p) => this.onDecoded(p),
    });
    this.el.stage.dataset.tier = String(width);
    this.sizeCanvas();

    this.target = this.readProgress();
    this.current = this.target;

    // Frame 001 is the poster <img>; adopt it as the first frame so the top never waits on a fetch.
    const seedPoster = () => {
      if (this.destroyed || !this.el.poster.naturalWidth) return;
      if (this.cfg.frames[0] === 0) this.cache.seed(0, this.el.poster);
      this.requestTick();
    };
    if (this.el.poster.complete) seedPoster();
    else this.listen(this.el.poster, 'load', seedPoster);

    this.listen(window, 'scroll', () => this.requestTick(), { passive: true });
    this.listen(window, 'resize', () => this.onResize());
    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(this.el.stage);
    ro.observe(this.el.track);
    this.cleanups.push(() => ro.disconnect());
    this.listen(this.el.canvas, 'contextrestored', () => this.redraw());
    if (document.fonts) document.fonts.ready.then(() => this.onResize()).catch(() => {});

    // Loading plan: keyframes once the page has loaded and the main thread is idle; the rest on first
    // interaction (or shortly after, unless the network is constrained). Loading mid-sequence starts everything.
    const keyframes = coarseToFineOrder(this.n, [8]);
    const startKeyframes = () => this.cache.enable(keyframes);
    const startFine = () => this.enableFine();
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const) {
      this.listen(window, type, () => (this.interacted = true), { passive: true, once: true });
    }
    if (this.target > 0) {
      startKeyframes();
      startFine();
    } else {
      onLoadIdle(startKeyframes, this.cleanups);
      for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'] as const) {
        this.listen(window, type, startFine, { passive: true, once: true });
      }
      if (this.plan.stride === 1) {
        const t = window.setTimeout(startFine, 4000);
        this.cleanups.push(() => clearTimeout(t));
      }
    }
    this.requestTick();
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cancelRest();
    this.restBitmap?.close();
    for (const c of this.cleanups.splice(0)) c();
    this.cache?.dispose();
  }

  /** Source frames (0-based) in play order. */
  get order() {
    return this.cfg.frames;
  }

  /** For tests and diagnostics. */
  get state() {
    return {
      target: this.target,
      current: this.current,
      drawn: this.drawn,
      frames: this.n,
      tier: this.plan.scrub.width,
      restTier: this.plan.rest?.width ?? null,
      restShown: this.restPosition === this.drawn && this.restBitmap ? this.restBitmap.width : null,
      window: this.plan.windowSize,
      canvas: this.el.canvas.width,
      ...this.cache.stats,
    };
  }

  // ----------------------------------------------------------------------------------------------

  private enableFine() {
    if (this.fineEnabled) return;
    this.fineEnabled = true;
    // Constrained network: every second frame only; scrubbing still reads as continuous.
    this.cache.enable(coarseToFineOrder(this.n, this.plan.stride === 2 ? [8, 4, 2] : [8, 4, 2, 1]));
  }

  private listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) {
    target.addEventListener(type, fn, opts);
    this.cleanups.push(() => target.removeEventListener(type, fn, opts));
  }

  private readProgress() {
    return progressFromScroll(window.scrollY, this.trackTop, this.distance);
  }

  private measure() {
    const r = this.el.track.getBoundingClientRect();
    this.trackTop = r.top + window.scrollY;
    this.distance = Math.max(1, this.el.end.offsetTop);
    this.stageW = this.el.stage.clientWidth;
    this.stageH = this.el.stage.clientHeight;
    const m = this.el.media;
    this.box = { x: m.offsetLeft, y: m.offsetTop, w: m.offsetWidth, h: m.offsetHeight };
    const cs = getComputedStyle(m);
    const num = (name: string, fallback: number) => {
      const v = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    this.melt = { left: num('--melt-l', 0), right: num('--melt-r', 0), top: num('--melt-t', 0), bottom: num('--melt-b', 0) };
    this.maxScale = num('--immerse-max', 1.2);
  }

  private sizeCanvas() {
    const w = this.plan.canvasWidth;
    const h = Math.max(2, Math.round((w * 9) / 16));
    const c = this.el.canvas;
    if (c.width !== w || c.height !== h) {
      c.width = w; // clears the canvas: redraw synchronously below, before the browser paints
      c.height = h;
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.redraw();
    }
  }

  private onResize() {
    if (this.destroyed) return;
    this.measure();
    this.lastTransform = '';
    this.requestTick();
  }

  private onDecoded(position: number) {
    // Redraw if the new frame is closer to where we should be than what is on screen.
    const want = frameFromProgress(this.current, this.n);
    if (this.drawn < 0 || Math.abs(position - want) < Math.abs(this.drawn - want)) this.requestTick();
  }

  private requestTick() {
    if (this.destroyed) return;
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(now: number) {
    this.raf = 0;
    const dt = this.lastTime ? now - this.lastTime : 16.7;
    this.lastTime = now;

    const target = this.readProgress();
    if (target !== this.target) this.direction = target > this.target ? 1 : -1;
    this.target = target;
    this.current = this.initialised && this.interacted ? approach(this.current, target, dt) : target;
    this.initialised = true;

    const want = frameFromProgress(this.current, this.n);
    this.cache.setFocus(want, this.direction);
    const has = (i: number) => this.cache.has(i);
    // Prefer a frame that is not past the target in the direction of travel; hold what is on screen
    // rather than jump ahead and come back. Only with nothing drawn yet do we accept any nearest frame.
    let show = nearestNotPast(want, this.n, has, this.direction);
    if (show < 0) show = this.drawn >= 0 ? this.drawn : nearestAvailable(want, this.n, has, this.direction);
    // While catching up, never step against the scroll direction either.
    if (show >= 0 && this.drawn >= 0) {
      if (this.direction === 1 && show < this.drawn && want >= this.drawn) show = this.drawn;
      if (this.direction === -1 && show > this.drawn && want <= this.drawn) show = this.drawn;
    }
    if (show >= 0 && show !== this.drawn) this.draw(show);

    this.applyImmersion();
    if (this.el.meter) this.el.meter.style.transform = `scaleX(${this.current.toFixed(4)})`;

    if (this.current !== this.target) {
      this.cancelRest();
      this.raf = requestAnimationFrame((t) => this.tick(t));
    } else {
      this.lastTime = 0;
      this.scheduleRest(want);
    }
  }

  private draw(position: number) {
    const d = this.cache.get(position);
    if (!d) return;
    // Coming back to the frame that was sharpened at rest: keep showing the sharp version.
    this.paint(position === this.restPosition && this.restBitmap ? this.restBitmap : d);
    this.drawn = position;
    this.cache.retain(position);

    const src = this.cfg.frames[position];
    const bg = this.cfg.backdrops[src];
    if (bg && bg !== this.drawnBackdrop) {
      this.drawnBackdrop = bg;
      this.el.track.style.setProperty('--stage-bg', bg);
    }
    this.el.stage.dataset.frame = String(src + 1);
    const label = String(src + 1).padStart(3, '0');
    if (this.el.counter && label !== this.lastCounter) {
      this.lastCounter = label;
      this.el.counter.textContent = label;
    }
  }

  private redraw() {
    if (this.drawn < 0) return;
    const d = this.restPosition === this.drawn && this.restBitmap ? this.restBitmap : this.cache.get(this.drawn);
    if (d) this.paint(d);
  }

  private paint(d: Drawable) {
    const c = this.el.canvas;
    this.ctx.drawImage(d, 0, 0, c.width, c.height);
    if (!c.classList.contains('is-live')) c.classList.add('is-live');
  }

  // --- rest: sharpen the frame the visitor has stopped on ---------------------------------------

  private cancelRest() {
    clearTimeout(this.restTimer);
    this.restTimer = 0;
    this.restToken++;
    this.restPending = -1;
  }

  /** Called on every settled tick. `want` is the exact frame for the resting position. */
  private scheduleRest(want: number) {
    const rest = this.plan.rest;
    // Only the exact frame is worth sharpening: a stand-in (still decoding) is about to be replaced.
    if (!rest || this.drawn < 0 || this.drawn !== want) return;
    if (this.restPosition === this.drawn && this.restBitmap) return;
    if (this.restPending === this.drawn) return; // already waiting or in flight for this frame
    this.cancelRest();
    const token = this.restToken;
    const position = this.drawn;
    this.restPending = position;
    this.restTimer = window.setTimeout(async () => {
      this.restTimer = 0;
      try {
        // Not aborted if the visitor moves on: one small frame, and it lands in the HTTP cache.
        const res = await fetch(this.cfg.url(this.cfg.frames[position], rest.width));
        if (!res.ok) return;
        const bitmap = await createImageBitmap(await res.blob());
        // Only swap if the visitor is still resting on this exact frame.
        if (this.destroyed || token !== this.restToken || this.drawn !== position) return bitmap.close();
        this.restBitmap?.close();
        this.restBitmap = bitmap;
        this.restPosition = position;
        this.paint(bitmap);
      } catch {
        // Keep the scrub-tier frame: it is already on screen.
      } finally {
        if (token === this.restToken) this.restPending = -1;
      }
    }, REST_DELAY_MS);
  }

  private applyImmersion() {
    const [a, b] = this.cfg.immersion;
    const e = smoothstep(a, b, this.current);
    const t = immersionTransform({ w: this.stageW, h: this.stageH }, this.box, this.melt, this.maxScale, e);
    const css = e <= 0 ? 'none' : `translate3d(${t.tx.toFixed(2)}px, ${t.ty.toFixed(2)}px, 0) scale(${t.scale.toFixed(4)})`;
    if (css !== this.lastTransform) {
      this.lastTransform = css;
      this.el.media.style.transform = css;
    }
    const k = t.meltK.toFixed(3);
    if (k !== this.lastMeltK) {
      this.lastMeltK = k;
      this.el.media.style.setProperty('--melt-k', k);
    }
  }
}

function onLoadIdle(fn: () => void, cleanups: (() => void)[]) {
  const idle = () => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(fn, { timeout: 1500 });
      cleanups.push(() => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id));
    } else {
      const id = window.setTimeout(fn, 300);
      cleanups.push(() => clearTimeout(id));
    }
  };
  if (document.readyState === 'complete') idle();
  else {
    window.addEventListener('load', idle, { once: true });
    cleanups.push(() => window.removeEventListener('load', idle));
  }
}
