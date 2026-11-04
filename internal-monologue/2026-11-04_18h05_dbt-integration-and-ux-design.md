# 2026-11-04_18h05_dbt-integration-and-ux-design.md

**Task:** Extract DBT PDF, analyse emotion regulation module, propose integration into feelings wheel
**User:** Nigel Freddy

---

## What was done

### PDF extraction
- Extracted pages 221-336 (116 pages) of the DBT Skills Training Textbook into a new file:
  `source/Emotional Regulation Module (DBT).pdf`

### Data extracted from pages 238-248 (Handout 6)
Read and catalogued the full 5/6-dimension structure for 9 core emotions:
- Anger, Disgust, Envy, Fear, Happiness, Jealousy, Love, Sadness, Shame, Guilt
- Each has: emotion words, prompting events, interpretations, biological changes, expressions/actions, aftereffects

### Full module structure mapped (pages 221-336)
Four sections identified and mapped to app features:
1. Understanding and naming emotions (pages 214-223) → data layer
2. Changing emotional responses (227-244) → Check the Facts, Opposite Action
3. Reducing vulnerability (247-259) → PLEASE skills, Pleasant Events, Values list
4. Managing really difficult emotions (263-268) → crisis pathway, mindfulness of current emotions

### Key finding: emotions missing from the wheel
Shame, Guilt, Envy, Jealousy, and Love are fully described in DBT but absent from or peripheral in the feelings wheel. Recommended elevating to first-class emotions in the data model.

### Documents produced
- `docs/generated/plans/2026-11-04_dbt-integration-analysis.md` — full analysis with:
  - DBT-to-wheel mapping
  - Data model additions (3 new tables: emotion_dimensions, coping_suggestions, session_reflections)
  - UX recommendations for making the wheel pop
  - Coping guidance design per level
  - Coaching flow design (subscription tier)
  - Crisis pathway design
  - Feature-to-phase mapping

### Main project plan updated
Added 3 new tables to the database schema section:
- `emotion_dimensions` — 6 DBT dimensions per emotion, normalised rows, AI-queryable
- `coping_suggestions` — per-emotion coping tips by category and level
- `session_reflections` — Check the Facts responses, intensity before/after, reframes, commitments

---

## Key decisions recorded

- Use normalised `emotion_dimensions` table (not JSON columns) — AI-queryable, extensible to new frameworks
- Intensity slider (1-10) added to emotion selection as a Phase 1 feature — adds a second data dimension
- Crisis pathway triggered at intensity 8-10 on advanced level — uses Irish helplines from Basic wheel
- "Check the Facts" is Phase 1/2, not gated — it is the core value proposition
- Coaching flow (opposite action + reframe) is Phase 3 subscription gate

---

## No-AI-punctuation check (rule: no-ai-punctuation.md):
Em dashes: none found
Sentence-separator hyphens: none found
