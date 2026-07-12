# AiXel Visual Melody — Master Design Package V1.0

**Brand:** AiXel Studio
**Product:** AiXel Visual Melody
**Tagline:** Transform Your Music Into Living Visuals
**Philosophy:** The Sky Is Not the Limit Anymore. Imagination Is the Blueprint.

---

## 1. Non-Negotiable Product Vision

AiXel Visual Melody is not a conventional audio visualizer. It is a premium creative
studio where music becomes living visual art.

Music becomes Light.
Music becomes Motion.
Music becomes Emotion.

Golden Reference Track for all future design and implementation validation:
**"In the Spirit of Naomi."**

---

## 2. User Journey

```
Home → Import → Analyze → Create → Preview → Export
                              ↕
                          Settings (accessible from every screen)
```

- **Home** — cosmic hero, six visual engines, recent projects, pipeline overview.
- **Analyze** — FFT spectrum, waveform, beat grid, stereo image, dynamics, key/chord
  detection, Emotion Profile (named emotion chips), AiXel Intelligence recommendation.
- **Create** — large live preview, Six Visual Engines selector (interface itself
  re-themes per engine), Visual Presets, AiXel Director mood controls, fine-tuning
  sliders.
- **Preview** — full-bleed cinematic playback, minimal chrome, section-aware timeline,
  transport controls, quality selector.
- **Export** — format grid (YouTube, Instagram, TikTok, Vertical, Square, 4K/8K,
  Wallpaper), special modes (Transparent, HDR, GIF, Wallpaper), render progress.
- **Settings** — three sections only (Audio, Visual, Performance); advanced options
  stay hidden until requested.

---

## 3. The Six Visual Engines

| # | Engine | Visual Character | Motion Language | Color Behavior | Mood |
|---|---|---|---|---|---|
| 01 | **Cosmic Waves** | Nebulas, soft particles, deep space | Slow drift + breathing scale/opacity | Blue → violet gradients | Reflective, expansive, calm |
| 02 | **Jazz Geometry** | Concentric circles, minimal rings | Independent slow rotation per ring | Warm gold on near-black | Harmonic, composed, minimal |
| 03 | **Liquid Colors** | Ink-like gradients, organic blur | Continuous gradient-position shift ("liquid shift") | Orange → magenta → indigo | Sensual, fluid, warm |
| 04 | **Frequency City** | Skyline of vertical bars, architectural | Independent bar pulse per "building" | Magenta ↔ cyan ↔ violet | Urban, electric, alive |
| 05 | **Minimal Album Art** | Spinning vinyl record, monochrome | Constant slow rotation | Black/graphite with a single gold accent | Intimate, minimal, nostalgic |
| 06 | **Neon Velvet** | Synthwave light trails (SVG paths) | Traveling dash-offset trail animation | Cyan → violet neon on deep purple | Nocturnal, glamorous, electric |

**Response model (design intent — real audio-reactivity is an engineering task):**
- **Bass** → drives particle/bar scale and the "breathing" pulse amplitude.
- **Mids** → drives motion speed (drift, rotation, liquid shift rate).
- **Highs** → drives sparkle/twinkle density and edge glow intensity.
- **Dynamics** → drives overall opacity/contrast swing between quiet and loud passages.

**UI accent behavior:** selecting an engine anywhere in the product (Home cards,
Create chips) re-themes the immediate surface — accent gradient, preview corner
radius, and border glow — to that engine's identity. This is implemented today on
the **Create** screen (`accentFrom`/`accentTo`/`previewRadius` driven by
`state.activeEngine`).

---

## 4. AiXel Director

Replaces raw technical parameters with mood language as the primary control surface:

🎼 More Cinematic · ✨ More Emotional · 🌌 More Dreamy · 🔥 More Powerful ·
🌊 More Organic · 🎹 More Minimal

Technical sliders (Emotion, Space, Fluidity, Light, Dynamics, Particles, Color
Energy, Motion Complexity) remain available under a secondary **"Fine Tuning"**
section — never the first thing a user must understand.

## 5. AiXel Intelligence

On **Analyze**, findings are presented as a read, not a spreadsheet:

> "Ballad detected. Moderate dynamics. Rich harmonic movement."
> Recommended palette: Blue Aurora · Recommended intensity: 72% · Recommended
> motion: Organic.

One button — **Generate →** — carries the recommendation into Create.

## 6. Visual Presets

One-click mood packages layered on top of an engine: Naomi, Dream, Universe, Rain,
Blue, Neon, Galaxy, Jazz Club, Deep Space, Ocean. Selecting a preset is a shortcut
that pre-sets Director moods + palette; it does not replace the Six Engines, it
dresses one.

---

## 7. Design System Summary

See `Design-System.dc.html` for the live, canonical reference. Summary:

**Color tokens** — Deep Space `#05060b`, Cosmic Blue `#1a2a66`, Electric Cyan
`#5fd0ff`, Aurora Violet `#8a6bff`, Warm Gold `#e7c977`, Silver White `#eef1fb`,
Neon Magenta `#e750b4` (Frequency City / Neon Velvet accent only).

