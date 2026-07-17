# AiXel Visual Melody — Current State and Next Handoff

**Checkpoint:** AiXel Director V1 — functional Create integration after six engines

**Date:** 2026-07-17

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
- “The God Code (Ouf! Boom!)” was exported with Jazz Geometry and published by the product owner as the first public YouTube visualizer created with AiXel Visual Melody.
- Liquid Colors implemented as the fourth registered deterministic engine.
- Layered organic ink fields and continuous orange–magenta–indigo bands react to analyzed energy and tempo without random frame state.
- Preview, Render Progress, cancellation, and MP4 export all use the same Liquid Colors renderer and validated configuration.
- Liquid Colors MP4 and QuickTime playback accepted by the product owner after a successful real-track re-export.
- Frequency City implemented as the fifth registered deterministic engine.
- Twenty-four independently pulsing buildings, luminous windows, antennas, a dark skyline, and cyan perspective horizon react to analyzed energy and tempo without random frame state.
- Preview, Render Progress, cancellation, and MP4 export all use the same Frequency City renderer and validated configuration.
- Frequency City MP4 accepted by the product owner with a real 5:46 track and successful QuickTime playback.
- Frequency City PR #7 merged into `main` at `619d7f1`.
- Neon Velvet implemented as the sixth registered deterministic engine.
- Deep-purple velvet folds and cyan–violet–magenta synthwave paths use deterministic curvature, glow, traveling dash offsets, and musical energy response.
- Preview, Render Progress, cancellation, and MP4 export all use the same Neon Velvet renderer and validated configuration.
- All six approved visual selections now resolve to their own functional renderer; no prototype fallback remains in the approved engine catalog.
- Neon Velvet MP4 accepted by the product owner and PR #8 merged into `main` at `0f4bb61`.
- AiXel Director now has a pure, tested translation contract above all six renderer configurations.
- Eight normalized creative dimensions and six complete mood profiles are defined without activating the existing read-only controls.
- Fluidity and Dynamics map to real parameters on every engine; Particles and Motion Complexity map only where the engine exposes a meaningful density or count.
- Unsupported dimensions remain explicit instead of producing decorative or misleading UI behavior.
- Director mood and normalized values are now stored in the project model with migration-safe defaults.
- All six mood buttons apply the tested translation contract immediately in Create.
- Supported sliders update the selected engine configuration immediately and switch the Director into a custom state.
- Unsupported sliders remain visible but disabled, preserving the approved Claude Design composition honestly.
- Changing engines preserves the Director intent and remaps it to the new engine's validated parameters.
- Preview, Render Progress, and Export all consume the identical mapped `project.engine.parameters` object.
- The export canvas is seeded with a deterministic first frame before `captureStream()` and `MediaRecorder` initialization, addressing the reproduced Netlify first-export audio-only container issue.

## Verification at checkpoint

- `npm test -- --run`: 19 test files, 46 tests passing.
- `npm run build`: TypeScript and Vite production build passing.
- `git diff --check`: clean.
- Vite development server responding on port 5173.
- Golden Reference asset served as `audio/mp4`.
- Browser smoke test: an analyzed Golden Reference enabled “Continuer vers Create”, routed to Create, and displayed the current project title with all six engine choices.
- Owner-supplied Cosmic Waves MP4 inspected at 1280 × 720, 216.275 seconds, H.264 video, and stereo 48 kHz Opus audio.
- Browser acceptance test: Jazz Geometry selected in Create, animated in synchronized Preview, appeared in the live Render Progress canvas, and returned to the ready state after cancellation.
- Browser acceptance test: Liquid Colors selected in Create, animated in synchronized Preview, filled the live Render Progress canvas with evolving liquid bands, and returned to the ready state after cancellation.
- Browser smoke test: Frequency City selected in Create, identified correctly in synchronized Preview, and exposed the existing Render Progress and cancellation path without changing the Claude Design screen structure.
- Browser acceptance smoke test: Neon Velvet selected in Create, displayed its own identity and poetic line in Preview, and animated its synthwave trails during synchronized Golden Reference playback in the narrow responsive layout.
- Browser smoke test: Minimal Album Art exposed only Fluidity and Dynamics; Cosmic Waves additionally exposed Particles and Motion Complexity; a mood profile updated all normalized values; Preview opened without console errors.

## Exact next recommended step

Owner-test **AiXel Director V1** with a real imported track: apply multiple profiles and supported sliders in Create, confirm immediate motion changes in Preview, then export a short MP4 and compare the rendered motion. After acceptance, merge the integration PR. Settings remains a later step.

## Claude Design timing

Neon Velvet reuses the approved Preview and Export composition without structural changes. Claude Design may later review the motion character and visual balance of the completed six-engine family. Treat that review as refinement within the approved system, not authorization to redesign the surrounding interface.

## Known limitations to preserve honestly

- All six approved visual engines are functional and merged. Director V1 intentionally leaves Emotion, Space, Light, and Color Energy disabled until engines expose honest renderer parameters for them.
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

The AiXel Director V1 functional integration is developed on `agent/aixel-director-v1-integration`, based on the merged mapping contract in `main` at `c0f71fa`.
