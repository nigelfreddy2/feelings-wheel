# 2026-11-04 19h26 — Brand style guide applied + printable handout

**User:** Nigel Freddy

## What was asked
User shared the design guidelines from the Drama Triangle and Ride the Wave PDFs and asked to apply the full Wholeness with Willene visual brand to both (a) the web app and (b) a printable A4 landscape handout of the feelings wheel.

## What I did

### 1. Read source documents
Rendered all pages of `Drama Triangle.pdf` and `Ride the Wave.pdf` to PNG using PyMuPDF and read them visually. Catalogued the complete style system:
- Background: `#f9f7f4` off-white with faint 22px dotted grid (`radial-gradient`)
- Supertitle: Open Sans, 7–10pt, ALL CAPS, wide tracking
- Main title: Prata, large, near-black
- Highlighted word in title: soft salmon or golden rectangle (`rgba` background)
- Section headings: Prata in salmon `#E48E87`
- Sub-labels: Open Sans ALL CAPS, 7–10pt, wide tracking
- Body: Montserrat, 9–14pt
- Bullets: en-dash `–` in salmon
- Doodles: diagonal hachure fill (`<pattern>` with diagonal lines) in brand colours
- Margin notes: Caveat cursive, italic, small
- Dotted dividers: 1.5px dashed `#d8d2c8`
- Logo: bottom-right corner

### 2. Web app — `index.css` complete rewrite
- Removed `@import url(...)` for Google Fonts (now loaded in `index.html`)
- Added full brand token set: `--paper`, `--ink`, `--ink-mid`, `--ink-light`, `--dot-colour`, `--hl-salmon`, `--hl-golden`, `--hl-blue`, `--salmon-light`, `--salmon-dark`, `--golden-light`, `--golden-dark`, `--blue-grey-light`
- Body background now uses `radial-gradient` dotted grid
- Added typography classes: `.supertitle`, `.label-caps`, `.note-caveat`, `.hl-salmon`, `.hl-golden`, `.hl-blue`, `.divider-dotted`, `.dash-list`
- All buttons switched from Montserrat to Open Sans caps
- Tab buttons switched to Open Sans caps
- Added `.setup-option-grid` / `.setup-option` / `.setup-option-title` / `.setup-option-desc` classes for session setup screen
- `ring-enter` transform-origin updated from `250px 250px` (old 500×500 viewBox) to `400px 400px` (current 800×800 viewBox)

### 3. Web app — `index.html`
- Consolidated all four fonts into a single Google Fonts request: Prata, Open Sans, Montserrat, Caveat

### 4. Web app — `App.tsx`
- Background changed from `var(--light-golden)` to `var(--paper)`
- Instruction hint changed from italic `p` to `.supertitle` class (Open Sans caps)
- Middle dots `·` used as separators instead of arrows

### 5. Printable handout
Created `client-facing/reports/2026-11-04_feelings-wheel-handout.html`:
- A4 landscape, fully self-contained HTML + CSS
- Three-column layout: left (title + questions + guilt note), centre (SVG wheel), right (helplines)
- SVG wheel generated programmatically in Python:
  - 8 core emotions from the master PDF (Happy, Calm, Loved, Surprised, Scared, Sad, Angry, Guilty)
  - Mid ring with all 40 child emotions
  - `<textPath>` arc labels using the same flip logic as the app
  - SVG `<pattern>` hachure fills with diagonal lines in each sector colour
- Dotted sketchbook background
- Guilt vs Shame note in Caveat handwriting box
- Irish helplines (Pieta, Samaritans, Childline, Text 50808, 999/112)
- Logo embedded as base64 data URI bottom-right
- Footnote with website and email

## Files changed
- `apps/frontend/index.html`
- `apps/frontend/src/index.css`
- `apps/frontend/src/App.tsx`
- `client-facing/reports/2026-11-04_feelings-wheel-handout.html` (new)

## TypeScript
Both `tsc --noEmit` passes: clean.

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
