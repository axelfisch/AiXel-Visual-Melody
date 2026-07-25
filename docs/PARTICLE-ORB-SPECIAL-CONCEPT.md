# Particle Orb Special — Reference Concept

**Status:** Reference captured; feasibility reviewed; implementation not started.

**Product intent:** Add a seventh, clearly identified special visual engine after the existing six-engine family. The target is a luminous, music-reactive 3D particle sphere rather than a replacement for Cosmic Waves or Jazz Geometry.

## Supplied reference

- Original reference: owner-supplied 29.5-second vertical MP4 screen recording, 1170 × 2532, HEVC.
- Repository still: [`../references/Particle-Orb-Special-Reference.png`](../references/Particle-Orb-Special-Reference.png)
- The original MP4 remains outside the repository to avoid adding a 30 MB screen recording containing unrelated application UI.

## Visual characteristics to preserve

- A centered spherical volume made from thousands of pale-blue points.
- A translucent mesh or ribbon envelope flowing around and through the particle sphere.
- Slow orbital rotation with continuous surface deformation.
- Depth created by point scale, opacity, glow, and occlusion rather than a flat circular mask.
- A restrained dark background and a soft halo around the sphere.
- Motion that feels organic and premium, not like a generic equalizer.

## Feasibility

The concept is feasible in the current React/Vite application, but the best-quality implementation should use a GPU-backed WebGL canvas. A small custom WebGL renderer is possible, while a focused Three.js implementation would reduce shader, camera, buffer, and device-compatibility work.

Recommended rendering model:

1. Generate a deterministic Fibonacci sphere or subdivided icosphere point cloud.
2. Deform vertex positions in a vertex shader with layered simplex/curl noise.
3. Add one or two translucent ribbon shells with a separate shader.
4. Drive displacement, point size, glow, rotation, and turbulence from analyzed energy, BPM, and AiXel Director values.
5. Render Preview and MP4 from the same deterministic time/configuration contract used by the existing engines.
6. Provide a reduced-density fallback for mobile and export stability.

## Proposed Director mapping

- Emotion → deformation depth and halo softness
- Space → sphere scale and camera distance
- Fluidity → noise speed and ribbon continuity
- Light → point brightness and bloom strength
- Dynamics → audio-energy displacement
- Particles → point count/density
- Color Energy → palette saturation and accent mixing
- Motion Complexity → noise octaves and shell turbulence

## Main risks to prototype first

- Reliable WebGL capture through `canvas.captureStream()` and `MediaRecorder` on Safari/iPhone.
- Stable 1280 × 720 real-time export without dropped frames.
- GPU load from transparent particles, glow, and multiple shells.
- Deterministic rendering across Preview, Render Progress, and exported MP4.
- Graceful fallback if WebGL is unavailable or context creation fails.

## Recommended decision gate

Build a short technical spike before integrating the seventh engine into the product:

- one sphere;
- one ribbon shell;
- 8,000–20,000 adaptive particles;
- one audio-energy input;
- one Director palette;
- a five-second first-attempt MP4 export test on desktop Safari.

Proceed to full engine integration only if the spike holds frame rate and produces a valid first MP4 export.
