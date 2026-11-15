import { useEffect, useRef, type CSSProperties } from 'react';
import { APPROACH } from '../content';
import { useMotion } from '../hooks/useMotion';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The tangle: one continuous line that starts as a knot and calms into a straight run, echoing the
 * ink-line artwork. Generated (deterministically) rather than hand-drawn so it stays one clean path.
 */
function tanglePath(turns: number, radius: number, phase: number): string {
  const pts: [number, number][] = [];
  const N = 150;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const calm = Math.pow(1 - t, 1.5); // amplitude decays to zero: the line straightens
    const a = t * turns * Math.PI * 2 + phase;
    const cx = 92 + t * 188;
    const x = cx + Math.cos(a) * radius * 1.2 * calm + Math.cos(a * 2.3 + 1) * radius * 0.22 * calm;
    const y = 100 + Math.sin(a * 1.27 + phase * 0.5) * radius * calm + Math.sin(a * 0.41) * radius * 0.28 * calm;
    pts.push([x, y]);
  }
  // Catmull-Rom -> cubic Bezier, for a smooth single stroke.
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

const TANGLE_MAIN = tanglePath(8.5, 84, 0.4);
const TANGLE_GHOST = tanglePath(6, 90, 2.1);

/**
 * Planned workflow as one line: a tangle (the idea) that straightens into five checkpoints, with
 * the test/repair loop marked and project memory running underneath. The line draws as you scroll
 * past; without motion it is simply drawn.
 */
export function Approach() {
  const motion = useMotion();
  const flow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = flow.current;
    if (!el || !motion) return;
    let raf = 0;
    let last = '';
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the flow's top reaches 85% of the viewport, 1 when its middle reaches 45%.
      const startY = vh * 0.85;
      const endY = vh * 0.45 - r.height * 0.5;
      const p = Math.min(1, Math.max(0, (startY - r.top) / Math.max(1, startY - endY)));
      const v = p.toFixed(3);
      if (v !== last) {
        last = v;
        el.style.setProperty('--draw', v);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    // Only track while the section is near the viewport.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          onScroll();
        } else {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      },
      { rootMargin: '20% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      el.style.removeProperty('--draw');
    };
  }, [motion]);

  const steps = APPROACH.steps;
  return (
    <section className="approach section" id="approach" aria-labelledby="approach-title">
      <div className="wrap">
        <div className="section-head">
          <p className="label">
            {APPROACH.label}
            <span className="badge">{APPROACH.badge}</span>
          </p>
          <h2 id="approach-title" className="display display--xl">
            {APPROACH.title[0]} <span className="display__soft">{APPROACH.title[1]}</span>
          </h2>
          <p className="lede">{APPROACH.lede}</p>
        </div>

        <div className="flow" ref={flow}>
          <div className="flow__start">
            <svg className="flow__tangle" viewBox="0 0 280 200" aria-hidden="true" focusable="false">
              <path className="flow__tangle-ghost" d={TANGLE_GHOST} pathLength={1} />
              <path className="flow__tangle-main" d={TANGLE_MAIN} pathLength={1} />
            </svg>
            <p className="flow__start-label">{APPROACH.start}</p>
          </div>

          <span className="flow__rail" aria-hidden="true">
            <span className="flow__rail-fill" />
          </span>

          <ol className="flow__steps" role="list">
            {steps.map((s, i) => (
              <li key={s.title} className="flow__step" style={{ '--at': (i + 0.5) / steps.length } as CSSProperties}>
                <span className="flow__node" aria-hidden="true" />
                <span className="index">{pad(i + 1)}</span>
                <h3 className="flow__title">{s.title}</h3>
                <p className="flow__body">{s.body}</p>
              </li>
            ))}
          </ol>

          <p className="flow__loop">
            <span className="flow__loop-arc" aria-hidden="true" />
            <span className="flow__loop-text">{APPROACH.loop}</span>
          </p>

          <div className="flow__memory">
            <span className="flow__memory-line" aria-hidden="true" />
            <p>
              <strong>{APPROACH.memory.title}</strong> {APPROACH.memory.body}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
