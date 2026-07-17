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

AiXel Director fine-tuning remains intentionally read-only until its common controls can be mapped honestly to multiple implemented engine configurations.
