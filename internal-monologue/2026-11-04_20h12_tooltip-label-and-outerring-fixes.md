# 2026-11-04_20h12 — Tooltip, label overlap, outer ring fix

**User:** nigelfreddy

## Request
- Tooltips on each segment (with brief description of emotion)
- Outer ring incomplete — investigate and fix
- Fit labels into segments with no overlap; change orientation if needed

## Investigation findings

### Outer ring gap
- All 10 core emotions now have mid children (Love, Guilt, Shame seeded last session)
- `mids.length === 0` fallback in `drawSketchy` is dead code — all cores ≥ 4 mids
- Outer ring visual incompleteness was caused by `GAP_SPEC=0.003` — at a spec arc
  of ~0.024 rad, the gap consumed ~6px out of ~20px arc width, making thin segments
  look like gaps or missing at small sizes
- Fix: reduced `GAP_SPEC` from `0.003` to `0.001` (≈0.39px at R=390), making the
  outer ring appear visually continuous while still showing hairline segment boundaries

### Label overlap
- With 117 spec emotions across 360°, each spec arc ≈ 3.08°
- In spoke orientation (radial baseline), the TANGENTIAL extent = font height (9px)
- At smallest sector (R≈334, arc≈0.030 rad): available tangential width ≈ 10px — only
  just fits; 15% safety margin correctly suppresses these borderline cases
- Added `spokeLabelFitsArc()` helper that checks:
  1. `fontSize × 1.15 ≤ effectiveSpan × radius` (tangential fit)
  2. `labelLength × fontSize × 0.60 ≤ ringDepth × 0.92` (radial fit, rarely triggers)
- Both mid and spec labels now call this check; when it fails → `null` (no label)
- Tooltip always carries the name, so no information is lost when label is suppressed

### Tooltips
- Already wired correctly in previous session
- All 117 spec emotions confirmed to have `definition` populated in DB
- Tooltip fires via `onMouseEnter` on transparent hit-paths, hidden during intensity overlay

## Files changed
- `apps/frontend/src/components/FeelingsWheel/FeelingsWheel.tsx`
  - `GAP_SPEC` 0.003 → 0.001
  - Added `spokeLabelFitsArc()` helper with doc comments
  - Mid label block now calls `spokeLabelFitsArc` and returns `null` if fails
  - Spec label (both empty-spec and normal) now conditional on `spokeLabelFitsArc`

## Build
- TypeScript: no errors (`npx tsc --noEmit`)
- Vite build: clean, 278kb JS bundle

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
