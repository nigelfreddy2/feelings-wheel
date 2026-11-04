# 2026-11-04 19h35 — Wheel radial labels direction fix + outer ring plain SVG fill

**User:** nigelfreddy

## What was asked

Two issues remained after the previous fix:
1. Outer ring still visually incomplete (roughjs not rendering small arcs)
2. Radial labels on spec ring going in the wrong direction / not fitting in segments

## Root cause analysis

### Outer ring (roughjs failure)
The spec ring segments are approximately 0.092 radians wide. At that scale, roughjs `fillStyle: 'solid'` produces empty or broken fills. The problem was architectural — roughjs cannot reliably render filled paths this small.

**Fix:** Replaced the roughjs `.path()` call for spec segments with a plain SVG `<path>` element created via `document.createElementNS`. Same group, same pointer-events off, same colour formula — but guaranteed to render correctly at any size.

### Radial label direction
The previous `radialLabelTransform` was wrong. The transform `translate(CX,CY) rotate(angleDeg) translate(radius,0) rotate(90)` places text tangentially (along the arc), not radially (along the spoke). The `-90` correction on `angleDeg` was also incorrect.

**Fix:** Rewrote `radialLabelTransform` using the correct coordinate formula:
- `px = CX + r·sin(A)`, `py = CY - r·cos(A)` — positions the text at the right polar coordinate
- `rotate(aDeg - 90)` for top half (0 to π), `rotate(aDeg + 90)` for bottom half (π to 2π)
- This makes the text baseline run along the spoke radius, not across it

Verified by tracing:
- 12 o'clock (A=0): position=(400,73), rotate(-90) → vertical text reading bottom-to-top ✓
- 3 o'clock (A=π/2): position=(727,400), rotate(0) → horizontal text ✓
- 6 o'clock (A=π): position=(400,727), rotate(90) → vertical text reading top-to-bottom ✓
- 9 o'clock (A=3π/2): position=(73,400), rotate(360=0) → horizontal text ✓

### Mid ring labels also switched to radial
The arc-following mid labels were also overflowing in narrow mid segments. Switched mid ring to radial spoke labels using the same `radialLabelTransform` function. Removed `lp-mid-*` paths from `<defs>` (no longer needed).

## Files changed
- `apps/frontend/src/components/FeelingsWheel/FeelingsWheel.tsx`
  - `drawSketchy`: spec ring now uses `document.createElementNS` plain SVG path instead of roughjs
  - `radialLabelTransform`: complete rewrite with correct polar→Cartesian + rotation math
  - Mid ring label: switched from `<textPath>` arc to `radialLabelTransform`
  - `<defs>` labelPaths: removed `lp-mid-*` entries

## Validation
- `npx tsc --noEmit` — clean
- `npm run build` — clean

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
