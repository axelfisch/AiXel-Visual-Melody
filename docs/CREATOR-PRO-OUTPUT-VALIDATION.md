# Creator Pro output validation

Creator Pro purchase enablement remains **off** until the full physical-browser and visual-review evidence is recorded. The source of truth is `public/creator-pro-output-readiness.json`; the application-side gate mirrors it in `src/export/purchasePrerequisites.ts`.

## Automated evidence

- Six engines render without an exception at 16:9, 9:16, and 1:1.
- 720p uses 30 fps at 6 Mbps.
- 1080p uses 30 fps at 12 Mbps and real 1920×1080, 1080×1920, or 1080×1080 frames.
- Preview and Export receive the same engine configuration and project frame geometry.
- Free output always adds the three-second AiXel card.
- Artist output uses project artist/title identity; clean output adds no card frames.
- Preflight rejects inconsistent dimensions, unsupported profiles/codecs, tracks over 15 minutes, insufficient declared memory, or absent browser capture APIs before rendering begins.

## Required physical matrix

Record browser version, operating system, device/RAM, a 15-minute completion result, output duration, audio/video synchronization, resulting pixel dimensions, and peak observed memory for each row:

| Browser | 16:9 1080p | 9:16 1080p | 1:1 1080p | Evidence |
|---|---:|---:|---:|---|
| Safari current | Pending | Pending | Pending | — |
| Chrome current | Pending | Pending | Pending | — |
| Edge current | Pending | Pending | Pending | — |
| Firefox current | Pending | Pending | Pending | — |

Run all six engines for visual composition at each aspect ratio. Approval requires no clipping of titles, focal content, or artist end-card copy. Attach screenshots or recordings to the Ticket 08 review and replace each pending result only with reproducible evidence.

Do not set `satisfied` to `true` until every required browser row and the 18 engine/aspect visual reviews are approved. Paid status must never bypass a failed device preflight.
