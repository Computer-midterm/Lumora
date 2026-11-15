import { PROBLEM } from '../content';
import { useInView } from '../hooks/useInView';

type Finding = (typeof PROBLEM.demo.findings)[number];

/** A small marker pinned to the part of the illustration a finding refers to. */
function Mark({ finding }: { finding: Finding }) {
  return (
    <span className="wire__mark" aria-hidden="true">
      {finding.id}
    </span>
  );
}

/**
 * The same illustrative booking screen, drawn twice: as it is demoed, and as it turns out when
 * someone actually uses it. Pure illustration (labelled as such in the caption); no real app.
 */
function Wire({ checked }: { checked: boolean }) {
  const { app, findings } = PROBLEM.demo;
  const at = (where: Finding['at']) => (checked ? findings.find((f) => f.at === where) : undefined);
  const slot = at('slot');
  const field = at('field');
  const button = at('button');
  const done = at('done');
  return (
    <div className={`wire ${checked ? 'wire--checked' : ''}`} aria-hidden="true">
      <div className="wire__bar">
        <span className="wire__title">{app.name}</span>
        <span className="wire__date">{app.date}</span>
      </div>
      <div className="wire__slots">
        {app.slots.map((s, i) => (
          <span key={s} className={`wire__slot ${i === app.picked ? 'is-picked' : ''} ${slot && i === app.picked ? 'is-flagged' : ''}`}>
            {s}
            {slot && i === app.picked && <Mark finding={slot} />}
          </span>
        ))}
      </div>
      <span className={`wire__field ${field ? 'is-flagged' : ''}`}>
        {app.field}
        {field && <Mark finding={field} />}
      </span>
      <span className={`wire__button ${button ? 'is-flagged' : ''}`}>
        {app.button}
        {button && <Mark finding={button} />}
      </span>
      <span className={`wire__done ${done ? 'is-flagged' : ''}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.4l2.2 2.2 4.8-5" />
        </svg>
        {app.done}
        {done && <Mark finding={done} />}
      </span>
    </div>
  );
}

export function Problem() {
  const { demo } = PROBLEM;
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  return (
    <section className="problem" aria-labelledby="problem-title">
      <div className="wrap problem__content" id="problem">
        <div className="section-head">
          <p className="label label--night">{PROBLEM.label}</p>
          <h2 id="problem-title" className="display display--xl">
            {PROBLEM.title[0]} <span className="display__soft">{PROBLEM.title[1]}</span>
          </h2>
          <p className="lede lede--night">{PROBLEM.lede}</p>
        </div>

        <figure className={`demo ${seen ? 'is-seen' : ''}`} ref={ref}>
          <div className="demo__pane">
            <p className="demo__tag">{demo.surface.tag}</p>
            <Wire checked={false} />
            <p className="demo__note">{demo.surface.note}</p>
          </div>
          <div className="demo__pane demo__pane--checked">
            <p className="demo__tag demo__tag--signal">{demo.checked.tag}</p>
            <Wire checked />
            <p className="demo__note">{demo.checked.note}</p>
          </div>
          <ol className="demo__findings" role="list">
            {demo.findings.map((f) => (
              <li key={f.id} className="finding">
                <span className="finding__id" aria-hidden="true">
                  {f.id}
                </span>
                <h3 className="finding__title">{f.title}</h3>
                <p className="finding__body">{f.body}</p>
              </li>
            ))}
          </ol>
          <figcaption className="demo__caption">{demo.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
