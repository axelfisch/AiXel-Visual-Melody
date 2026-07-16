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

## Design Source of Truth

The approved **AiXel Visual Melody — Master Design Package V1.0** created with Claude Design remains the visual source of truth. Functional implementation must preserve its identity, hierarchy, and user experience unless the product owner explicitly requests a design change.

## V0.1 Functional Visual Shell

The React + Vite + TypeScript shell translates the approved visual direction into a navigable application surface:

- Home, Analyze, Create, Preview, Export, Settings, and Design System screens.
- Settings remains accessible from every screen.
- The six approved visual engines are present.
- Create includes engine-reactive theming for accent color, preview surface, and radius.
- The first complete functional chain now includes real browser audio analysis, synchronized Preview, and local MP4 rendering through the Minimal Album Art engine.

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

Export V1 displays the actual canvas being encoded, reports rendered time and progress, supports cancellation, handles completed, cancelled, unsupported, and failed states, and keeps a completed MP4 available for download retry until the Export screen closes. The next gate is full downloaded-file acceptance in Safari before beginning another deterministic visual engine.
