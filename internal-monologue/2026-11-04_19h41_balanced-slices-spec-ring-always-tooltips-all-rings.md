# 2026-11-04 19h41 — Balanced slices, always-on spec ring, tooltips on all rings

**User:** nigelfreddy

## What was asked

1. Unbalanced slices (shame shown as a tiny sliver)
2. Tooltips on all emotions in all rings
3. Outer segment: if only 1 spec emotion for a mid, show it as one segment
4. Proportional segment counts matching hierarchy depth
5. Third ring labels not visible

## Root causes

### Shame/guilt/love having no mid children
The `midCountByCoreKey` fallback was `|| 1` — giving these cores only 1/total of the wheel. With 10 cores and total=43, shame got ~8°. Fixed to `Math.max(childCount, MIN_MID_SLOTS)` where `MIN_MID_SLOTS = 4`. New total = 8+6+8+4+4+4+6+4+4+4 = 52. Shame/guilt/love now each get 4/52 ≈ 28° each, a fair proportional slice.

### Spec ring hidden until drill-down
`renderSpec && isMidSel` gated all spec rendering. Removed — spec ring now shows always in advanced mode (`showSpec = level === 'advanced'`). The sketch fill (drawSketchy) also always draws all spec fills now.

### Mids with no spec children
Previously `specSpan = 0` was computed and nothing rendered. Now: `specCount = specs.length > 0 ? specs.length : 1`, so the full mid arc becomes one outer segment. Both the sketch fill and hit-path layer handle this. The single segment fires `openIntensity(mid)` on click and `handleMouseEnter(mid)` on hover.

### Tooltips gated by isCoreSelected
Mid-ring `onMouseEnter` was `() => isCoreSelected && handleMouseEnter(mid)`. Removed the gate — now fires always. Spec ring was already ungated once we removed `isMidSel`. Tab index on mid paths changed from `isCoreSelected ? 0 : -1` to always `0`.

### Cores with no mids (sketch layer)
`drawSketchy` now handles `mids.length === 0` by filling the outer ring as one solid segment and filling the mid ring with `MIN_MID_SLOTS` placeholder slots using the core colour.

## Files changed
- `apps/frontend/src/components/FeelingsWheel/FeelingsWheel.tsx`
  - `midCountByCoreKey`: `Math.max(..., MIN_MID_SLOTS)` instead of `|| 1`
  - `drawSketchy`: always draws all spec fills; handles mids.length=0 cores
  - `midSpan` in render: uses `Math.max(mids.length, MIN_MID_SLOTS)` as divisor
  - `showSpec = level === 'advanced'` replaces `renderSpec && isCoreSelected`
  - Spec ring render block: `showSpec && (() => {...})()` with empty-spec fallback
  - Mid hover: `handleMouseEnter(mid)` always, not gated by `isCoreSelected`

## Validation
- `npx tsc --noEmit` — clean
- `npm run build` — clean

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
