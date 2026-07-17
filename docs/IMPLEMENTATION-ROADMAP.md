# Implementation Roadmap

## Phase 1: Design Preservation

- Create the repository structure.
- Reserve locations for approved `.dc.html` screens, support files, screenshots, logo references, and the original design archive.
- Document the product vision, workflow, component map, and visual engines.
- Keep the checkpoint design-only.

## Phase 2: React + Vite Implementation

Exact next task:

Scaffold a React + Vite application and faithfully migrate the approved Master Design Package V1.0 `.dc.html` screens into React components, preserving the approved visual direction and workflow while using non-production sample data only.

Do not begin real audio analysis or video rendering in this phase.

## Later Phases

- Real browser audio analysis implemented for the first functional chain.
- Preview Player V1 implemented and merged into `main`.
- Export V1 live canvas, progress, cancellation, download retry, and terminal states implemented and merged into `main` after owner acceptance.
- Cosmic Waves V1 implemented as the second deterministic engine on `agent/cosmic-waves-v1`.
- Next engine work should begin only after Cosmic Waves Preview and MP4 acceptance.
- Track approved future additions and their integration timing in `PRODUCT-BACKLOG.md`.
