# PROJECT-STATUS.md — Feelings Wheel Webapp

Plain-language summary of what this project is, what we are doing, and where we are up to.

---

## What is this project?

A web app built around the "Feelings Wheel" — a tool used in emotional intelligence work, therapy, and wellbeing practice. The app lets a person identify how they are feeling by drilling down through layers of emotion, from broad (e.g. "Angry") to specific (e.g. "Frustrated" or "Provoked").

The app is designed to be used by anyone — from a young child using a very simple version, to an adult doing deep emotional processing work. All sessions are anonymous and the data collected is used only for insights and analytics (no personal information is stored).

---

## What has been done so far

- Examined all three source PDF versions of the feelings wheel
- Mapped the structure of the master copy (Name it to Tame it — Willene Freddy)
- Written a full project plan covering tech choices, database design, feature phases, and the folder structure

---

## What we are waiting for

- **DBT workbook feelings data** from Nigel — this will add extra vocabulary (from Dialectical Behaviour Therapy) and includes a feedback/reflection component. This data needs to be in hand before we start building the app.

---

## What comes next (in order)

1. Receive DBT workbook feelings data
2. Build the complete emotions dataset as a JSON seed file
3. Scaffold the project (frontend + backend + database running locally)
4. Build the interactive wheel UI
5. Add session recording, definitions, feedback, and level selection
6. Analytics dashboard (internal)
7. Coaching / reframe feature (subscription tier)
8. Deploy to cloud (IBM Cloud, Azure, or Vercel — cost comparison still to be done)

---

## Current phase

**Phase 0 — Planning.** No code has been written yet.

---

## Key decisions still to be made

| Decision | Status |
|---|---|
| Which cloud to deploy to (IBM, Azure, or Vercel) | Deferred — cost comparison needed |
| Subscription / payment provider | Likely Stripe — not yet confirmed |
| Whether users can have optional accounts to track their own history | Phase 3 decision |
| Coaching content for the reframe feature | Needs to be authored — source TBD |
| AI model provider (watsonx.ai, OpenAI, or Anthropic) | Deferred to Phase 5 — data model is provider-neutral |
| Vector storage for emotion embeddings | JSON column for now; can migrate to MySQL 9 VECTOR type or dedicated vector DB later |
