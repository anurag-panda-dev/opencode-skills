# Micro-interactions menu

Each entry: what it is, when to use it, code, cost, reduced-motion behavior.
Pick 3–6 for a page — more reads as noise. All durations live in the 160–500ms band.

**Global rules**

- A hover enhancement may never *hide* content from touch users — hover reveals decoration,
  never information (if info appears on hover, also show it on `focus-visible` and on mobile).
- Touch users get `active:` equivalents (scale/opacity) instead of hover states.
- Every interactive element keeps its `:focus-visible` ring — don't remove outlines.

---

## M1 · Magnetic button → `templates/MagneticButton.tsx`

Button drifts toward the pointer and springs back. Use on the **primary CTA only**.
Gated on `(hover: hover) and (pointer: fine)` + reduced-motion; touch users see a normal button.

## M2 · Icon slide on hover (pure Tailwind)

```tsx
<button className="group inline-flex items-center gap-2 ...">
  Get started
  <ArrowRight aria-hidden className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
</button>
```

Pair with `hover:-translate-y-0.5` on the button (`transition-transform duration-200`).
Cost: none (composited). Reduced motion: blanket duration override handles it.

## M3 · Hover bloom (accent glow behind a card)

Radial gradient fades in on hover — first paint stays clean, no idle GPU cost.

```tsx
<span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity
  duration-500 group-hover:opacity-100"
  style={{ background: 'radial-gradient(circle at 25% 0%, var(--pillar) 0%, transparent 68%)' }} />
```

## M4 · Shine sweep across a button/badge

```css
@keyframes btn-shine { from { transform: translateX(-120%) skewX(-20deg); }
                       to   { transform: translateX(220%) skewX(-20deg); } }
.shine-btn::after { content: ''; position: absolute; inset: 0 auto 0 -40%; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent);
  transform: translateX(-120%) skewX(-20deg); overflow: hidden; }
.shine-btn:hover::after { animation: btn-shine 700ms ease; }
```

Runs once per hover, not looping. Container needs `relative overflow-hidden`.

## M5 · Marquee / logo ticker (infinite scroll)

```css
@keyframes marquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }
.marquee-track { display: flex; width: max-content; animation: marquee 32s linear infinite; }
.marquee:hover .marquee-track { animation-play-state: paused; }   /* courtesy pause */
```

```tsx
<div className="marquee no-scrollbar overflow-hidden" aria-label="Trusted by">
  <div className="marquee-track">
    {[...items, ...items].map((t, i) => <Logo key={i} />)}  {/* duplicated: -50% loops seamlessly */}
  </div>
</div>
```

- Duplicate the content exactly once; translate by `-50%`.
- Wrap in a container with an edge `mask-image` fade so items dissolve at the margins.
- Reduced motion: add `.marquee-track { animation: none !important; }` to the override block —
  then it's a static row (fine: it's decorative, and content must remain).

## M6 · Animated counter → `templates/CountUp.tsx`

See `animations.md` — listed here because it *reads* as a micro-interaction.
Use on stats only; the number must be meaningful without animating (server HTML shows it).

## M7 · Ripple on press (pure CSS, no JS)

```css
.ripple { position: relative; overflow: hidden; }
.ripple::after { content: ''; position: absolute; inset: 50% auto auto 50%;
  width: 10px; height: 10px; border-radius: 9999px; background: currentColor;
  transform: translate(-50%,-50%) scale(0); opacity: .35; }
.ripple:active::after { animation: ripple-out 450ms ease-out; }
@keyframes ripple-out { to { transform: translate(-50%,-50%) scale(30); opacity: 0; } }
```

Center-origin approximation; good enough for cards/tiles. True pointer-origin ripples need JS —
skip them, the approximation is calmer.

## M8 · Tap-scale feedback

```tsx
className="transition-transform duration-150 active:scale-[0.97]"
```

The universal touch counterpart to hover lift. Apply to buttons, pills, tappable cards.

## M9 · Letter-by-letter / word-by-word reveal

```tsx
<h2 aria-label={text}>
  {text.split('').map((ch, i) => (
    <span key={i} aria-hidden className="hero-rise inline-block"
      style={{ animationDelay: `${300 + i * 28}ms`, animationDuration: '520ms' }}>
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ))}
</h2>
```

- `inline-block` per glyph or transforms don't apply; `\u00A0` preserves spaces.
- `aria-label` on the parent + `aria-hidden` on glyphs so screen readers say the word once.
- ≤30ms/char beyond ~40 chars becomes sluggish — for long text animate words instead.
- Reduced motion: the blanket override skips it; the glyph spans inherit visible state from
  `hero-rise`'s keyframe pattern (never base `opacity: 0` — see `animations.md`).
- Cost: one span per glyph — fine for headings, never for paragraphs.

## M10 · Cursor glow / custom cursor

```tsx
// section-level ambient glow that follows the pointer (pointer:fine only)
const onMove = (e: React.PointerEvent<HTMLElement>) => {
  e.currentTarget.style.setProperty('--mx', `${e.clientX - e.currentTarget.getBoundingClientRect().left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - e.currentTarget.getBoundingClientRect().top}px`);
};
// CSS: radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), accent 0%, transparent 70%)
```

- Set CSS vars on **pointermove only** — no React state, no re-render per frame.
- `pointer-events: none` on the glow; decorate sections, never the whole document.
- Full cursor *replacement* (hiding the native cursor) hurts accessibility — prefer ambient
  glow over a custom dot.

## M11 · Toast / tooltip enter (tailwindcss-animate)

```tsx
className="data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0
  zoom-in-95 zoom-out-95 data-[side=top]:slide-in-from-bottom-2"
```

Radix + `tailwindcss-animate` — `data-[state]`/`data-[side]` variants do the work.
Toast swipe-out reads `--radix-toast-swipe-*` custom properties.

## M12 · Loading / optimistic state

```tsx
<Button loading={isPending}>   // renders <Spinner/> + keeps label width
```
`animate-spin` SVG spinner; long operations also get a disabled state + `aria-busy`.
Never animate layout to indicate loading — swap icon or show `animate-pulse` skeleton.

## M13 · Marquee text / gradient border (conic sweep)

```css
@keyframes border-spin { to { transform: rotate(1turn); } }
.glow-border::before { content: ''; position: absolute; inset: -1px; border-radius: inherit;
  padding: 1px; background: conic-gradient(from 0deg, transparent, var(--accent), transparent 40%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: border-spin 4s linear infinite; pointer-events: none; }
```

Reserve for **one** hero-level element (final CTA panel). Infinite + decorative → must be
disabled under reduced motion.

---

## Selection guide

| Page type | Suggested set |
|---|---|
| Minimal / corporate | M2, M6, M8 |
| Product launch (default) | M1, M2, M3, M6 |
| High-energy / consumer | M1, M3, M4, M5, M9, M10 |
| Already using 3D options | keep micro-interactions ≤3 — the 3D layer is the star |
