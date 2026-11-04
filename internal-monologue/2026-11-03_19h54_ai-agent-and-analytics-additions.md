# 2026-11-03_19h54_ai-agent-and-analytics-additions.md

**Task:** Expand plan to include AI agent and analytics data model
**User:** Nigel Freddy

---

## What was done

User confirmed that an AI agent is a planned feature (later phase) and that the analytics potential needs to be mapped out. Key constraint: the data model must support AI from Phase 1, even though the AI itself ships in Phase 5.

Updated `docs/generated/plans/2026-11-03_project-plan.md` with:

### New DB tables added to the schema
- **`session_events`** — full behavioural event log (hovers, expands, selections, backtracks, abandonment). JSON payload column means the schema never needs altering as the app evolves. This is the raw data the AI agent needs.
- **`ai_insights`** — stores AI-generated insights (empty in Phase 1, populated from Phase 5). Created in Phase 1 migrations so FK relationships are stable.
- **`emotion_embeddings`** — vector embeddings of emotion definitions (JSON array for now, migrates to native vector type later). Enables semantic similarity search across sessions.

### New analytics section added
Full breakdown of analytics possibilities across 5 categories:
1. Volume and usage (sessions, completions, abandonment)
2. Emotion frequency (by level, mode, co-occurrence)
3. Behavioural (dwell time, backtracks, definition views — from `session_events`)
4. Trend analytics (time-series, seasonal patterns)
5. AI-powered (clusters, anomalies, personalised insight, reframe effectiveness)

### Phase 5 added to the phase breakdown
AI agent delivery broken into 8 tasks including embedding pipeline, nightly insight job, semantic search, anomaly detection, reframe effectiveness tracking.

### Architecture diagram updated
AI agent node added to the main flowchart. Analytics flow diagram added showing how all 5 tables feed into the insights dashboard and AI layer.

### Open questions updated
Added 3 new deferred decisions: AI provider choice, vector storage strategy, and data privacy considerations (watsonx.ai noted as preferable for wellbeing/therapeutic product).

---

## Current state

Plan is fully updated. No code written yet. Still waiting for DBT workbook data.

---

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
