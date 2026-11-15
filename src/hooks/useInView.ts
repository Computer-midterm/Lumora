import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * True once the element has been at least `threshold` visible. Used for the page's few one-time
 * "arrival" moments. Starts true where IntersectionObserver is missing, so nothing stays hidden.
 */
export function useInView<T extends Element>(threshold = 0.3): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}
