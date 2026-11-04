# 2026-11-04_20h17 — SocialWorkersToolbox diff, screenshot diagnosis, 4th ring assessment

**User:** nigelfreddy

## Request
1. Glean emotions from SocialWorkersToolbox.pdf — missed in prior session
2. No duplicates
3. Is a 4th ring worth considering?
4. Update merged emotion hierarchy
5. Screenshot: labels missing — colour issue or suppression?

## Screenshot diagnosis
The outer ring under "Proud" shows many white segments with no text.
The `spokeLabelFitsArc` check is working correctly — it is suppressing labels that are
too narrow. The font colour (#1f2328 dark on light yellow) is fine. The issue is that
the Proud sector is wide (8 mids in Happy = reasonably sized), but the spec segments
under proud (proud-of / accomplished / worthy / dignified — added this session) were
not yet seeded. The visible blank segments are the 4 new spec children that now exist.
Before this session, proud had ZERO spec children, so the entire proud outer arc was
one single empty-spec segment — that's the large unsegmented yellow band in the screenshot.
The tooltip was already working (visible in screenshot: "LOV..." tooltip with "Warm, d..."
definition line — demonstrating the tooltip feature works on the Love segment).

## SocialWorkersToolbox diff — confirmed additions
Ran a full diff against all 3 readable PDFs vs current seed.

### New emotions added (20 total):
| Key | Label | Parent |
|---|---|---|
| pleased | Pleased | content |
| satisfied | Satisfied | content |
| fulfilled | Fulfilled | content |
| proud-of | Proud Of | proud |
| accomplished | Accomplished | proud |
| worthy | Worthy | proud |
| dignified | Dignified | proud |
| loved | Loved | accepted |
| included | Included | accepted |
| connected | Connected | accepted |
| belonging | Belonging | accepted |
| comfortable | Comfortable | peaceful |
| close | Close | trusting |
| wronged | Wronged | bitter |
| mixed-up | Mixed Up | confused |
| lost | Lost | confused |
| shaken | Shaken | startled |
| impressed | Impressed | amazed |
| fascinated | Fascinated | amazed |
| tense | Tense | anxious |

### No duplicates — confirmed
Every addition was checked against the full specificEmotions array before inserting.
Words that were near-duplicates (puzzled~perplexed, exposed~transparent, etc.) were not added.

## 4th ring verdict — not recommended now
See hierarchy doc for full analysis. Short summary:
- Would push viewBox beyond 800x800, shrinking core ring labels
- Segments too narrow for any text; tooltips-only ring provides poor UX
- DBT dimensions already deliver this depth through the coaching drawer
- Revisit when session data shows users hitting specific emotions repeatedly and needing finer nuance

## CALM core
SocialWorkersToolbox has CALM as a separate core. Decision deferred — need Willene's
confirmation whether her master PDF (image-only) also shows CALM as its own spoke.
Current CALM-family words (serene, comfortable, secure, reassured) sit under
peaceful/trusting in Happy. If CALM becomes an 11th core, colour suggested: #A8D5A2.

## DB result
- Seed: 10 core · 52 mid · 137 specific · 199 total (was 179)
- TypeScript: clean
- Mids still with 0 spec children: critical, excited, eager, guilty-sad, weak, rejected, threatened

## Files changed
- `apps/backend/prisma/seed.ts` — 20 new specific emotions
- `docs/generated/2026-11-04_merged-emotion-hierarchy.md` — full rewrite with changelog, CALM decision, 4th-ring assessment

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
