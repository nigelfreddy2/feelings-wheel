# 2026-11-03_19h47_project-planning-session.md

**Task:** Initial project planning for the Feelings Wheel interactive webapp
**User:** Nigel Freddy

---

## What was done

- Examined all three source PDFs in `source/`:
  - `Feelings Wheel Name It To Tame It.pdf` — master copy (Willene Freddy), 3-ring wheel, ~120 emotions
  - `Feelings Wheel (Basic).pdf` — simplified 2-ring worksheet with Irish crisis helplines
  - `Feelings Wheel SocialWorkersToolbox.pdf` — decorative 3-ring version from SocialWorkersToolbox.com
- Received full feature requirements from Nigel via chat
- Created `AGENTS.md` — machine-readable project config
- Created `PROJECT-STATUS.md` — plain-language companion for non-technical readers
- Created `docs/generated/plans/2026-11-03_project-plan.md` — full technical project plan

## Current state

Planning phase only. No code written. Waiting for DBT workbook feelings data before build begins.

## Key design decisions recorded in the plan

- **Stack:** React + TypeScript + Vite (frontend), Express + TypeScript (backend), MySQL via Prisma
- **Local dev:** Docker Compose with MySQL container
- **Three difficulty levels:** Child (core only), Adult (core + mid), Advanced (all 3 rings + DBT vocab)
- **Session modes:** General hygiene / Specific incident processing
- **Subscription gate:** Paradigm shift / coaching flow locked behind subscription (Phase 3)
- **All sessions anonymous** — no PII stored
- **Feedback:** Rating (1–5) + free text, tied to session
- **Hover/click definitions:** Tooltip on desktop, bottom sheet on mobile

## What is next

Waiting for DBT workbook feelings data. Once received, build the JSON seed file and scaffold the project.

---

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
