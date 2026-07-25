# AiXel Visual Melody

AiXel Visual Melody is a premium creative studio where music becomes living visual art.

**Tagline:** Transform Your Music Into Living Visuals.

## Core Philosophy

Music becomes Light.

Music becomes Motion.

Music becomes Emotion.

## Approved Workflow

The approved product workflow is:

Home
→ Analyze
→ Create
→ Preview
→ Export

Settings is accessible from every screen.

## Approved Visual Engines

1. Cosmic Waves
2. Jazz Geometry
3. Liquid Colors
4. Frequency City
5. Minimal Album Art
6. Neon Velvet

## Special Engine Concept

A seventh **Particle Orb Special** is recorded as a feasibility concept, not an implemented engine. Its supplied visual reference, target behavior, Director mapping, WebGL approach, and technical decision gate are documented in [`docs/PARTICLE-ORB-SPECIAL-CONCEPT.md`](docs/PARTICLE-ORB-SPECIAL-CONCEPT.md).

## Design Source of Truth

The approved **AiXel Visual Melody — Master Design Package V1.0** created with Claude Design remains the visual source of truth. Functional implementation must preserve its identity, hierarchy, and user experience unless the product owner explicitly requests a design change.

## V0.1 Functional Visual Shell

The React + Vite + TypeScript shell translates the approved visual direction into a navigable application surface:

- Home, Analyze, Create, Preview, Export, Settings, and Design System screens.
- Settings remains accessible from every screen.
- The six approved visual engines are present.
- Create includes engine-reactive theming for accent color, preview surface, and radius.
- The complete functional chain now includes real browser audio analysis, synchronized Preview, and local MP4 rendering through all six deterministic engines: Cosmic Waves, Jazz Geometry, Liquid Colors, Frequency City, Minimal Album Art, and Neon Velvet.

Run locally with:

```bash
npm install
npm run dev
```

## Repository Structure

```text
AiXel-Visual-Melody/
├── design/
├── docs/
├── references/
│   └── screenshots/
├── archive/
├── public/
├── src/
└── README.md
```

## Current Functional Checkpoint

Neon Velvet V1 completes the first functional six-engine set. Analyze hands an analyzed track to Create without forcing a visual choice; Create displays the imported track name and lets the user choose the engine before Preview. Every approved engine now drives the same audio-reactive renderer path in Preview, Render Progress, and the downloaded MP4.