**Typography** — Manrope (UI, weights 300–800) for structure and labels;
Cormorant Garamond italic for poetic/editorial moments (taglines, AI insight
lines, loading copy). Display 60px / Heading 30px / Body 14px / Caption 11px.

**Spacing** — 4 / 8 / 12 / 16 / 24 / 32px scale. Generous negative space is a
design rule, not a gap to fill.

**Radii** — 8 (sm, chips/badges) · 14 (md, buttons) · 20 (lg, panels) · 26+ (full,
pills). Radius also carries engine identity in Create (12–34px depending on
engine mood).

**Glass panel** — `1px solid rgba(160,180,255,0.16)` border, `rgba(255,255,255,0.025)`
fill, `blur(24px)` backdrop, soft outer shadow, `inset 0 1px 0 rgba(255,255,255,0.04)`
top highlight. Two variants: AI highlight (cyan/violet glow) and Golden Reference
(gold border, used only for the benchmark track).

**Motion** — slow and elegant by rule: drifts 12–30s, breathing 6–13s, no motion
faster than ~1.5s except micro hover feedback (0.3s). All decorative animation
respects `prefers-reduced-motion`.

---

## 8. Component Map (for React / Vite / TypeScript handoff)

Description only — no production code. Each row: component, responsibility, and
which screens reuse it.

- **AppShell** — page background, star field, top-level layout. Every screen.
- **TopNavigation** — logo, 6-item nav (Home/Analyze/Create/Preview/Export/Settings),
  Settings gear, avatar. Every screen.
- **ProjectHeader** — track title + eyebrow label + optional poetic subline. Home,
  Analyze, Create, Export.
- **GlassPanel** — the reusable card surface (default / AI-highlight / golden
  variants). Every screen, dozens of instances.
- **VisualEngineCard** — engine thumbnail with its own live mini-animation +
  name/description. Home (grid of 6), reused conceptually as EngineChip on Create.
- **AiXelDirector** — mood-pill cluster + fine-tuning sliders container. Create.
- **MoodPill** — single toggleable mood button (🎼✨🌌🔥🌊🎹). Create.
- **VisualPresetCard** — single preset chip (Naomi, Dream, …). Create.
- **ArtisticSlider** — labeled range input with live value. Create, Design System.
- **AudioTimeline** — scrubber with section markers, used both as the compact
  Analyze/Create waveform strip and the full Preview timeline.
- **WaveformDisplay** — bar-based waveform rendering. Home (reference strip),
  Analyze (transport).
- **SpectrumDisplay** — FFT bar visualization. Analyze.
- **PreviewCanvas** — the live animated visual surface (per-engine variants).
  Create (embedded), Preview (full-bleed).
- **TransportControls** — play/pause/skip/loop cluster. Preview, Design System.
- **ExportFormatCard** — destination format tile (YouTube, TikTok, …). Export.
- **RenderProgress** — progress bar + frame counter + poetic status line. Export,
  Design System.
- **SettingsSection** — one of the three settings groups (Audio/Visual/Performance)
  with toggle/slider/select rows. Settings.
- **PoeticStatusMessage** — the slow-cycling italic microcopy component used on
  Home (hero), Preview (now-playing caption), Export (render progress).

### Implementation priorities
1. AppShell + TopNavigation + GlassPanel (everything else nests inside these).
2. Home (static, no interactive state beyond hover — fastest to ship).
3. Create's engine-reactive theming (`activeEngine` state driving CSS custom
   properties) — this is the single most structurally important interaction to
   get right early, since Preview/Export inherit the same accent logic.
4. Analyze (data-heavy but no cross-screen state dependency).
5. Preview + Export (depend on a real audio pipeline / renderer to be meaningful
   beyond static mock data).
6. Settings + Design System (lowest risk, do last).

---

## 9. Non-Negotiable Design Rules

1. Music becomes Light. Music becomes Motion. Music becomes Emotion. Every screen
   must reinforce this, not just the hero.
2. Large negative space is a feature — never fill emptiness with filler content.
3. No raw technical parameters in front of the user by default (AiXel Director
   mood language first, sliders second, hidden Advanced last).
4. Only 1–2 background colors across the whole product (deep space + panel glass).
5. Motion is always slow and elegant — no flashy, fast, or bouncy easing.
6. Poetic microcopy is a deliberate identity device, used sparingly (loading /
   status moments only) — never decorative filler.
7. The interface itself changes character with the selected Visual Engine — this
   is the product's signature interaction and must not be diluted.
8. Settings stays three sections, forever, unless the user explicitly asks to
   expand it.

---

## 10. Known Limitations (of this design package)

This package is a high-fidelity **design and interaction prototype**. It does not
include: real audio decoding/FFT/BPM/key detection, WebGL rendering, or video
encoding — those are software engineering work for the implementation phase.
All waveform/spectrum/analysis data shown is representative mock data tied to the
Golden Reference Track concept, built to demonstrate the intended experience.
