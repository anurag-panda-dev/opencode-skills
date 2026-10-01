---
name: Animated Landing Page
description: Build a dark, glassmorphic marketing landing page in the style of M.I.L.F. Shiksha — CSS-first scroll reveals, staggered hero entrance, animated counters, layered gradient depth — with opt-in options for 3D animation (depth scenes, scroll-driven 3D, 3D carousel), 3D interaction (pointer tilt cards, flip cards, pointer parallax), and micro-interactions (magnetic buttons, shine sweeps, marquees, ripples, cursor glow). Use when creating or restyling a landing page, hero section, or marketing homepage, or when asked for animated, 3D, or micro-interaction effects.
---

# Animated Landing Page (Shiksha style)

Builds a marketing landing page with this fingerprint: **dark slate surfaces, hairline
borders, one accent color per card, glassmorphism, fluid clamp() type, and motion that is
CSS-first above the fold and IntersectionObserver-driven below it.** 3D and
micro-interactions are opt-in layers on top of that base.

The source project is Next.js 14 (App Router) + TypeScript + Tailwind 3. The techniques
transfer to any React/SSR stack; if the target is not Next.js, adapt the route/i18n/SEO
steps and keep the CSS and component primitives unchanged.

## Workflow

1. **Detect the stack.** Check for Next.js, Tailwind, a `cn()` helper, and `next/font`.
   Note gaps — the templates in `templates/` are dependency-free precisely so they drop in anywhere.
2. **Choose options with the user** (step below). If they already specified effects, skip the ask.
3. **Read only the references you need** (map below). Always read `references/structure.md`
   and `references/design-system.md`; add the others per chosen options.
4. **Build in this order:** design tokens → `landing-motion.css` → primitives (`Reveal`,
   `CountUp`) → sections → optional 3D/micro-interaction layers → guard-rail pass.
5. **Verify:** `build` + `typecheck`, then the checklist in
   `references/performance-accessibility.md` (reduced-motion, JS-off, keyboard-only).

## Options

Ask with the `question` tool when the request is ambiguous. Offer three groups.

**A. 3D animation (plays on its own)** — details in `references/3d.md`
- `A1` Layered depth scene — perspective container, elements at different `translateZ`, subtle drift
- `A2` Scroll-driven 3D — sections rotateX/translateZ into place as they enter
- `A3` 3D carousel / ring — items arranged with `rotateY`, auto-advancing or drag-controlled
- `A4` Floating objects — `rotate3d` keyframe loops on decorative shapes

**B. 3D interaction (follows the user)** — details in `references/3d.md`
- `B1` Pointer tilt card — rotateX/rotateY driven by pointer position + specular glare (template `TiltCard.tsx`)
- `B2` Flip card — click/tap to reveal back face
- `B3` Pointer parallax — hero layers shift at different rates as the pointer moves
- `B4` Drag-to-rotate — press and drag to spin an object (framer-motion optional)

**C. Micro-interactions** — menu with code in `references/micro-interactions.md`
- Magnetic button (template `MagneticButton.tsx`), shine sweep, icon slide, hover bloom,
  animated counter (template `CountUp.tsx`), marquee/ticker, ripple, cursor glow/follower,
  letter-by-letter reveal, tap-scale feedback, loading spinner, toast/tooltip enter.

**D. Baseline animations** — always on, from `references/animations.md`: scroll reveal,
hero stagger, gradient text shine, drifting orbs, pulse rings, scroll cue.

Default when the user has no preference: baseline + `B1` + three micro-interactions
(magnetic button, icon slide, hover bloom). Never enable a WebGL tier (below) without
explicit confirmation — it changes the bundle.

## The motion grammar

Deviations from these make the page look like a different product:

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for entrances/hovers; `spring`
  (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for playful return-to-rest; linear only for infinite loops.
- **Durations:** micro 160–240ms · hover 240–500ms · reveal 620–720ms · hero 900ms · ambient loops 8s+.
- **Stagger:** 90–120ms between siblings; delays are authored in markup (`delay={i * 100}`).
- **Properties:** animate `transform` and `opacity` only. Never animate `filter: blur()` or
  box-shadow on full-bleed elements — re-evaluated per frame, stutters on mid-range phones.
- **Above the fold = pure CSS** so it plays before hydration. **Below the fold = `Reveal`.**
- One CSS custom property per card (`--pillar: var(--accent)`) drives its border, glow,
  watermark, and focus ring — retint by changing one value.
- The `animation` shorthand is not additive: two classes that set it on one element
  silently cancel each other. Nest the elements instead (`.hero-rise > .text-shine`).
- Decorative layers get `aria-hidden="true"`; content never hides behind an effect.

## Reference map

| File | Read when |
|---|---|
| `references/structure.md` | Always. Section order, route recipe, layout rhythm, i18n/SEO. |
| `references/design-system.md` | Always. Tokens, accent system, fonts, utility classes, brand-swap checklist. |
| `references/animations.md` | Always. Reveal, hero stagger, counters, atmosphere effects, choreography. |
| `references/micro-interactions.md` | Any option in group C. |
| `references/3d.md` | Any option in groups A or B, or anything WebGL. |
| `references/performance-accessibility.md` | Always, before declaring done. |

## Templates (copy, then adapt)

| Template | Purpose |
|---|---|
| `templates/Reveal.tsx` | Scroll-reveal wrapper. SSR-safe, reduced-motion-aware. |
| `templates/CountUp.tsx` | Animated counter; server HTML shows the final number. |
| `templates/TiltCard.tsx` | Pointer-driven 3D tilt card with glare (option B1). |
| `templates/MagneticButton.tsx` | Magnetic hover button (micro-interaction). |
| `templates/landing-motion.css` | Complete CSS motion layer: reveal, hero-rise, orbs, shine, pulse rings, card-lift, flip, marquee, reduced-motion overrides. |

All templates are dependency-free (no `clsx`/`tailwind-merge` import). If the project has
a `cn()` helper, swap the `.filter(Boolean).join(' ')` calls for it.

## Guard rails (non-negotiable)

1. **Reduced motion at three layers:** blanket CSS override *plus* explicit skips for
   class-driven hidden states (a duration override alone leaves `.reveal` stuck at
   `opacity: 0`) *plus* JS bail-outs in every observer/rAF hook.
2. **SSR-safety ordering:** start components in their *visible* state in server HTML, then
   hide/rewind in a layout effect before first paint. Content must survive JS being off.
3. **Fail open:** a missing `IntersectionObserver` or matchMedia reveals content instead of
   stranding it; disconnect observers on reveal and unmount.
4. **Gates for pointer/3D effects:** `(hover: hover) and (pointer: fine)` — never make a
   touch user depend on hover — and `(prefers-reduced-motion: reduce)`.
5. **WebGL tier** (only if explicitly chosen): lazy-load with `next/dynamic` + `ssr: false`,
   clamp `devicePixelRatio`, pause when offscreen, and ship a static poster fallback.
6. **Accessibility:** `:focus-visible` rings on every interactive element, `aria-hidden` on
   decoratives, semantic markup for stats/lists, keyboard-operable flip/carousel/drag controls.

## Definition of done

- [ ] Page renders and communicates with JS disabled and with reduced-motion enabled.
- [ ] No layout shift on entrance animations; all reveals animate `transform`/`opacity`.
- [ ] `build` and `typecheck` pass; no hydration warnings in the console.
- [ ] Keyboard traversal reaches every control with a visible focus ring.
- [ ] Chosen 3D/micro-interaction options are present, gated, and clean up their listeners/rAF.
