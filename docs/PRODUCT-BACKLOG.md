# AiXel Visual Melody — Product Backlog

This document records approved product ideas, their architectural constraints, and the phase in which they should be considered. An item in this backlog is not automatically a commitment to copy an earlier implementation unchanged.

## Decision principles

- Reuse proven ideas from other AiXel products, but audit and adapt their code before integration.
- Keep Preview and Export driven by the same visual-engine renderer.
- Protect browser responsiveness and memory use, especially on an 8 GB Apple Silicon machine.
- Prefer one coherent ingestion pipeline over format-specific exceptions in screen components.

## B1 — Simple Preview volume control

**Status:** Implemented in Preview Player V1 on 2026-07-14.

Add a compact volume control to the Preview transport:

- speaker/mute button;
- simple `0–100%` slider;
- control the preview `<audio>` element only;
- do not alter the project audio or the exported soundtrack level;
- optionally remember the UI preference locally, outside the serialized project.

Implemented with `useSynchronizedPlayback`: volume and mute affect Preview only, and the volume preference is stored locally outside the project model.

## B2 — Live thumbnail during MP4 rendering

**Status:** Implemented in Export V1 and accepted by the product owner on 2026-07-16.

The `Render Progress` panel should display the actual canvas frame currently being encoded. It must reuse the canvas and engine frame used by `renderMp4`; it must not run a second decorative preview or a separate renderer.

The panel should also show:

- percentage and elapsed/rendered time;
- current frame or timecode;
- rendering, completed, cancelled, and failed states;
- cancellation when `AbortSignal` support is connected.

Implemented with the same canvas passed to `MediaRecorder`, structured progress events, rendered time, accessible progress state, and completed, cancelled, unsupported, and failed outcomes.

**Best integration point:** extraction of `src/export/renderMp4.ts` and `RenderProgress`.

## B3 — Audio/video ingestion and automatic normalization

**Status:** Accepted for technical design after the current audio pipeline is stable.

Goal: when a source is decodable but does not match the working constraints, offer or perform a controlled normalization instead of rejecting it immediately.

Planned ingestion sequence:

1. inspect container, MIME type, duration, streams, sample rate, channels, and size;
2. use direct browser decoding when compatible;
3. extract the audio stream from video containers such as MP4;
4. normalize only when required;
5. analyze the normalized working asset;
6. preserve the original source separately whenever possible;
7. report exactly what was changed.

### Current and candidate limits

- Current hard limit: 150 MB and 15 minutes.
- Current recommended formats: WAV, MP3, M4A/AAC, OGG, and FLAC when browser-decodable.
- Candidate normalization target: 48 kHz working sample rate.
- PCM bit depth is not an analysis setting in Web Audio: decoded samples are handled as floating-point data. “24-bit” only applies when writing a PCM file such as WAV.
- The proposed 8-minute conversion limit should be benchmarked before replacing the current 15-minute ceiling. Real-time MP4 rendering duration and memory use matter more than the file header alone.

### Implementation constraint

Web Audio cannot convert a codec that the browser cannot decode. Broad fallback support will require either:

- FFmpeg/WASM in a Web Worker, with explicit memory and progress controls; or
- a server-side transcoding service for large or unsupported sources.

This work must not run synchronously on the main UI thread.

### Provided reference case

- Source: `A-Capella-in-SummerIsland.mp4`
- Container: MP4
- Video: H.264, 1280 × 720
- Audio: AAC stereo, 44.1 kHz, approximately 191 kb/s
- Duration: approximately 2:56

Expected future behavior: extract the AAC audio stream, normalize only if necessary, then continue to Analyze without requiring the user to create another file manually.

## B4 — Consolidating useful capabilities from other AiXel apps

**Status:** Strategic direction; audit case by case.

Reference application supplied by the product owner:

- `https://aixelmusicgenerator-g7wo.bolt.host/`
- Relevant capability: resilient import and conversion of files that exceed the target format, duration, or size.

Before importing code from an older project:

1. obtain the complete source files and dependency list;
2. identify the reusable service rather than copying the screen;
3. check licenses, browser APIs, backend dependencies, and security assumptions;
4. compare it with the current AiXel project model and audio pipeline;
5. port tests first, then adapt the implementation.

The long-term goal is to consolidate the strongest capabilities of the existing AiXel projects into a smaller set of coherent products, without turning Visual Melody into an unfocused collection of unrelated tools.

## B5 — AiXel Music Lab animated brand reference

**Status:** Reference preserved; not integrated into the current Claude Design interface.

Supplied on 2026-07-16:

- still source name: `IMG_1590.JPG`;
- animation source name: `_users_59c16057-deaf-4e78-a3ca-d3eeae117e68_generated_d376a6f3-a22d-43c8-b809-3b293cec2aa4_generated_video.MP4`;
- square still reference, originally 1024 × 1024;
- animated MP4 reference, 960 × 960, 6.04 seconds;
- H.264 video with AAC audio;
- metallic circular AiXel monogram, piano keys, musical staff, waveform, and cyan/violet/gold cosmic light;
- visible product name: “AiXel Music Lab”.

The asset is visually strong but belongs to a broader Music Lab identity and is more metallic/cosmic than the restrained Visual Melody navigation brand. Do not replace the current Visual Melody logo or insert this animation into the workflow without an explicit branding decision aligned with the Claude Design source of truth. Candidate future uses include an AiXel Studio family ident, splash animation, or end-card after a dedicated brand review.

