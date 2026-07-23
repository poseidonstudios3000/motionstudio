---
name: direct-semantic-motion
description: Convert a talking-head transcript with word or segment timestamps into an editable, evidence-grounded motion-graphics plan. Use when planning semantic scenes, choosing literal visuals or editorial metaphors, synchronizing entities and claims to speech, adding country/brand/platform visuals, or reviewing whether generated visuals faithfully communicate the speaker''s meaning.
---

# Direct Semantic Motion

Turn spoken meaning into timed visual direction while keeping every factual element grounded in the transcript or approved project assets.

## Workflow

1. Verify the transcript before directing visuals. Mark uncertain words, names, numbers, and language switches; do not hide transcription uncertainty with confident graphics.
2. Segment by semantic change, not fixed word count. Preserve word timestamps and split on claims, entities, contrasts, lists, questions, causes, and calls to action.
   - Keep absolute media time. If speech begins after an intro, leave the motion layer empty until the first supported beat; never force the first scene to `0:00`.
3. Extract an evidence ledger for every beat:
   - literal entities and attributes explicitly spoken;
   - relationships such as comparison, movement, competition, growth, or causation;
   - abstract intent and emotional tone;
   - exact transcript span and start/end time supporting each item.
4. Choose the visual treatment in this order:
   - literal visual for named entities, flags, places, products, metrics, or platforms;
   - explanatory diagram for relationships or processes;
   - editorial metaphor for abstract meaning;
   - typography when no grounded visual improves understanding.
   - For ordered language (`first/second/third`, `erstens/zweitens/drittens` and inflected forms), keep one persistent list structure and advance its active numbered node at each spoken item. Never collapse an ordered argument into a generic keyword card.
5. Build synchronized cues. Reveal, emphasize, and retire each entity at its spoken timestamp. Do not show a later entity early unless the scene is explicitly introduced as an overview.
   - Derive cue time from the exact entity phrase, not the containing sentence start.
   - Preserve source timestamps through transcript spelling corrections.
6. Emit typed, editable scene data. Keep evidence, literal assets, metaphors, and timing separate so a user can replace one without regenerating everything.
7. Run the grounding and readability gates before implementation.

## Grounding Rules

- Never invent a country, company, person, product, statistic, quotation, route, or causal claim.
- Treat a metaphor as visual framing, not evidence. A robot race may represent “the AI race”; it must not imply real robots or a factual ranking.
- For vague phrases such as “another country,” use a neutral globe, question mark, or unlabeled competitor. Never choose a specific flag.
- Use only approved/local assets or generated primitives with known provenance.
- Keep flags and logos contextual and legible; do not distort them or combine them into fabricated marks.
- Captions own sentence-level copy. The upper motion layer may show zero to three evidence-grounded words, a metric, a brand, or a compact status label; it must never repeat a transcript sentence or paragraph.
- When the transcript and model interpretation disagree, the transcript evidence wins and the scene stays conservative.

## Output Contract

For every scene provide:

- normalized and absolute start/end times;
- spoken evidence text;
- semantic intent;
- visual kind and editorial metaphor;
- literal entities with per-entity cue times;
- required approved assets;
- an uncertainty list;
- a short reason the visual improves comprehension.

Use the schema and worked example in [references/scene-contract.md](references/scene-contract.md).

## Quality Gates

- Grounding: every literal element maps to spoken evidence or explicit user direction.
- Synchronization: cue drift should be under 250 ms when word timing exists.
- Pre-roll: no caption or semantic visual may appear before the first supported spoken word.
- Comprehension: a silent viewer should recover the main relationship without reading decorative copy.
- Restraint: use one primary idea per beat and no more than one supporting metaphor.
- Copy restraint: motion-graphic copy is at most three words unless an exact product name or metric requires more. Prefer icons, shapes, logos, counters, and spatial relationships.
- Editability: scene fields remain structured; do not bake meaning into an opaque generated video.
- Multilingual parity: test English, German, and Russian versions of the same semantic pattern.

## Repository Integration

- Keep extraction and planning pure and deterministic under `app/storyboard.ts` until a validated model adapter is added.
- Extend `SceneSpec` rather than passing untyped provider output into a composition.
- Add positive and negative tests for every new entity or visual kind.
- Keep provider secrets server-side and preserve evidence spans through any model-assisted enrichment.
- For the current German talking-head workflow, route ranking/leaderboard language, score comparisons, crown/leadership phrases, same-price/no-price-increase claims, and numbered feature lists to distinct editable treatments. Keep numbers and brand order exactly as spoken.
- Store `keyPhrase`, `listIndex`, and `listTotal` separately from transcript evidence so the renderer can animate list state without displaying the full transcript.
