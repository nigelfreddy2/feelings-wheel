# 2026-11-04 19h57 — All rings selectable

**User:** nigelfreddy

## What was asked

Be able to select a feeling on any ring (core, mid, spec) and save it with the intensity overlay.

## Root cause

`handleCoreClick` only called `openIntensity` in `child` mode; in `adult`/`advanced` it just expanded the ring.
`handleMidClick` only called `openIntensity` in `adult` mode; in `advanced` it just expanded to show specs.
`handleSpecClick` always called `openIntensity`. So only the outer ring worked for all levels.

Also, mid `onClick` was gated: `() => isCoreSelected && handleMidClick(mid)` — meaning you couldn't click a mid without having first clicked the core.

## Fix

- `handleCoreClick`: removed level check, now always calls `openIntensity(emotion)` after updating selection state
- `handleMidClick`: removed level check, now always calls `openIntensity(emotion)` after updating selection state
- Mid hit-path `onClick`/`onKeyDown`: removed `isCoreSelected &&` gate — mid segments are always directly clickable

The selection state (`selectedCoreKey`, `selectedMidKey`) is still updated so the fading/highlight visual still works, but it no longer blocks the intensity overlay from opening.

## Validation
- `npx tsc --noEmit` — clean
- `npm run build` — clean

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
