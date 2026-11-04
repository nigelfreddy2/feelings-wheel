# AGENTS.md — Feelings Wheel Webapp

## Project
Interactive feelings wheel webapp with drill-down, session analytics, and coaching features.

## GitHub
Personal project — repository owner: nigelfreddy2
Repo: https://github.com/nigelfreddy2/feelings-wheel

## Source assets
- `source/Feelings Wheel Name It To Tame It.pdf` — master copy (Willene Freddy)
- `source/Feelings Wheel (Basic).pdf` — simplified worksheet version
- `source/Feelings Wheel SocialWorkersToolbox.pdf` — decorative reference version

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MySQL (local dev via Docker Compose)
- Deployment target: IBM Cloud Code Engine (primary candidate), Azure Container Apps, or Vercel (to be decided after cost comparison)

## Key features
- Three difficulty levels: Child / Adult (emotionally developing) / Advanced
- Drill-down wheel: core → mid → specific emotion
- Hover/click: definition of each feeling
- Session modes: General emotional hygiene / Specific incident processing
- Anonymous sessions — no PII stored
- Analytics and insights from session data
- Feedback mechanism built in
- Subscription feature (future): paradigm shift / cognitive reframe coaching
- DBT workbook feelings data to be integrated (data pending from user)

## Docs
- Plan: `docs/generated/plans/2026-11-03_project-plan.md`
- Developer docs: `docs/developer-documentation/`
- Status: `PROJECT-STATUS.md`

## Current phase
Phase 1 — Active build. Core wheel, backend, seeding, and zoom feature complete.
210 emotions seeded (11 core · 54 mid · 145 specific).
