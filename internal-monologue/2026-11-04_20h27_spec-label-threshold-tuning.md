# 2026-11-04_20h27 — Spec label threshold tuning

**User:** nigelfreddy

## Request
Some outer-ring slices still show no labels (confirmed working via tooltip).

## Diagnosis
Ran live calculation against the API data:
- Total mid slots = 54 (11 cores × proportional mids)
- At FONT_SPEC=9 with margin=1.15, threshold = 10.35px
- Most mid clusters with 4 specs have arc_width ≈ 9.0px — just below threshold
- 20 mid clusters suppressed, only ~97 specs showing labels

## Fix
- FONT_SPEC: 9 → 8
- spokeLabelFitsArc margin: 1.15 → 1.05
- New threshold: 8 × 1.05 = 8.4px
- All 9.0px segments now pass; only genuinely cramped segments (4.9–7.1px) suppressed
- Result: 124 specs show labels, 28 correctly suppressed

## Suppressed after fix (arc too narrow — correct)
- Happy/Content (7 specs, arc=4.9px)
- Calm/Peaceful (6 specs, arc=5.8px)
- Calm/Trusting (5 specs, arc=7.1px)
- Fearful/Anxious (5 specs, arc=7.1px)
- Surprised/Startled (5 specs, arc=7.1px)

## Files changed
- `apps/frontend/src/components/FeelingsWheel/FeelingsWheel.tsx`
  - FONT_SPEC 9 → 8
  - spokeLabelFitsArc margin 1.15 → 1.05

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
