import { useRef, useState, type JSX, type KeyboardEvent } from 'react';
import { STATE_LABEL, WORKSPACE, type CheckState } from '../content';

type TabId = (typeof WORKSPACE.tabs)[number]['id'];

function StateChip({ state }: { state: CheckState }) {
  return (
    <span className={`state state--${state}`}>
      <span className="state__mark" aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  );
}

function Tick({ ok }: { ok: boolean }) {
  return (
    <svg className={`tick ${ok ? '' : 'tick--fail'}`} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ok ? <path d="M3 7.4l2.6 2.6L11 4.4" /> : <path d="M3.6 3.6l6.8 6.8M10.4 3.6l-6.8 6.8" />}
    </svg>
  );
}

function Contract() {
  const c = WORKSPACE.contract;
  return (
    <>
      <header className="sheet__head">
        <h3 className="sheet__title">{c.head}</h3>
        <span className="sheet__state">{c.state}</span>
      </header>
      <ol className="reqs" role="list">
        {c.items.map((r) => (
          <li key={r.id} className="req">
            <span className="req__id">{r.id}</span>
            <p className="req__text">{r.text}</p>
            <p className="req__accept">
              <span className="req__accept-label">Done when</span> {r.accept}
            </p>
          </li>
        ))}
      </ol>
      <p className="sheet__foot">{c.foot}</p>
    </>
  );
}

function Run() {
  const r = WORKSPACE.run;
  return (
    <>
      <header className="sheet__head">
        <h3 className="sheet__title">{r.head}</h3>
      </header>
      <ul className="lanes" role="list">
        {r.testers.map((t) => {
          const failed = t.result.some((ok) => !ok);
          return (
            <li key={t.name} className="lane">
              <div className="lane__who">
                <span className="lane__name">{t.name}</span>
                <span className="lane__flow">{t.flow}</span>
              </div>
              <ol className="lane__steps" role="list">
                {t.steps.map((s, i) => (
                  <li key={s} className={`lane__step ${t.result[i] ? '' : 'is-fail'}`}>
                    <Tick ok={t.result[i]} />
                    <span>{s}</span>
                    <span className="sr-only">{t.result[i] ? ', passed' : ', failed'}</span>
                  </li>
                ))}
              </ol>
              <StateChip state={failed ? 'failed' : 'verified'} />
            </li>
          );
        })}
      </ul>
      <p className="sheet__foot">{r.foot}</p>
    </>
  );
}

function Report() {
  const r = WORKSPACE.report;
  return (
    <>
      <header className="sheet__head">
        <h3 className="sheet__title">{r.head}</h3>
      </header>
      <ul className="report" role="list">
        {r.rows.map((row) => (
          <li key={row.id} className="report__row">
            <span className="req__id">{row.id}</span>
            <p className="report__text">{row.text}</p>
            <StateChip state={row.state} />
            <p className="report__note">{row.note}</p>
          </li>
        ))}
      </ul>
      <p className="sheet__foot">{r.foot}</p>
    </>
  );
}

const PANELS: Record<TabId, () => JSX.Element> = { contract: Contract, run: Run, report: Report };

/**
 * Concept sketches of the intended workspace: three views of one made-up example project.
 * These are drawings with example data, labelled as a concept, not screenshots and not a demo.
 * The tabs only switch between sketches. Without JavaScript all three are shown in sequence.
 */
export function Workspace() {
  const [active, setActive] = useState<TabId>('contract');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const ids = WORKSPACE.tabs.map((t) => t.id);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = ids.indexOf(active);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(ids[next]);
    tabs.current[next]?.focus();
  };

  return (
    <section className="workspace section" id="workspace" aria-labelledby="workspace-title">
      <div className="wrap">
        <div className="section-head">
          <p className="label">
            {WORKSPACE.label}
            <span className="badge">{WORKSPACE.badge}</span>
          </p>
          <h2 id="workspace-title" className="display display--xl">
            {WORKSPACE.title[0]} <span className="display__soft">{WORKSPACE.title[1]}</span>
          </h2>
          <p className="lede">{WORKSPACE.lede}</p>
        </div>

        <div className="ws">
          <div className="ws__tabs" role="tablist" aria-label="Concept views" onKeyDown={onKey}>
            {WORKSPACE.tabs.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`ws-tab-${t.id}`}
                className="ws__tab"
                aria-selected={active === t.id}
                aria-controls={`ws-panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                onClick={() => setActive(t.id)}
              >
                <span className="ws__tab-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="ws__tab-label">{t.label}</span>
                <span className="ws__tab-hint">{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="sheet">
            <div className="sheet__bar">
              <span className="sheet__project">{WORKSPACE.project}</span>
              <span className="sheet__stamp">Concept sketch</span>
            </div>
            {WORKSPACE.tabs.map((t) => {
              const Panel = PANELS[t.id];
              return (
                <div key={t.id} role="tabpanel" id={`ws-panel-${t.id}`} aria-labelledby={`ws-tab-${t.id}`} className="sheet__panel" hidden={active !== t.id} tabIndex={0}>
                  <Panel />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
