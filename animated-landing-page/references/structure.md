# Structure & section choreography

The page is a **server component route → one client component composing sections**. This
keeps SEO/i18n work on the server and confines `'use client'` to the animated tree.

## Route recipe (Next.js App Router)

```tsx
// app/[locale]/page.tsx  (server component)
export default async function LandingPage({ params }) {
  const locale = await validateLocale(params.locale);
  unstable_setRequestLocale(locale);
  const t = await getTranslations('landing');
  return (
    <>
      <JsonLd data={landingSchema} />       {/* Organization + WebSite markup */}
      <LandingPage
        counts={{ guides: t('stats.guidesCount'), tools: t('stats.toolsCount') }}
        /* every ICU-interpolated string is resolved HERE and passed down finished */
      />
    </>
  );
}
```

**Critical i18n rule:** resolve ICU placeholders (`"{guides} guides"`) in the *server* page
and pass finished strings down. Interpolating inside a client component with next-intl
throws `FORMATTING_ERROR`. Landing strings live in `messages/{locale}.json` under a
`landing` namespace.

If the target has no i18n, keep the split anyway: server page owns metadata + JSON-LD,
client component owns animation state.

## Section order (this order is load-bearing)

```
TopBar (fixed, variant="landing")
Hero            — promise: what this is, who it's for, one primary + one secondary CTA
StatsStrip      — proof: animated counters in a <dl>
Pillars         — depth: 4 accent-tinted feature cards (the product's axes)
FlagshipFeature — proof-of-product: two-column with a live DOM "product mock"
SocialProof     — objections: myth/fact, testimonials, or before/after cards
TrustSection    — safety: privacy/security angle (giant stat + pulse rings)
SecondaryFeature— breadth: languages, integrations, or "also included" cards
FinalCta        — the ask: converging glow panel + dual CTA
Footer          — brand, nav columns, legal, disclaimer
```

The narrative arc is **promise → proof → depth → product → objections → safety → ask**.
Swap section *content* freely, keep the arc. Sections that don't exist in a given product
are dropped, not reordered — e.g. no pricing? TrustSection + SocialProof carry the
credibility weight instead.

### Minimal viable set (when told "just a landing page")
Hero → Pillars → FinalCta → Footer. Everything else is an upgrade path.

## File layout

```
app/[locale]/page.tsx              server route: locale, SEO, JSON-LD, ICU strings
app/globals.css                    design tokens + motion CSS layer
components/landing/
  LandingPage.tsx                  'use client'; composes sections in order
  Hero.tsx                         pure-CSS entrance (NO Reveal above the fold)
  StatsStrip.tsx                   <dl> grid + CountUp children
  Pillars.tsx                      accent cards, per-card --pillar var
  FlagshipFeature.tsx              two-col + floating mock, Reveal direction left/right
  ...                              one file per section
  Reveal.tsx                       shared scroll-reveal primitive
  CountUp.tsx                      shared counter primitive
components/layout/TopBar.tsx       fixed chrome, variant="landing"
components/layout/Footer.tsx       variant="full"
```

Rule: **sections never import each other**; only `LandingPage.tsx` composes them. Primitives
(`Reveal`, `CountUp`) are shared, sections are not.

## Layout rhythm

```tsx
// Container (every section's inner wrapper)
<div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">

// Section vertical rhythm
<section className="py-20 sm:py-24 lg:py-28">

// Hero owns the fold: subtract the fixed TopBar height (h-14 = 3.5rem)
.hero-viewport { min-height: calc(100vh - 3.5rem); min-height: calc(100svh - 3.5rem); }
```

- `100svh` with a `100vh` fallback — mobile browser chrome crops a plain `100vh` hero by
  60–100px, which drags the scroll cue off-screen.
- Short viewports: at `max-height: 780px`, collapse hero vertical padding to `3rem` so the
  scroll cue (the "there is more below" signal) stays visible on 1366×768 laptops.
- Fluid type: hero `text-[clamp(2.6rem,11vw,6.5rem)]`, section heads
  `text-[clamp(1.75rem,5vw,3rem)]`. Never fixed px for display sizes.

## Section anatomy (canonical)

```tsx
export function Pillars({ items }: { items: Item[] }) {
  return (
    <section aria-label="What this covers" className="py-20 sm:py-24 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <p className="eyebrow">…</p>
        <h2 className="font-display text-[clamp(1.75rem,5vw,3rem)] text-balance">…</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={i * 100} duration={680}>
              <article
                className="card group relative overflow-hidden p-6 card-lift"
                style={{ '--pillar': item.color } as React.CSSProperties}
              >
                {/* watermark, bloom, icon, copy, arrow — all read var(--pillar) */}
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Stagger conventions: stats `i * 90` · cards `i * 100` · languages `i * 110` ·
myth/proof cards `i * 120`. Two-column sections use `direction="left"` /
`direction="right"` so columns converge instead of rising together.

## Hero entrance (bypasses Reveal deliberately)

```tsx
const STAGGER = [0, 90, 180, 300, 440, 580, 720] as const;
const rise = (i: number) => ({ animationDelay: `${STAGGER[i] ?? 0}ms` }) as React.CSSProperties;

<h1 className="font-display text-[clamp(2.6rem,11vw,6.5rem)]">
  <span className="hero-rise block" style={rise(1)}>{t('heroTitle1')}</span>
  <span className="hero-rise block" style={rise(2)}>
    <span className="text-shine">{t('heroTitle2')}</span>   {/* nested: animation shorthand clash */}
  </span>
</h1>
```

Pure CSS → plays even if hydration fails. `.text-shine` and `.hero-rise` both set
`animation`, so they must never share an element.

## Chrome

- **TopBar:** fixed `h-14`, `bg-base-950/80 backdrop-blur-sm`, desktop nav on landing,
  drawer on mobile (slide via `-translate-x-full` ↔ `translate-x-0`, Escape closes,
  body scroll lock). Main content padded by exactly `h-14`.
- **Footer:** `variant="full"` (brand, 2 nav columns, legal) vs `variant="compact"` for inner pages.

## SEO

- `metadata` + OpenGraph in the server layout/page; one `JsonLd` with `Organization`
  (or `MedicalOrganization`/`Product` as appropriate) and `WebSite`.
- `generateStaticParams()` for locales; `unstable_setRequestLocale` in layout + page.
- `<html lang={locale}>` — required for WCAG 3.1.1, and it changes how screen readers
  pronounce copy.
