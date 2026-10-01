# Performance & accessibility

Read this before declaring the page done. Every rule here exists because violating it
fails *silently* — invisible content, stranded animations, or effects that hurt the
people they're supposed to impress.

## 1. Reduced motion — three layers (all required)

**Layer 1 — blanket CSS override** (`landing-motion.css`):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* Layer 2 — explicit skips for class-driven hidden states and delays.
     A duration override does NOT fix these:
     - .reveal is hidden by a class, not an animation → would stay at opacity: 0
     - animation-delay is untouched → .hero-rise / .page-stack children sit hidden for
       up to 350ms even at 0.01ms duration */
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  .hero-rise, .page-stack > *, .orb, .marquee-track, .float-slow, .glow-border::before {
    animation: none !important;
  }
  .reveal-3d { opacity: 1 !important; transform: none !important; }
}
```

**Layer 3 — JS bail-outs** in every hook:

```ts
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // before hiding anything
```

Put this in `Reveal`, `CountUp`, every rAF loop (TiltCard, parallax, cursor glow), every
scroll-linked handler, and skip mounting WebGL canvases entirely. Also self-review the
list in `animations.md` §"Adding a new keyframe" — **every new class/keyframe needs an
explicit skip**; the blanket override will not catch it.

## 2. SSR-safety ordering (the invisibility bug)

The canonical pattern — visible in server HTML, hidden *after* mount, re-revealed:

```ts
const [revealed, setRevealed] = React.useState(true);   // 1. server HTML: visible
useClientLayoutEffect(() => {                           // 2. layout effect: hide BEFORE paint
  if (reducedMotion || noObserver) return;              //    (bail while still visible!)
  setRevealed(false);
  /* …observe, then setRevealed(true) */                // 3. observer: bring back
}, []);
```

Why this order:

- **JS off** → content visible forever. Failure mode is "unanimated", never "blank page".
- **No hydration mismatch** — first client render matches server HTML; only the effect diverges.
- **Reduced motion** never strands content at `opacity: 0`.
- `useLayoutEffect` warns during SSR → use the shim:
  `const useClientLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;`

Forgetting step 3's early-return (hiding before checking reduced motion) is the #1 cause of
"page is blank for some users".

## 3. Observer & listener hygiene

- Disconnect `IntersectionObserver` on reveal *and* unmount — a long page must not
  accumulate a listener per section.
- **Fail open:** missing `IntersectionObserver` (jsdom, old WebViews) → reveal immediately.
  Failing open costs an unanimated section; failing closed costs an invisible one.
- rAF loops: stop when settled (`Math.abs(delta) < 0.01` → don't reschedule),
  `cancelAnimationFrame` on cleanup, single-loop guard (`running.current` flag).
- `resize`/`scroll`/pointer listeners: passive where possible, removed on cleanup,
  or bound once via CSS vars instead of React state (no re-render per frame).

## 4. Rendering budget

- **Animate `transform` and `opacity` only.** Everything else triggers layout or paint.
- **Never animate `filter: blur()` on full-bleed elements** — re-evaluated per composited
  frame; first-paint stutter on mid-range Android. Use radial-gradient orbs instead.
- Background-position animations (`.text-shine`) must be decorative, ≤2 elements visible at once.
- Stagger budget: ≤8 simultaneously animating elements in one viewport.
- `will-change` only while actively animating, removed after — keeping it forever costs a layer.
- `backdrop-blur` on 2–3 elements max (TopBar, hero CTA, one panel); it's expensive and
  overused glass reads as mush.

## 5. Bundle & hydration

- Baseline landing page must ship **zero animation libraries** — CSS + one observer
  component. framer-motion only if a chosen option needs it (B4), and only there.
- WebGL tier: `next/dynamic` + `ssr: false`, its own chunk, verified against the route's
  first-load JS in `npm run build`.
- `'use client'` on animation components only; the route/SEO layer stays server-side.
- Never touch `window`/`matchMedia` during render — only in effects (hydration mismatch).
- No `next/dynamic` needed for CSS-only motion; don't add loading states for things that
  don't load.

## 6. Accessibility checklist

- [ ] **JS disabled** → all content readable (view with DevTools → Disable JavaScript).
- [ ] **Reduced motion** → DevTools → Rendering → *Emulate prefers-reduced-motion*; nothing
      stuck at 0, no delayed invisibility, no infinite motion.
- [ ] Decorative layers (`orb`, `grid-veil`, watermark glyphs, pulse rings, scroll cue,
      icons, canvases) carry `aria-hidden="true"`.
- [ ] Every interactive element: reachable by Tab, visible `:focus-visible` ring
      (`outline: 2px solid var(--accent)`), operable with Enter/Space (flip cards, carousels
      with arrow keys).
- [ ] Hover-only info is also available on focus and on touch (no information hidden behind hover).
- [ ] Stats use `<dl>/<dt>/<dd>`; sections have `aria-label`; `aria-current="page"` on active nav.
- [ ] `lang` attributes on any foreign-language samples; `<html lang={locale}>`.
- [ ] Text contrast on dark: `ink-100 #E8EDF3` on `base-950 #0B0D10` ≈ 16:1 (AAA);
      muted `ink-500` only for ≥11px non-essential labels — verify `text-ink-500` copy.
- [ ] Custom cursor / cursor-hidden effects: strongly discouraged — if used, native cursor
      remains for keyboard/AT users.
- [ ] Marquees/carousels: pause on hover *and* focus; don't auto-advance critical content.
- [ ] Animated text: `aria-label` on parent + `aria-hidden` per glyph.

## 7. Verification commands

```bash
npm run build          # route size + no hydration/prerender errors
npm run typecheck      # tsc --noEmit
npm run lint
# if the project has them:
npm run test:a11y      # axe-core audit
npm run test:e2e
```

Manual pass (5 minutes): load with JS off → load with reduced motion → Tab through the
whole page → check console for hydration warnings → throttle to Fast 3G and confirm the
hero paints before hydration.
