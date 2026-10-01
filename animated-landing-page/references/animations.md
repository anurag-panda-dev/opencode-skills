# Animations (baseline)

Three principles:

1. **CSS first.** Anything that plays on first paint (hero, atmosphere) is pure CSS — it
   runs even if hydration fails or JS is slow.
2. **IntersectionObserver for scroll.** Below-fold content reveals through one small
   primitive; observers disconnect after firing.
3. **JS only where state must rewind** (counters). Even there, server HTML shows the
   finished state.

## Primitive 1: `Reveal` — scroll reveal

→ Copy `templates/Reveal.tsx`. Companion CSS is in `templates/landing-motion.css`.

```tsx
<Reveal delay={i * 100} duration={680} direction="up" amount={0.15}>
  <ArticleCard />
</Reveal>
```

| Prop | Meaning | Convention |
|---|---|---|
| `delay` | ms after entering viewport | `index * 90–120` for staggered groups |
| `duration` | transition length | 620–720ms |
| `direction` | `up/down/left/right/none` | columns converge: `left` + `right` |
| `amount` | visibility threshold 0–1 | 0.15 default, 0.05 for tall/footers |

**How it works (do not "simplify" this):** state starts **revealed** — that's what ships
in server HTML — a *layout effect* hides it before first paint, the observer brings it back.

- No JS → content visible (failure mode is "not animated", never "blank").
- No hydration mismatch: first client render matches the server; only the effect diverges.
- Reduced motion → the effect bails before hiding anything, so content can't strand at `opacity: 0`.
- The transition lives on `.is-revealed`, not `.reveal`: adding the class interpolates 0→1;
  removing it snaps 1→0 (no flash of content fading out before fading back in).

```css
.reveal        { opacity: 0; transform: translate3d(var(--reveal-x,0px), var(--reveal-y,24px), 0); }
.reveal.is-revealed {
  opacity: 1; transform: none;
  transition: opacity var(--reveal-duration,720ms) cubic-bezier(.22,1,.36,1) var(--reveal-delay,0ms),
              transform var(--reveal-duration,720ms) cubic-bezier(.22,1,.36,1) var(--reveal-delay,0ms);
}
```

## Primitive 2: hero stagger — pure CSS

```tsx
const STAGGER = [0, 90, 180, 300, 440, 580, 720] as const;
const rise = (i: number) => ({ animationDelay: `${STAGGER[i] ?? 0}ms` }) as React.CSSProperties;
```

```css
@keyframes hero-rise { from { opacity: 0; transform: translate3d(0,30px,0) scale(.985); }
                       to   { opacity: 1; transform: none; } }
.hero-rise { opacity: 0; animation: hero-rise 900ms cubic-bezier(.22,1,.36,1) both; }
```

- `both` holds the `from` frame during the delay and freezes the final frame after.
- The hidden frame comes from the keyframe's `from`, **never** a base `opacity: 0` rule —
  a skipped animation then leaves the element fully visible instead of stranded.
