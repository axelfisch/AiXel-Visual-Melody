# Changelog

## Particle Orb Special — Reference and Feasibility

- Captured a repository-safe still from the owner-supplied particle-sphere MP4 reference without committing the 30 MB screen recording or its unrelated application UI.
- Documented the seventh special-engine intent, visual characteristics, proposed Director mapping, WebGL rendering approach, technical risks, and decision gate.
- Kept the concept explicitly reference-only; no seventh engine implementation or registry change is included in this checkpoint.

## Create Preview + First-Export Reliability

- Blended the approved Home artwork into all six animated Create previews so every composition remains complete at the studio aspect ratio while preserving its existing motion layer.
- Strengthened first-run MP4 capture by using an explicitly driven canvas video track, waiting for `MediaRecorder` to start, and submitting two painted video frames before starting audio.
- Applied the active engine accent colors to the left and right export background and to the AiXel end card, keeping the encoded MP4 visually consistent with the selected Director palette.
- Added explicit Netlify Vite build and `dist` publish settings for reproducible production deploys.

## AiXel Director V2 — Every Fader Functional + Color Palette

- Rewired the Director mapping contract so all eight dimensions (Emotion, Space, Fluidity, Light, Dynamics, Particles, Color Energy, Motion Complexity) drive real, validated parameters on every one of the six engines — no fader is disabled anymore.
- Added five new universal renderer parameters (`glowIntensity`, `spaceScale`, `colorSaturation`, `sparkleDensity`, `warmth`) shared by every engine, plus a `grooveDetail` structure parameter for Minimal Album Art so Motion Complexity has something to drive there too.
- Added shared rendering helpers (`adjustSaturation`, `drawAmbientSparkles`, `applyWarmthOverlay`) so accent-color saturation, ambient sparkle density, and a warm/cool emotional tint are consistent across all engines.
- Added a five-color palette picker to AiXel Director (Aurora Violet, Solar Gold, Emerald Tide, Crimson Velvet, Glacier Mono) that applies its colors across the active engine's accent slots in one click.
- Added an `UPDATE_ENGINE_PARAMETERS` reducer action to patch several engine parameters atomically for palette application.

## AiXel Director V1 — Functional Create Integration

- Persisted Director mood and normalized values in the project model with backward-compatible migration of the legacy mood parameter.
- Made all six mood profiles apply real, validated renderer parameters immediately from Create.
- Activated only the sliders honestly supported by the selected engine; unsupported dimensions remain visible and disabled.
- Kept engine changes, Preview, Render Progress, and Export on the same mapped configuration without changing the Claude Design interface.
- Seeded the export canvas before recorder initialization to prevent a first Netlify MP4 from being recognized as audio-only by QuickTime.

## AiXel Director V1 — Technical Mapping Contract

- Added normalized eight-dimension Director state and six complete mood profiles.
- Added tested engine adapters for all six visual engines without activating the existing read-only controls.
- Mapped Fluidity and Dynamics everywhere, plus only the structure dimensions supported honestly by each renderer.
- Documented the capability matrix and the project-model/UI integration sequence for the next checkpoint.

## Neon Velvet V1 — Sixth Deterministic Engine

- Added Neon Velvet as the sixth implemented `VisualEngine` with glamorous synthwave paths flowing across deep purple velvet.
- Made cyan, violet, and magenta trail glow, curvature, traveling highlights, and motion respond deterministically to analyzed energy and tempo.
- Connected Neon Velvet to the existing Create, Preview, Render Progress, cancellation, and synchronized MP4 export chain.
- Completed the first functional set of all six approved visual engines without changing the Claude Design interface.

## Frequency City V1 — Fifth Deterministic Engine

- Added Frequency City as the fifth implemented `VisualEngine` with a real architectural skyline, luminous windows, antennas, and a perspective horizon.
- Made the twenty-four independent buildings pulse deterministically from analyzed energy and tempo in magenta, cyan, and violet.
- Connected Frequency City to the existing Create, Preview, Render Progress, cancellation, and synchronized MP4 export chain.
- Preserved the approved Claude Design composition and kept Neon Velvet as the only remaining prototype fallback.

## Liquid Colors V1 — Fourth Deterministic Engine

- Added Liquid Colors as the fourth implemented `VisualEngine` with layered organic ink fields and continuous orange–magenta–indigo bands.
- Made flow, folding, glow, droplets, and band amplitude respond deterministically to analyzed energy and tempo.
- Connected Liquid Colors to the existing Create, Preview, Render Progress, cancellation, and synchronized MP4 export chain.
- Preserved the approved Claude Design composition and kept Frequency City and Neon Velvet as safe prototype fallbacks.

## Jazz Geometry V1 — Third Deterministic Engine

- Added Jazz Geometry as the third implemented `VisualEngine` with concentric harmonic arcs, orbital accents, and a luminous geometric core.
- Made rotation, ring motion, glow, and scale react deterministically to the analyzed audio energy and tempo.
- Connected Jazz Geometry to the existing Create, Preview, Render Progress, cancellation, and synchronized MP4 export chain.
- Preserved the approved Claude Design screen composition and kept Liquid Colors, Frequency City, and Neon Velvet as safe prototype fallbacks.

## Analyze → Create Workflow Handoff

- Removed the premature “Prévisualiser Minimal Album Art” action from Analyze.
- Stopped forcing Minimal Album Art whenever a new audio file finishes analysis.
- Added a real tempo/dynamics summary followed by “Continuer vers Create”.
- Made the Create screen title follow the imported project track instead of always showing the Golden Reference.

## Cosmic Waves V1 — Second Deterministic Engine

- Added Cosmic Waves as the second implemented `VisualEngine` with deterministic particles, nebulas, and audio-reactive light waves.
- Added shared `EngineCanvas` rendering so Preview follows the implemented engine selected in Create.
- Connected the selected implemented engine and its validated configuration to MP4 Export and Render Progress.
- Preserved Minimal Album Art as the safe fallback for the four remaining prototype engines.
- Recorded the supplied AiXel Music Lab logo animation as a future brand reference without changing the Claude Design interface.

## Export V1 — Live Render Progress

- Extracted native MP4 support detection and the MediaRecorder render service from `App.tsx`.
- Connected the actual encoded canvas to the existing Render Progress panel.
- Added rendered time, percentage, cancellation, and completed/cancelled/unsupported/failed states.
- Extracted `ExportScreen.tsx` without redesigning the Claude Design interface.
- Added MediaRecorder and Export screen tests, including active `AbortSignal` cancellation.
- Kept the completed MP4 Blob available for an immediate retry from the existing export control instead of revoking it after one second.

## v0.1.0 - React + Vite + TypeScript Functional Visual Shell

- Added the Vite, React, and TypeScript application scaffold.
- Implemented the approved Home, Analyze, Create, Preview, Export, Settings, and Design System shell screens.
- Added engine-reactive theming for the six approved visual engines.
- Kept audio analysis, preview rendering, and export rendering as sample-only shell states.

## v1.0.0-design - Prepared

- Established the AiXel Visual Melody repository structure.
- Added documentation for the approved product statement, workflow, and visual engines.
- Reserved source locations for the Master Design Package V1.0 design assets.
- Marked this checkpoint as design-only.
