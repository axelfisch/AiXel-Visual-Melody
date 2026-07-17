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
- The complete functional chain now includes real browser audio analysis, synchronized Preview, and local MP4 rendering through five deterministic engines: Minimal Album Art, Cosmic Waves, Jazz Geometry, Liquid Colors, and Frequency City.

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

Frequency City V1 is the fifth functional engine. Analyze hands an analyzed track to Create without forcing a visual choice; Create displays the imported track name and lets the user choose the engine before Preview. Minimal Album Art, Cosmic Waves, Jazz Geometry, Liquid Colors, and Frequency City each drive the same audio-reactive renderer in Preview, Render Progress, and the downloaded MP4. Neon Velvet is now the only remaining visual prototype.
