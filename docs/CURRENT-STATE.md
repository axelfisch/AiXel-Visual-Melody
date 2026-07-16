# AiXel Visual Melody — Current State and Next Handoff

**Checkpoint:** Export V1 — live render progress

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
- Minimal Album Art renderer shared by Preview and the current export implementation.
- Preview Player V1 extracted from `App.tsx`.
- Synchronized play, pause, seek, end-of-track handling, and smooth frame-time updates.
- Preview volume slider and mute control; listening volume does not alter export audio.
- Preview volume preference stored in local storage rather than the project model.
- Empty Preview state routes the user back to Analyze.
- 4K and 8K Preview options explicitly disabled until implemented.
- MP4 support detection extracted into `src/export/mediaRecorderSupport.ts`.
- MP4 recording and engine rendering extracted into `src/export/renderMp4.ts`.
- Export uses the project resolution, frame rate, bitrate, decoded audio buffer, and the same Minimal Album Art renderer as Preview.
- `ExportScreen.tsx` extracted from `App.tsx` without changing the approved Claude Design structure.
- `Render Progress` displays the actual 1280 × 720 canvas currently sent to `MediaRecorder`.
- Rendered time, percentage, completed, cancelled, unsupported, and failed states implemented.
- Active export cancellation connected through `AbortSignal`, with browser media resources released after completion or cancellation.

## Verification at checkpoint

- `npm run test:run`: 13 test files, 28 tests passing.
- `npm run build`: TypeScript and Vite production build passing.
- `git diff --check`: clean.
- Vite development server responding on port 5173.
- Golden Reference asset served as `audio/mp4`.
- Browser smoke test with “In the Spirit of Naomi”: real canvas visible at 1280 × 720, rendered time and progress advancing, cancellation confirmed and restart action restored.

## Exact next recommended step

Complete the **Export V1 acceptance pass** before starting another visual engine:

1. render the full Golden Reference to MP4 in Safari;
2. play the downloaded file from beginning to end;
3. verify audio presence, duration, final frame, and perceptible synchronization;
4. record any Safari-specific MediaRecorder limitation honestly;
5. use Claude Design only to review the existing live thumbnail, progress copy, and cancellation hierarchy;
6. after acceptance, begin the second deterministic visual engine in a separate checkpoint.

## Claude Design timing

The useful Export V1 review point has now been reached. Claude Design may review the existing live-render thumbnail, progress states, cancellation control, and transport hierarchy. Treat that review as validation of the approved system, not authorization to redesign it.

## Known limitations to preserve honestly

- Only Minimal Album Art is a functional render engine; the other five remain visual prototypes.
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

## Branch note

Export V1 work is developed on `agent/export-v1`, based on the merged Preview Player V1 checkpoint in `main`.