- Rules: never two `animation`-setting classes on one element (nest them); hero never
  uses `Reveal` (it's already in view — an observer would only add flicker).

Inner pages above the fold use the same language with no observer:

```css
.page-stack > *          { animation: hero-rise 560ms cubic-bezier(.22,1,.36,1) both; }
.page-stack > *:nth-child(2) { animation-delay: 50ms; }   /* …0→350ms */
```

## Primitive 3: `CountUp` — animated counter

→ Copy `templates/CountUp.tsx`.

```tsx
<CountUp value={54} suffix="+" duration={1600} format={(n) => n.toLocaleString()} />
```

- `display` starts `null` → renders the **final** value in server HTML; a layout effect
  rewinds to 0 pre-paint; IntersectionObserver (`threshold: 0.4`) ramps it back up.
- Ease-out cubic `1 - (1-t)³`: the number should *arrive and settle*, not tick like a clock.
- `value === 0` is special-cased (it's often the point of a privacy stat) — returned to
  immediately, never ramped.
- Reduced motion or missing observer → ramp skipped entirely.

## Atmosphere effects (all pure CSS)

**Drifting orbs** — radial gradients, *not* `filter: blur()` (blur on a full-bleed element
re-evaluates every frame — first-paint stutter on mid-range Android):

```tsx
<span aria-hidden className="orb" style={{
  '--orb-color': 'var(--beta)', '--orb-opacity': .35,
  '--drift-x': '6vw', '--drift-y': '-8vh', '--drift-duration': '28s', '--drift-delay': '4s',
  width: 480, height: 480, top: '-10%', left: '-8%',
} as React.CSSProperties} />
```

**Masked engineering grid** — dissolves toward the edges so the hero still reads as slate:

```css
.grid-veil { background-image: linear-gradient(to right, color-mix(in srgb, var(--ink-100) 7%, transparent) 1px, transparent 1px),
                            linear-gradient(to bottom, color-mix(in srgb, var(--ink-100) 7%, transparent) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 90% 70% at 50% 35%, #000 30%, transparent 78%); }
```

**Gradient text shine** (hero headline, footer brand line):

```css
@keyframes shine { from { background-position: 0% 50%; } to { background-position: 200% 50%; } }
.text-shine { background: linear-gradient(100deg, var(--alpha) 0%, var(--beta) 28%,
               var(--gamma) 55%, var(--delta) 82%, var(--alpha) 100%);
  background-size: 200% auto; background-clip: text; -webkit-background-clip: text;
  color: transparent; animation: shine 9s linear infinite; }
```

Infinite loops: linear easing, ≥8s duration, always decorative-only.

**Pulse rings** — eyebrow dot, trust/privacy stat (stagger 3 rings at `0 / 1.05s / 2.1s`):

```css
@keyframes pulse-ring { 0% { transform: scale(.85); opacity: .5; }
                        70% { transform: scale(1.75); opacity: 0; }
                        100% { transform: scale(1.75); opacity: 0; } }
```

**Scroll cue** — the "more below" signal; must stay visible on short viewports:

```css
@keyframes scroll-cue { 0%,100% { transform: translate3d(0,0,0); opacity: .45; }
                        50%     { transform: translate3d(0,7px,0); opacity: 1; } }
```

**Product-mock micro-loops** (flagship feature section):
`float-y` (8s, `translate3d(0,-14px,0)` at 50%) for the floating card ·
`blink` (1.4s, per-dot `animation-delay: i * 180ms`) for typing dots ·
`grow-x` (`scaleX(0→1)`, `600 + i * 120ms` delay, `forwards`) for analysis/metric bars.

## Choreography recipes

| Section | Sequence |
|---|---|
| Hero | eyebrow pulse-dot → title lines `hero-rise` (90ms stagger) → subtitle → CTAs → trust row → scroll cue; orbs + grid-veil behind, always on |
| Stats | `Reveal delay={i * 90} duration={620}`, each stat's `CountUp` starts when its `Reveal` has landed (IO threshold does this naturally) |
| Feature cards | `Reveal delay={i * 100} duration={680}`; hover = lift + accent border + bloom |
| Two-column feature | left column `direction="left"`, right `direction="right" delay={120}` — columns converge |
| Proof cards | `Reveal delay={i * 120} duration={640}` |
| FinalCta | everything revealed, then the glow panel's ambient loop runs; buttons carry micro-interactions |

**What NOT to animate:** above-the-fold text after its entrance (no looping headline
motion), anything the user must read while it moves, layout properties (`width`/`height`/
`top`/`left`), and more than ~8 simultaneously animating elements in one viewport.

## Adding a new keyframe — checklist

1. `transform`/`opacity` only; no `filter`, `box-shadow`, or full-bleed `background-position`.
2. Add an explicit skip to the `prefers-reduced-motion` block (a duration override does
   **not** cancel `animation-delay` or class-driven hidden states).
3. If it sets `animation` on a class, note the "no two animation classes on one element" rule
   at the declaration.
4. Infinite loops: linear, ≥8s, `aria-hidden` content only.
