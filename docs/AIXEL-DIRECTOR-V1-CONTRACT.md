# AiXel Director V1 — Technical Mapping Contract

## Purpose

AiXel Director is a common creative language above six visually different engines. A Director control must change a real renderer parameter; it must never pretend that every visual world supports the same behavior.

The translation contract is implemented and tested. The functional integration activates only supported sliders while preserving the Claude Design interface.

## Eight creative dimensions

- Emotion
- Space
- Fluidity
- Light
- Dynamics
- Particles
- Color Energy
- Motion Complexity

All eight dimensions are stored as normalized values from `0` to `100` and are available to the six mood profiles. V1 only maps dimensions supported by existing engine parameters.

## Honest V1 capability matrix

| Engine | Fluidity | Dynamics | Particles | Motion Complexity |
| --- | --- | --- | --- | --- |
| Minimal Album Art | rotation speed | energy response | — | — |
| Cosmic Waves | wave speed | energy response | particle density | particle-density refinement |
| Jazz Geometry | rotation speed | energy response | — | ring count |
| Liquid Colors | flow speed | energy response | ink-density influence | ink density |
| Frequency City | pulse speed | energy response | — | building count |
| Neon Velvet | trail speed | energy response | — | trail count |

Emotion, Space, Light, and Color Energy remain intentionally unmapped in this contract. They require explicit renderer parameters in a later refinement; until then the UI must communicate that they are unavailable or avoid activating them.

## Mapping rules

- `50%` preserves each engine's approved default value.
- Values below and above `50%` interpolate toward the engine's declared minimum and maximum.
- Engine step sizes and validators remain authoritative.
- Existing colors, title visibility, and unrelated engine settings are preserved.
- Structure controls combine only where the engine already exposes a meaningful density or count.
- Unknown engines and missing numeric definitions fail explicitly.

## Mood profiles

The six approved mood buttons produce complete eight-dimension profiles:

- More Cinematic
- More Emotional
- More Dreamy
- More Powerful
- More Organic
- More Minimal

Applying a mood profile now persists the complete Director state in the project model and immediately maps it to validated engine parameters.

## Functional integration

1. Director state is part of the project schema with migration-safe defaults for existing serialized projects.
2. Mood profiles pass through the pure mapping layer and update state and renderer parameters atomically.
3. Only supported sliders are active for the selected engine; unsupported controls stay visible and disabled.
4. A manual slider change preserves the full normalized state and clears the selected preset mood to represent a custom Director state.
5. Engine changes preserve creative intent and remap it through the selected engine adapter.
6. Preview and Export consume the same mapped `project.engine.parameters`; no parallel export-only configuration exists.
