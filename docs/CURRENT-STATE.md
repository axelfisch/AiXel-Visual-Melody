# AiXel Visual Melody — Current State and Next Handoff

**Checkpoint:** Jazz Geometry V1 — third deterministic visual engine

**Date:** 2026-07-16

**Local application:** `http://localhost:5173/#home`

## Completed through this checkpoint

- Master Design Package preserved in `design/`, `references/`, and `docs/`.
- React/Vite shell with hash navigation for Home, Analyze, Create, Preview, Export, and Settings.
- Project model, reducer, selectors, serialization boundary, and runtime object separation.
- Modular audio analysis pipeline: decoding, mono mix, waveform, energy, and MVP BPM estimation.
- Golden Reference web asset and Home-to-Preview flow for “In the Spirit of Naomi”.
- Stable visual-engine interface and registry.
- Minimal Album Art implemented as the first deterministic engine.
- The selected registered engine renderer is shared by Preview and Export.
- Preview Player V1 extracted from `App.tsx`.
- Synchronized play, pause, seek, end-of-track handling, and smooth frame-time updates.
- Preview volume slider and mute control; listening volume does not alter export audio.
- Preview volume preference stored in local storage rather than the project model.
- Empty Preview state routes the user back to Analyze.
- 4K and 8K Preview options explicitly disabled until implemented.
- MP4 support detection extracted into `src/export/mediaRecorderSupport.ts`.
- MP4 recording and engine rendering extracted into `src/export/renderMp4.ts`.
- Export uses the project resolution, frame rate, bitrate, decoded audio buffer, and the same selected engine renderer as Preview.
- `ExportScreen.tsx` extracted from `App.tsx` without changing the approved Claude Design structure.
- `Render Progress` displays the actual 1280 × 720 canvas currently sent to `MediaRecorder`.
- Rendered time, percentage, completed, cancelled, unsupported, and failed states implemented.
- Active export cancellation connected through `AbortSignal`, with browser media resources released after completion or cancellation.
- Export V1 accepted by the product owner with a browser-decoded WAV longer than four minutes; image, audio, live Render Progress, and MP4 download confirmed.
- Completed MP4 Blob retained for immediate download retry until Export closes.
- Cosmic Waves implemented as the second registered deterministic engine.
- Shared `EngineCanvas` makes Preview render the implemented engine selected in Create.
- Cosmic Waves uses deterministic particles, layered nebulas, and luminous waves driven by analyzed signal energy.
- Export and Render Progress receive the same selected engine and validated configuration used by Preview.
- Cosmic Waves MP4 accepted by the product owner with a real imported track.
- Analyze no longer forces Minimal Album Art after an import.
- Analyze reports tempo and dynamics from the real analysis, then routes forward to Create.
- Create displays the current imported project name instead of the hard-coded Golden Reference title.
- Engine choice now happens at the intended stage: after analysis and before Preview.
- Jazz Geometry implemented as the third registered deterministic engine.
- Concentric harmonic arcs, orbital accents, and the luminous core react to analyzed energy and tempo without random frame state.
- Preview, Render Progress, cancellation, and MP4 export all use the same Jazz Geometry renderer and validated configuration.
- The three remaining prototype selections safely fall back to Minimal Album Art in functional Preview/Export.

## Verification at checkpoint

- `npm test -- --run`: 15 test files, 31 tests passing.
- `npm run build`: TypeScript and Vite production build passing.
- `git diff --check`: clean.
- Vite development server responding on port 5173.
- Golden Reference asset served as `audio/mp4`.
- Browser smoke test: an analyzed Golden Reference enabled “Continuer vers Create”, routed to Create, and displayed the current project title with all six engine choices.
- Owner-supplied Cosmic Waves MP4 inspected at 1280 × 720, 216.275 seconds, H.264 video, and stereo 48 kHz Opus audio.
- Browser acceptance test: Jazz Geometry selected in Create, animated in synchronized Preview, appeared in the live Render Progress canvas, and returned to the ready state after cancellation.

## Exact next recommended step

Choose the **fourth deterministic visual engine** as a separate checkpoint, with Liquid Colors V1 as the leading candidate. Preserve the corrected Import → Analyze → Create → Preview → Export sequence. AiXel Director sliders remain a later integration step after enough real engine parameters exist to map them consistently.

## Claude Design timing

Jazz Geometry reuses the approved Preview and Export composition without structural changes. Claude Design may later review the motion character and visual balance of the engine itself. Treat that review as refinement within the approved system, not authorization to redesign the surrounding interface.

## Known limitations to preserve honestly

- Minimal Album Art, Cosmic Waves, and Jazz Geometry are functional render engines; the other three remain visual prototypes.
- Project persistence is session-only. Refreshing the page loses imported runtime objects and decoded buffers.
- Golden Reference can be loaded again from Home after a refresh.
- Direct import currently targets browser-decodable WAV, MP3, M4A/AAC, OGG, and FLAC files.
- MP4 audio extraction and automatic normalization remain backlog work.
- Current hard audio limits are 150 MB and 15 minutes.
- Native MP4 recording support varies by browser.

## Future work already recorded

See `PRODUCT-BACKLOG.md` for:

- MP4 audio extraction;
- automatic normalization and conversion;
- consolidation of useful services from other AiXel applications.
- the supplied AiXel Music Lab animated logo as a future family-brand reference.

## Branch note

Jazz Geometry V1 is developed on `agent/jazz-geometry-v1`, based on the merged Preview Player V1, Export V1, Cosmic Waves V1, and Analyze → Create checkpoints in `main`.
