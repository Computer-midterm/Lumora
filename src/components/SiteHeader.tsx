import { useEffect, useRef, useState } from 'react';
import { NAV } from '../content';
import { Mark } from './Icons';

/** Floating header: wordmark pill + section links (a menu button on narrow screens). */
export function SiteHeader() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Highlight the section currently in the middle of the viewport.
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        setActive(ids.find((id) => visible.get(id)) ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // Menu: close on Escape (returning focus), outside click, or when the layout widens.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !menuBtn.current?.contains(t)) setOpen(false);
    };
    const mql = window.matchMedia('(min-width: 720px)');
    const onWide = () => mql.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    mql.addEventListener('change', onWide);
    menu.current?.querySelector('a')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      mql.removeEventListener('change', onWide);
    };
  }, [open]);

  return (
    <header className="site-header" data-enter="0">
      <a className="pill brand" href="#top">
        <Mark />
        <span className="brand__name">Lumora</span>
        <span className="brand__tag">Working name</span>
        <span className="sr-only">, back to top</span>
      </a>

      <nav className="pill nav" aria-label="Sections">
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className="nav__link" aria-current={active === n.href.slice(1) ? 'location' : undefined}>
            {n.label}
          </a>
        ))}
      </nav>

      <button
        ref={menuBtn}
        type="button"
        className="pill menu-btn"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="menu-btn__bars" aria-hidden="true" />
        {open ? 'Close' : 'Menu'}
      </button>

      <div id="site-menu" ref={menu} className="menu" hidden={!open}>
        <nav aria-label="Sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="menu__link" onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
