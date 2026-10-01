'use client';

import * as React from 'react';

/**
 * Counts from 0 to `value` once the element scrolls into view.
 *
 * `display` starts as `null`, which renders the FINAL value — so the
 * server-readable HTML (and any browser that never runs our script) shows `54`,
 * not a frozen `0`. A layout effect then rewinds it to 0 before the first paint
 * (no flash), and the observer drives it back up.
 *
 * The ramp eases out (cubic) rather than running linearly: the number should
 * appear to ARRIVE and settle, which reads as deliberate rather than as a clock.
 *
 * `0` is special-cased twice: it is often the point of a privacy stat ("data we
 * keep"), there is nothing to animate into, so it is returned to immediately.
 *
 * Reduced motion / missing IntersectionObserver skip the ramp entirely.
 */

export interface CountUpProps {
  value: number;
  /** Milliseconds of the ramp. */
  duration?: number;
  className?: string;
  suffix?: string;
  /** Applied to every intermediate frame. */
  format?: (n: number) => string;
}

const useClientLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function CountUp({ value, duration = 1600, className, suffix = '', format }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = React.useState<number | null>(null);

  useClientLayoutEffect(() => {
    if (value === 0) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || typeof IntersectionObserver === 'undefined') return;

    setDisplay(0);

    const node = ref.current;
    if (!node) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          setDisplay(Math.round(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  const shown = display ?? value;
  const classes = ['tabular-nums', className].filter(Boolean).join(' ');

  return (
    <span ref={ref} className={classes}>
      {format ? format(shown) : shown}
      {suffix}
    </span>
  );
}
