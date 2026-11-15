import { CLOSING, FOOTER, STATUS, STATUS_LABEL, type Status } from '../content';
import { frameSrcSet, SEQUENCE } from '../sequence/config';
import { ArrowRight, ArrowUp, Mark } from './Icons';

function Chip({ status }: { status: Status }) {
  return (
    <span className={`chip chip--${status}`}>
      <span className="chip__mark" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Honest development status: deliberately compact, secondary to the sections above it. */
export function StatusBand() {
  return (
    <section className="status" id="status" aria-labelledby="status-title">
      <div className="wrap status__grid">
        <div className="status__head">
          <p className="label">
            {STATUS.label}
            <span className="status__asof">{STATUS.asOf}</span>
          </p>
          <h2 id="status-title" className="display status__title">
            {STATUS.title}
          </h2>
        </div>
        <ul className="status__rows" role="list">
          {STATUS.rows.map((r) => (
            <li key={r.status} className="status__row">
              <Chip status={r.status} />
              <p className="status__item">{r.item}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Closing still: one frame of the sequence (the clean wire figure), shown as a still. */
const CLOSING_FRAME = 96;
const CLOSING_SIZES = '(max-width: 900px) 150vw, 100vw';

export function Closing() {
  const main = CLOSING.contact ?? CLOSING.primary;
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="closing__media">
        <picture>
          <source type="image/avif" srcSet={frameSrcSet(CLOSING_FRAME - 1, 'avif')} sizes={CLOSING_SIZES} />
          <img
            src={SEQUENCE.url(CLOSING_FRAME - 1, 1920, 'webp')}
            srcSet={frameSrcSet(CLOSING_FRAME - 1, 'webp')}
            sizes={CLOSING_SIZES}
            alt={CLOSING.stillAlt}
            width={1920}
            height={1080}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <div className="wrap closing__inner">
        <h2 id="closing-title" className="display closing__title">
          {CLOSING.title[0]} <em>{CLOSING.title[1]}</em>
        </h2>
        <p className="lede closing__body">{CLOSING.body}</p>
        <div className="actions">
          <a className="btn btn--primary" href={main.href}>
            {main.label}
            <span className="btn__icon" aria-hidden="true">
              <ArrowRight />
            </span>
          </a>
          <a className="link-quiet" href={CLOSING.secondary.href}>
            {CLOSING.secondary.label}
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <p className="site-footer__brand">
          <Mark size={18} />
          Lumora
        </p>
        <p className="site-footer__note">{FOOTER.note}</p>
        <a className="link-quiet site-footer__top" href="#top">
          <ArrowUp /> Back to top
        </a>
      </div>
    </footer>
  );
}
