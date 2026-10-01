'use client';

import * as React from 'react';

/**
 * Magnetic button — drifts toward the pointer and springs back on leave.
 *
 * Use on the PRIMARY CTA only; more than one per page and the effect stops
 * feeling special.
 *
 * Implementation notes:
 *   - The transform is written straight to the DOM — no state, no re-renders.
 *   - A permanent CSS transition does the smoothing: every new pointer target
 *     restarts a 300ms spring, which reads as weight. On leave the same
 *     transition springs back with overshoot (`cubic-bezier(0.34,1.56,0.64,1)`).
 *   - `getBoundingClientRect` measures the TRANSFORMED rect, so the follow
 *     converges to a stable equilibrium instead of running away.
 *
 * Gates: renders as a plain button when the device has no fine pointer
 * (`(hover: hover) and (pointer: fine)`) or the user prefers reduced motion.
 * Keyboard users get `onBlur` reset so focus never leaves a displaced button.
 */

export interface MagneticButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  /** How far the button follows the pointer, 0–1. 0.25–0.35 feels right. */
  strength?: number;
}

const SPRING = 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)';

export function MagneticButton({
  children,
  strength = 0.3,
  className,
  style,
  onPointerMove,
  onPointerLeave,
  onBlur,
  ...rest
}: MagneticButtonProps) {
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const enabledRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    enabledRef.current =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    onPointerMove?.(e);
    if (!enabledRef.current) return;
    const node = ref.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    node.style.transform = `translate(${(dx * strength).toFixed(2)}px, ${(dy * strength).toFixed(2)}px)`;
  }

  function reset() {
    const node = ref.current;
    if (!node) return;
    node.style.transform = 'translate(0px, 0px)';
  }

  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      className={className}
      style={{ transition: SPRING, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        reset();
      }}
      onBlur={(e) => {
        onBlur?.(e);
        reset();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
