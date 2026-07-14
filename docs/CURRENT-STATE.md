# AiXel Visual Melody — Current State and Next Handoff

**Checkpoint:** Preview Player V1

**Date:** 2026-07-14

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

## Verification at checkpoint

- `npm run test:run`: 10 test files, 19 tests passing.
- `npm run build`: TypeScript and Vite production build passing.
- `git diff --check`: clean.
- Vite development server responding on port 5173.
- Golden Reference asset served as `audio/mp4`.

## Exact next recommended step

Start **Export V1 unification**, without beginning automatic transcoding yet:

1. extract `src/export/mediaRecorderSupport.ts`;
2. extract `src/export/renderMp4.ts` from `App.tsx`;
3. pass project, runtime audio buffer, engine, progress callback, and `AbortSignal`;
4. display the real rendering canvas in `Render Progress`;
5. add elapsed/rendered time and clear completed, cancelled, unsupported, and failed states;
6. verify that Preview and Export call the same engine renderer with equivalent frames;
7. add unit tests with `MediaRecorder` mocked;
8. extract `ExportScreen.tsx` after the service boundary is stable.

Stop after Export V1 is verified. Do not begin the second visual engine in the same step.

## Claude Design timing

Do not reopen Claude Design for the service extraction itself. Use it at the Export V1 visual checkpoint, once the real live-render thumbnail, progress states, cancellation control, and transport hierarchy exist. That is the useful moment to compare and polish Preview and Export together without redesigning unstable internals.

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

- the live Export thumbnail;
- MP4 audio extraction;
- automatic normalization and conversion;
- consolidation of useful services from other AiXel applications.

## Working-tree note

This checkpoint includes uncommitted work built on the earlier local React migration. Preserve the current working tree when resuming. Do not reset or discard unrelated changes. Commit and publish only when explicitly requested by the product owner.
