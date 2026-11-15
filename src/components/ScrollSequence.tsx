import { useEffect, useRef, type CSSProperties } from 'react';
import { CHAPTERS, HERO } from '../content';
import { useMotion } from '../hooks/useMotion';
import { frameSrcSet, SEQUENCE, supportsAvif } from '../sequence/config';
import { SequenceEngine } from '../sequence/SequenceEngine';
import { ArrowDown, ArrowRight } from './Icons';

/** How much of the viewport width the artwork box spans (see sequence.css: landscape vs portrait). */
export const POSTER_SIZES = '(min-aspect-ratio: 5/4) 178vh, 150vw';

type Lined = CSSProperties & { '--i': number };

/**
 * The opening: a pinned stage that plays the supplied 201-frame sequence as you scroll, with the
 * hero copy and two short chapters passing over it.
 *
 * The markup (including frame 001 as a real <img>) is prerendered into index.html at build time, so
 * the first paint needs no JavaScript. With motion allowed, the engine then drives a canvas laid
 * exactly over that image.
 */
export function ScrollSequence() {
  const motion = useMotion();
  const track = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const poster = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!motion) return;
    let engine: SequenceEngine | null = null;
    let cancelled = false;
    supportsAvif().then((avif) => {
      const el = { track: track.current, end: end.current, stage: stage.current, media: media.current, canvas: canvas.current, poster: poster.current };
      if (cancelled || !el.track || !el.end || !el.stage || !el.media || !el.canvas || !el.poster) return;
      const format = avif ? 'avif' : 'webp';
      try {
        engine = new SequenceEngine(
          { track: el.track, end: el.end, stage: el.stage, media: el.media, canvas: el.canvas, poster: el.poster, counter: counter.current, meter: meter.current },
          {
            frames: SEQUENCE.frames,
            tiers: avif ? SEQUENCE.tiers : SEQUENCE.fallbackTiers,
            url: (i, width) => SEQUENCE.url(i, width, format),
            backdrops: SEQUENCE.backdrops,
            immersion: SEQUENCE.immersion,
          },
        );
      } catch {
        return; // No 2D canvas: the poster stays as a still frame.
      }
      engine.start();
      el.stage.dataset.format = format;
      (el.stage as HTMLElement & { __sequence?: SequenceEngine }).__sequence = engine;
    });
    return () => {
      cancelled = true;
      engine?.destroy();
      const s = stage.current as (HTMLElement & { __sequence?: SequenceEngine }) | null;
      if (s) delete s.__sequence;
      media.current?.style.removeProperty('transform');
      media.current?.style.removeProperty('--melt-k');
      track.current?.style.removeProperty('--stage-bg');
      canvas.current?.classList.remove('is-live');
    };
  }, [motion]);

  const first = SEQUENCE.frames[0];
  const [lineOne, lineTwo] = HERO.titleLines;
  const rest = lineTwo.slice(HERO.titleBreak.length);
  const emAt = rest.indexOf(HERO.titleEmphasis);

  return (
    <section className="seq" id="top" aria-labelledby="hero-title">
      <div className="seq__track" ref={track}>
        <div className="seq__end" ref={end} aria-hidden="true" />

        <div className="seq__stage" ref={stage} data-frame="1">
          <div className="seq__media" ref={media}>
            <picture>
              <source type="image/avif" srcSet={frameSrcSet(first, 'avif')} sizes={POSTER_SIZES} />
              <img
                ref={poster}
                id="seq-poster"
                className="seq__poster"
                src={SEQUENCE.url(first, 1920, 'webp')}
                srcSet={frameSrcSet(first, 'webp')}
                sizes={POSTER_SIZES}
                width={1920}
                height={1080}
                alt={HERO.posterAlt}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <canvas className="seq__canvas" ref={canvas} aria-hidden="true" />
          </div>
          <div className="seq__hud" aria-hidden="true">
            <span className="seq__count">
              <span ref={counter}>001</span>
              <span className="seq__count-total"> / {String(SEQUENCE.count).padStart(3, '0')}</span>
            </span>
            <span className="seq__meter">
              <span ref={meter} />
            </span>
          </div>
        </div>

        <div className="seq__steps">
          <div className="hero">
            <h1 id="hero-title" className="hero__title">
              <span className="hero__line">
                <span className="hero__line-inner" style={{ '--i': 0 } as Lined}>
                  {lineOne}
                </span>
              </span>{' '}
              <span className="hero__line">
                <span className="hero__line-inner" style={{ '--i': 1 } as Lined}>
                  {HERO.titleBreak}
                  <br className="hero__br" />
                  {rest.slice(0, emAt)}
                  <em>{HERO.titleEmphasis}</em>
                  {rest.slice(emAt + HERO.titleEmphasis.length)}
                </span>
              </span>
            </h1>
            <div className="hero__deck">
              <p className="status-line" data-enter="1">
                <span className="status-dot" aria-hidden="true" />
                <span className="status-line__text">{HERO.status}</span>
              </p>
              <p className="hero__sub" data-enter="2">
                {HERO.sub}
              </p>
              <div className="actions" data-enter="3">
                <a className="btn btn--primary" href={HERO.primary.href}>
                  {HERO.primary.label}
                  <span className="btn__icon" aria-hidden="true">
                    <ArrowRight />
                  </span>
                </a>
                <a className="link-quiet" href={HERO.secondary.href}>
                  {HERO.secondary.label}
                </a>
              </div>
            </div>
            <p className="hero__cue" aria-hidden="true">
              <ArrowDown /> {HERO.cue}
            </p>
          </div>

          {CHAPTERS.map((c) => (
            <div key={c.kicker} className="chapter" style={{ '--p': c.at } as CSSProperties}>
              <p className="kicker">{c.kicker}</p>
              <p className="chapter__line">{c.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
