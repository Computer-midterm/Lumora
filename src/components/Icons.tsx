// Small inline icons (no icon font, no external requests). Decorative: callers set aria-hidden.

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  focusable: false,
};

export const ArrowRight = () => (
  <svg {...base}>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

export const ArrowDown = () => (
  <svg {...base} width={14} height={14}>
    <path d="M8 3v10M4 9l4 4 4-4" />
  </svg>
);

export const ArrowUp = () => (
  <svg {...base} width={14} height={14}>
    <path d="M8 13V3M4 7l4-4 4 4" />
  </svg>
);

/** The mark: one continuous looping line, a nod to the ink-line figure. */
export const Mark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" focusable={false}>
    <path d="M4.5 15.5c-1.6-4.6 1.2-10 6.4-10.6 5-.6 8.8 3.6 7.9 8.1-.8 4-5.2 6.4-8.6 4.6-2.9-1.5-3.1-5.6-.5-7.3 2.3-1.5 5.5-.2 5.8 2.4.2 2-1.6 3.5-3.4 2.9" />
    <path d="M4.5 15.5c1.2 2.9 3.6 4.6 6.6 4.9" />
  </svg>
);