## B6 — Analyze → Create workflow clarity

**Status:** Implemented on 2026-07-16.

Analyze must explain the detected musical profile without selecting a visual engine on the user’s behalf. Its forward action routes to Create, where the imported track title and all six engine choices are visible. Preview remains the first stage that presents the selected functional renderer with synchronized audio.

AiXel Director fine-tuning now activates only controls mapped honestly to the selected engine; unsupported dimensions remain disabled.

## B7 — Jazz Geometry V1

**Status:** Implemented on 2026-07-16.

Jazz Geometry is the third deterministic renderer. Its concentric arcs, orbital accents, central geometry, glow, and scale respond to analyzed energy and tempo. Create selection, synchronized Preview, live Render Progress, cancellation, and MP4 export all use the same registered engine without changing the approved Claude Design interface.

The first public YouTube visualizer produced with this engine, “The God Code (Ouf! Boom!)”, was published by the product owner on 2026-07-17.

## B8 — Liquid Colors V1

**Status:** Implemented on 2026-07-17.

Liquid Colors is the fourth deterministic renderer. Layered organic ink fields, continuous orange–magenta–indigo bands, glowing ribbons, and restrained droplets respond to analyzed energy and tempo. Create selection, synchronized Preview, live Render Progress, cancellation, and MP4 export all use the same registered engine without changing the approved Claude Design interface.

## B9 — Frequency City V1

**Status:** Implemented on 2026-07-17.

Frequency City is the fifth deterministic renderer. Twenty-four independently pulsing buildings form a true architectural skyline with illuminated windows, antennas, magenta–cyan–violet facades, and a cyan perspective horizon. Create selection, synchronized Preview, live Render Progress, cancellation, and MP4 export all use the same registered engine without changing the approved Claude Design interface.

The product owner accepted a 5:46 real-track MP4 export with successful QuickTime playback on 2026-07-17. PR #7 was then merged into `main`.

## B10 — Neon Velvet V1

**Status:** Accepted and merged on 2026-07-17.

Neon Velvet is the sixth deterministic renderer. Elegant cyan, violet, and magenta paths flow across a deep-purple velvet field with traveling highlights, restrained particles, and glow driven by analyzed energy and tempo. Create selection, synchronized Preview, live Render Progress, cancellation, and MP4 export all use the same registered engine without changing the approved Claude Design interface.

The product owner accepted the renderer on 2026-07-17. PR #8 was then merged into `main`, completing the first functional six-engine set.

## B11 — AiXel Director V1

**Status:** Accepted and merged through PR #10.

Director uses eight normalized creative dimensions and six complete mood profiles. Its V1 contract translates only supported dimensions into real engine parameters: Fluidity and Dynamics across all six engines, plus Particles or Motion Complexity when a renderer exposes a meaningful density or count. Emotion, Space, Light, and Color Energy remain intentionally unmapped until explicit renderer parameters exist.

Director state now persists with migration-safe defaults. Mood profiles and supported sliders update validated engine parameters immediately; engine changes preserve and remap the normalized intent. Preview, Render Progress, and Export share the identical mapped configuration without changing the approved Claude Design composition.

## B12 — Export End Card V1

**Status:** Accepted and merged through PR #12.

Every MP4 exported by the free version ends with a restrained three-second brand card rendered directly into the same export canvas:

- `Visual created with AiXel Visual Melody`;
- `Music by Axel Fisch`.

The card preserves the selected export resolution and frame rate. It begins after the original source audio ends, while the audio destination continues silently for the three-second credit. Progress duration, live Render Progress, cancellation, resource cleanup, and the downloaded MP4 all use the extended timeline. A future project metadata setting should replace the default artist name for other users; the free-version AiXel attribution remains automatic.

## B13 — MVP localization and export-session guidance

**Status:** Implemented in the MVP release candidate; production validation pending.

The complete interface supports French and English through a compact persistent selector in the approved navigation. Export warns users to keep the rendering tab visible and active because browser background throttling can freeze a canvas-based video even while audio processing continues. The encoder now also repaints and requests its first frame immediately after `MediaRecorder` starts to strengthen fresh-session export reliability.

## B14 — Project Identity V1

**Status:** Next checkpoint after MVP deployment validation.

Add editable project-level track title and artist identity with migration-safe defaults. Preview, the exported filename, and End Card attribution must consume the same project metadata. Preserve automatic AiXel Visual Melody attribution in the free MVP and do not redesign the approved Claude Design screens.

## B15 — iPhone and iPad audio-file picker compatibility

**Status:** Implemented; physical-device Netlify validation pending.

Replace the `audio/*` file-input wildcard with explicit supported extensions. This avoids WebKit bug 242110, which incorrectly presents video files for `accept="audio/*"` on iOS and iPadOS. File size, extension/MIME validation, browser decoding, and the 15-minute duration limit remain enforced after selection.

## B16 — Private-test sharing identity

**Status:** Implemented; Netlify validation pending.

Provide a branded favicon, Apple touch icon, canonical Netlify URL, and a 1200 × 630 social sharing image through Open Graph and Twitter Card metadata. This gives private-test links a recognizable AiXel Visual Melody identity without changing the Claude Design application interface or beginning the later public marketing campaign.
