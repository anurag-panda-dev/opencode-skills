# opencode-skills

OpenCode skill catalog — installable by URL, no cloning required.

## Skills

### `animated-landing-page`

Build a dark, glassmorphic marketing landing page in the style of M.I.L.F. Shiksha —
CSS-first scroll reveals, staggered hero entrance, animated counters, layered gradient
depth — with opt-in options for:

- **3D animation** — layered depth scenes, scroll-driven 3D, 3D carousel, floating objects
- **3D interaction** — pointer tilt cards with glare, flip cards, pointer parallax, drag-to-rotate
- **Micro-interactions** — magnetic buttons, shine sweeps, marquees, ripples, counters, cursor glow
- **Baseline motion** — scroll reveal, hero stagger, gradient shine, drifting orbs

Includes 6 reference guides and 5 copy-ready, dependency-free templates
(`Reveal`, `CountUp`, `TiltCard`, `MagneticButton`, `landing-motion.css`).

## Install (as a catalog — recommended)

Add the base URL to `opencode.json` / `opencode.jsonc` (project or global config):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "skills": [
    "https://raw.githubusercontent.com/anurag-panda-dev/opencode-skills/main/"
  ]
}
```

Restart OpenCode. The skill is advertised automatically when a request matches its
description, or load it explicitly by ID: `animated-landing-page`.

## Install (manual copy)

```bash
# into a project (.opencode/skills) or globally (~/.config/opencode/skills)
git clone https://github.com/anurag-panda-dev/opencode-skills.git
cp -r opencode-skills/animated-landing-page /path/to/.opencode/skills/
```

## Updating

Consumers cache catalog skills by `version`. When you change any file, **increment
`version` in `index.json`** — otherwise their cache won't refresh.

```jsonc
{ "name": "animated-landing-page", "version": "2", "files": [ ... ] }
```

## Repository layout

```
index.json                      ← catalog manifest (required at the base URL root)
animated-landing-page/
├── SKILL.md                    ← entry point: workflow, options, guard rails
├── references/                 ← structure, design system, animations, micro-interactions, 3D, a11y
└── templates/                  ← copy-ready TSX + CSS
```

Files are downloaded from `<base-url>/<skill-name>/<file>`, so keep the skill
directory name identical to `name` in `index.json`.
