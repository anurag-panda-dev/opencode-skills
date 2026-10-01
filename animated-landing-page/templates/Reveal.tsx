'use client';

import * as React from 'react';

/**
 * Scroll-reveal wrapper.
 *
 * Dependency-free: joins class strings directly. If the project has a `cn()`
 * helper (clsx + tailwind-merge), swap the join for it.
 *
 * SSR contract (do not "simplify"): state starts REVEALED — that is what ships
 * in the server HTML — a layout effect hides it BEFORE first paint, and the
 * observer brings it back. That ordering buys:
 *
 *   1. No JavaScript still shows the page (failure = "not animated", never blank).
 *   2. No hydration mismatch (first client render matches the server; only the
 *      effect diverges).
 *   3. Reduced motion never strands content at opacity: 0 — the effect bails
 *      out BEFORE hiding anything.
 *
 * The transition lives on `.is-revealed`, not `.reveal` (see landing-motion.css):
 * adding the class interpolates 0 -> 1; removing it snaps 1 -> 0 with no flash.
 *
 * The observer disconnects on reveal and unmount, and a missing
 * IntersectionObserver (older WebViews, jsdom) fails OPEN: an unanimated
 * section is cheap, an invisible one is not.
 */

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none';

export interface RevealProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  children: React.ReactNode;
  /** Milliseconds to wait after the element enters the viewport. Stagger: index * 90–120. */
  delay?: number;
  duration?: number;
  direction?: RevealDirection;
  /** How much of the element must be visible before it reveals, 0–1. */
  amount?: number;
}

const OFFSET: Record<RevealDirection, { x: string; y: string }> = {
  up: { x: '0px', y: '28px' },
  down: { x: '0px', y: '-28px' },
  left: { x: '32px', y: '0px' },
  right: { x: '-32px', y: '0px' },
  none: { x: '0px', y: '0px' },
};

/** `useLayoutEffect` warns during SSR; resolve to `useEffect` on the server.
 *  The module evaluates separately per side, so the branch is stable. */
const useClientLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function Reveal({
  children,
  delay = 0,
  duration = 720,
  direction = 'up',
  amount = 0.15,
  className,
  style,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = React.useState(true);

  useClientLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return; // stay visible — fail open
    }

    setRevealed(false); // hide before first paint

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: amount, rootMargin: '0px 0px -6% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [amount]);

  const offset = OFFSET[direction];
  const classes = ['reveal', revealed && 'is-revealed', className].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={
        {
          ...style,
          '--reveal-x': offset.x,
          '--reveal-y': offset.y,
          '--reveal-delay': `${delay}ms`,
          '--reveal-duration': `${duration}ms`,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </div>
  );
}
