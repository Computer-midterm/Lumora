import { useEffect } from 'react';
import { REDUCED_MOTION, useMediaQuery } from './useMediaQuery';

/**
 * True when scroll-driven motion is allowed (the visitor has not asked for reduced motion).
 *
 * The page's CSS keys the pinned, scroll-driven layout off `html.motion`. An inline script in
 * index.html sets that class before first paint; this hook keeps it in step if the setting changes
 * while the page is open. Without JavaScript the class is never set, so the page falls back to the
 * same still, in-flow layout that reduced motion uses.
 */
export function useMotion(): boolean {
  const reduced = useMediaQuery(REDUCED_MOTION);
  useEffect(() => {
    document.documentElement.classList.toggle('motion', !reduced);
  }, [reduced]);
  return !reduced;
}
