'use client';

import * as React from 'react';

/**
 * Pointer-driven 3D tilt card with specular glare (option B1).
 *
 * How it works:
 *   - The OUTER div owns `perspective` (without it, the inner transform renders flat).
 *   - Pointer position → normalized -0.5..0.5 → rotateY = nx * maxTilt * 2,
 *     rotateX = -ny * maxTilt * 2 (inverted: the card tilts AWAY from the pressed
 *     side, like a physical object being pushed).
 *   - Smoothing is a rAF lerp writing `node.style.transform` directly — zero React
 *     state, zero re-renders per frame. Raw pointer→transform is jittery; the lerp
 *     is what makes it feel like an object with mass.
 *   - The loop stops when settled and is cancelled on unmount.
 *
 * Gates (why it renders static for some users):
 *   - `(hover: hover) and (pointer: fine)` — touch users never get pointermove; the
 *     card simply stays static (and every word stays readable).
 *   - `(prefers-reduced-motion: reduce)` — handlers no-op.
 *
 * Pass the card styling via `className` to the INNER element (that's what tilts):
 *   <TiltCard className="card group p-6">…</TiltCard>
 */

export interface TiltCardProps {
  children: React.ReactNode;
  /** Applied to the tilting inner element (e.g. "card p-6"). */
  className?: string;
  /** Maximum tilt in degrees. Keep ≤12 when the card holds body text. */
  maxTilt?: number;
  /** Scale applied while hovered. 1 = none. */
  scale?: number;
  /** Specular highlight that tracks the pointer. */
  glare?: boolean;
  /** Perspective on the scene, in px. Lower = more dramatic. */
  perspective?: number;
  /** Lerp factor per frame, 0–1. Higher = snappier, lower = floatier. */
  ease?: number;
}

export function TiltCard({
  children,
  className,
  maxTilt = 10,
  scale = 1.02,
  glare = true,
  perspective = 1000,
  ease = 0.12,
}: TiltCardProps) {
  const sceneRef = React.useRef<HTMLDivElement | null>(null);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const glareRef = React.useRef<HTMLDivElement | null>(null);
  const enabledRef = React.useRef(false);
  const runningRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const targetRef = React.useRef({ rx: 0, ry: 0, s: 1, gx: 50, gy: 50 });
  const currentRef = React.useRef({ rx: 0, ry: 0, s: 1, gx: 50, gy: 50 });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    enabledRef.current =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  function paint() {
    const card = cardRef.current;
    if (!card) return;
    const c = currentRef.current;
    card.style.transform = `rotateX(${c.rx.toFixed(3)}deg) rotateY(${c.ry.toFixed(3)}deg) scale(${c.s.toFixed(4)})`;
    if (glare && glareRef.current) {
      glareRef.current.style.setProperty('--gx', `${c.gx.toFixed(2)}%`);
      glareRef.current.style.setProperty('--gy', `${c.gy.toFixed(2)}%`);
    }
  }

  function loop() {
    const c = currentRef.current;
    const t = targetRef.current;
    const k = ease;

    c.rx += (t.rx - c.rx) * k;
    c.ry += (t.ry - c.ry) * k;
    c.s += (t.s - c.s) * k;
    c.gx += (t.gx - c.gx) * k;
    c.gy += (t.gy - c.gy) * k;

    const settled =
      Math.abs(t.rx - c.rx) < 0.01 &&
      Math.abs(t.ry - c.ry) < 0.01 &&
      Math.abs(t.s - c.s) < 0.001 &&
      Math.abs(t.gx - c.gx) < 0.1 &&
      Math.abs(t.gy - c.gy) < 0.1;

    if (settled) {
      Object.assign(c, t); // snap exactly, then stop — no idle rAF burning battery
      paint();
      runningRef.current = false;
      return;
    }

    paint();
    frameRef.current = requestAnimationFrame(loop);
  }

  function start() {
    if (runningRef.current) return;
    runningRef.current = true;
    frameRef.current = requestAnimationFrame(loop);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabledRef.current) return;
    const node = sceneRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5 … 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5;
    const t = targetRef.current;
    t.ry = nx * maxTilt * 2;
    t.rx = -ny * maxTilt * 2;
    t.s = scale;
    t.gx = (nx + 0.5) * 100;
    t.gy = (ny + 0.5) * 100;
    start();
  }

  function onPointerLeave() {
    const t = targetRef.current;
    t.rx = 0;
    t.ry = 0;
    t.s = 1;
    t.gx = 50;
    t.gy = 50;
    start();
  }

  return (
    <div ref={sceneRef} style={{ perspective: `${perspective}px` }}>
      <div
        ref={cardRef}
        className={className}
        style={{
          willChange: 'transform',
          // NOTE: no `preserve-3d` here — it would flatten under a future
          // `overflow: hidden` and the tilt card has no 3D children anyway.
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        {children}
        {glare && (
          <div
            ref={glareRef}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              borderRadius: 'inherit',
              background:
                'radial-gradient(340px circle at var(--gx, 50%) var(--gy, 50%), rgba(255,255,255,0.14), transparent 65%)',
            }}
          />
        )}
      </div>
    </div>
  );
}
