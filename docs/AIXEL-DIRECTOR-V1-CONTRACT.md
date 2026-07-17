# AiXel Director V1 — Technical Mapping Contract

## Purpose

AiXel Director is a common creative language above six visually different engines. A Director control must change a real renderer parameter; it must never pretend that every visual world supports the same behavior.

This checkpoint defines and tests the translation contract. It deliberately does not activate the existing read-only sliders or change the Claude Design interface.

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

Applying a mood profile and persisting Director state in the project model belong to the next implementation checkpoint.

## Next implementation checkpoint

1. Add Director state to the project schema with migration-safe defaults.
2. Apply mood profiles through the pure mapping layer.
3. Activate only supported sliders for the selected engine.
4. Preview changes immediately through the existing shared renderer.
5. Ensure Export receives the identical mapped engine configuration.
6. Add screen-level tests before changing any visual treatment.
