'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns a ref + boolean that flips to true the first time the element
 * intersects the viewport. Use to gate scroll-triggered animations:
 *
 *   const { ref, inView } = useInView();
 *   return <div ref={ref} className={inView ? 'animate-fade-in-up' : 'opacity-0'} />
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit = { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const node = ref.current;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setInView(true);
          observer.unobserve(e.target);
        }
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}
