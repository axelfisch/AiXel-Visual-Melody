# Changelog

## Export V1 — Live Render Progress

- Extracted native MP4 support detection and the MediaRecorder render service from `App.tsx`.
- Connected the actual encoded canvas to the existing Render Progress panel.
- Added rendered time, percentage, cancellation, and completed/cancelled/unsupported/failed states.
- Extracted `ExportScreen.tsx` without redesigning the Claude Design interface.
- Added MediaRecorder and Export screen tests, including active `AbortSignal` cancellation.

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
