# 2026-11-04 19h31 — Wheel tooltips, label overlap fix, outer ring fix

**User:** nigelfreddy

## What was asked

Three fixes to the feelings wheel SVG:
1. Tooltips on hover with emotion name + brief description
2. Fix outer ring appearing incomplete
3. Fix label overlap in all rings, especially the narrow spec (outer) ring

## What was done

### wheelMath.ts — `describeArc` gap parameter
The `gap` value (0.012) was hardcoded and applied uniformly to all rings. With ~68 specific emotions in the outer ring, each segment spans only ~0.092 rad; a 0.012 gap on each side consumed ~26% of the segment, creating visually thin and incomplete-looking arcs that roughjs struggled to fill cleanly.

Changed `gap` to an optional parameter with a default of `0.004`. The call sites now pass ring-appropriate values:
- Core: `GAP_CORE = 0.012` (wide segments, breathing room looks good)
- Mid: `GAP_MID = 0.008` (medium segments)
- Spec: `GAP_SPEC = 0.003` (very narrow segments — needs tight tiling)

### FeelingsWheel.tsx — spec ring labels (radial spokes)
The spec ring previously used `<textPath href="...">` arc-following text. At the spec ring radius (~327px), each segment's arc length is only ~30px — far too short for even a 5-character label at 9px font without overflow and overlap.

Replaced with a radial label approach:
- `radialLabelTransform(midAngleRad, radius)` computes `translate(CX,CY) rotate(angleDeg) translate(radius,0) rotate(flip)`
- Text reads outward (like clock numbers), with a 180° flip for bottom-half segments so text never reads upside-down
- `textAnchor="middle"` and `dominantBaseline="middle"` keep the label centred on the radial midpoint of the segment
- Removed spec label paths from the `<defs>` block entirely — they were unused dead code

### FeelingsWheel.tsx — hover tooltips
Added `tooltipEmotion` and `tooltipPos` state. On `onMouseEnter` for any segment, `tooltipEmotion` is set to the hovered emotion and `tooltipPos` tracks the cursor position via `onMouseMove` on the SVG element.

The tooltip renders as a positioned HTML `<div>` inside the `position: relative` wrapper (which now has `wrapRef`). It shows:
- A colour pip matching `emotion.sectorColour`
- The emotion name in uppercase
- A truncated definition (max 12 words, with ellipsis)

The `truncateDefinition` helper clips at word boundaries. `pointerEvents: none` on the tooltip ensures it does not interfere with SVG mouse events.

## Validation
- `npx tsc --noEmit` — no errors
- `npm run build` — clean build, no warnings

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
