# Design system

Dark slate theme, hairline borders, one accent per card, glass where it matters.
Swap the four accents + fonts and the whole system re-skins.

## Color tokens (`tailwind.config.ts` → `theme.extend.colors`)

```ts
colors: {
  base: { 950: '#0B0D10', 900: '#10141A' },   // page background
  card: { 800: '#13171D', 700: '#1C222B' },   // surfaces, inset surfaces
  line: { 600: '#29323F', 500: '#354052' },   // borders, hover borders
  ink:  { 100: '#E8EDF3', 300: '#B7C0CC', 500: '#7D8794' }, // text primary/secondary/muted
  accent: 'rgb(var(--accent-rgb) / <alpha-value>)',          // retintable accent
  success: '#10B981', warn: '#F59E0B', danger: '#EF4444',    // semantic status
  // Four product accents (rename to your product's axes):
  alpha:   { DEFAULT: '#0284C7', soft: '#0C4A6E' },
  beta:    { DEFAULT: '#D97706', soft: '#78350F' },
  gamma:   { DEFAULT: '#8B5CF6', soft: '#4C1D95' },
  delta:   { DEFAULT: '#059669', soft: '#064E3B' },
},
```

Neutrals are cool-tinted greys, never pure black/white — `#0B0D10` → `#E8EDF3` keeps
contrast high enough for AA on dark without halation.

## The accent system (the single most important pattern)

Two tokens always declared together, in `globals.css`:

```css
:root {
  --accent: #0284c7;
  --accent-rgb: 2 132 199;   /* same color as channels */
  --alpha: #0284c7; --beta: #d97706; --gamma: #8b5cf6; --delta: #059669;
}
/* Retint the whole subtree from one attribute */
[data-accent='alpha'] { --accent: #0284c7; --accent-rgb: 2 132 199; }
[data-accent='beta']  { --accent: #d97706; --accent-rgb: 217 119 6; }
```

Why both tokens:

- `--accent` is read directly: `style={{ color: 'var(--accent)' }}`, `fill`, inline glow.
- `--accent-rgb` feeds Tailwind's `<alpha-value>` placeholder so `bg-accent/12`,
  `border-accent/24`, `hover:bg-accent/…` compile with real alphas. A bare
  `var(--accent)` inside a Tailwind color **swallows the opacity modifier** — the
  utility compiles to nothing. The config comment must say this or someone will "clean it up".
- Literal hex utilities (`bg-alpha`) can't be interpolated — anything that *blends*
  (gradients, glows, swatches) reads the CSS custom properties instead.

**Per-card accent:** one custom property drives the entire card:

```tsx
<article className="card group card-lift" style={{ '--pillar': item.color } as React.CSSProperties}>
```

border, radial bloom, watermark, focus ring, icon tint all read `var(--pillar)`.
Retint a card by changing one value — never hardcode a hex in a section.

## Fonts (`lib/fonts.ts`, next/font)

```ts
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
export const inter   = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
export const outfit  = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
```

- Font stacks in Tailwind/CSS must reference **`var(--font-*)`, never bare family names** —
  `next/font` emits a hashed name (`__Outfit_1cdedc`), so `font-family: Outfit` silently
  falls back to `system-ui`.
- Add script fallbacks when the product ships multiple languages:
  `var(--font-outfit), var(--font-noto-devanagari), system-ui, sans-serif`.
- Roles: **display** (Outfit) for headings/eyebrow-marketing voice · **sans** (Inter) for body ·
  **mono** (JetBrains) with `font-variant-numeric: tabular-nums` for metrics.

## Tailwind extensions (copy wholesale, then re-skin)

```ts
fontSize: { eyebrow: ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }] },
borderRadius: { sm: '6px', md: '10px', lg: '16px', full: '9999px' },
boxShadow: { card: '0 1px 2px rgba(0,0,0,.4)', pop: '0 8px 32px rgba(0,0,0,.5)' },
opacity: { 12: '0.12', 24: '0.24' },          // required: default scale steps by 5,
                                               // `bg-accent/12` is dropped silently without it
transitionDuration: { 160: '160ms', 240: '240ms' },
transitionTimingFunction: { spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
plugins: [require('tailwindcss-animate')],     // powers data-[state=…] toast/tooltip enters
```

**The `opacity` extension is a silent-failure trap:** Tailwind's default opacity scale
steps 0/5/10/15…, an out-of-scale modifier is an unknown utility, and JIT drops it with
no warning. If you use `/12` or `/24` anywhere, extend the scale.

## Utility classes (`globals.css`)

```css
.card       { background: var(--card-800); border: 1px solid var(--line-600);
              border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,.4); }
.card-inset { background: var(--card-700); border: 1px solid var(--line-600); border-radius: 6px; }
.eyebrow    { font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
              color: var(--ink-500); font-weight: 600; }
.card-lift  { transition: transform 240ms cubic-bezier(.22,1,.36,1), border-color 160ms ease; }
.card-lift:hover, .card-lift:focus-visible { transform: translateY(-2px); border-color: var(--line-500); }
.section-rule { height: 1px; background: linear-gradient(90deg,
              color-mix(in srgb, var(--accent) 55%, transparent), var(--line-600) 45%, transparent 88%); }
:focus-visible  { outline: 2px solid var(--accent); outline-offset: 2px; }
::selection     { background: color-mix(in srgb, var(--accent) 30%, transparent); }
```

Note `:focus-visible` and `::selection` read `var(--accent)` — the selection ring and focus
outline re-tint with the accent for free.

## Recipes

**Glass surface** (TopBar, hero CTAs, floating mocks):
```tsx
className="border border-line-500 bg-card-800/70 backdrop-blur-sm"
```

**Card hover contract** (used by every card in the app so they answer the pointer identically):
lift `-translate-y-0.5`/`-translate-y-1.5` + border → `line-500` + optional accent border.

**Hover-only radial bloom** (keeps first paint clean — no idle GPU cost):
```tsx
<span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500
  group-hover:opacity-100"
  style={{ background: 'radial-gradient(circle at 30% 0%, var(--pillar) 0%, transparent 68%)' }} />
```

**Top hairline highlight** on cards/panels:
```css
::before { content: ''; position: absolute; inset: 0 0 auto; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.1), 50%, transparent); }
```

## Brand-swap checklist (re-skinning for a new product)

1. Four accent hexes → config colors + `:root` custom properties + `[data-accent]` rules
   (three places, always together — keep them adjacent with a comment).
2. Neutrals: shift the hue of `base`/`card`/`line`/`ink` together; keep the same lightness steps.
3. Fonts: three `next/font` variables + the three stacks (`display`/`sans`/`mono`).
4. Radius scale if the brand is rounder/sharper — `.card`'s `12px` must track `rounded-xl`.
5. Gradient stops in `.text-shine` / `.section-rule` / bloom recipes → new accent properties.
6. Verify `bg-accent/12`, `border-accent/24`, focus rings, and `::selection` all re-tinted.
