---
name: benchmark-multilingual-transcription
description: Evaluate speech-to-text models and transcription pipelines on multilingual talking-head video. Use when comparing local Whisper variants or cloud transcription APIs, measuring English/German/Russian accuracy, testing prompts and vocabulary hints, evaluating word timestamps, choosing a production provider, or diagnosing transcript quality regressions.
---

# Benchmark Multilingual Transcription

Choose transcription architecture from repeatable evidence on representative talking-head clips, not a single demo.

## Benchmark Workflow

1. Build a consented fixture set with human-reviewed references:
   - English, German, and Russian first;
   - clean and noisy rooms, fast speech, accents, code-switching, names, acronyms, numbers, and pauses;
   - 15–45 seconds per clip for rapid iteration.
2. Keep one immutable reference transcript and optional word timing per fixture.
3. Run every candidate on the same source audio with recorded model ID, model revision, language mode, prompt, hardware, duration, and date.
4. Score:
   - word error rate (WER);
   - character error rate (CER), especially useful for inflected and Cyrillic text;
   - named-entity accuracy for countries, people, brands, products, and numbers;
   - punctuation/sentence-boundary quality;
   - word-timing median and p95 drift where timestamps exist;
   - real-time factor, cold-start time, memory, cost, and privacy mode.
5. Review semantic-critical errors separately. A low WER model that changes “15” to “50” or drops “not” is not production-safe.
6. Compare pipeline variants, not only base models:
   - automatic language detection versus a supplied language;
   - glossary/context prompt versus no prompt;
   - raw transcript versus conservative post-correction;
   - one-pass output versus high-quality text plus forced alignment.
7. Select per use case. The best text model and best timing model may be different.

## Initial Candidate Matrix

- Local fast baseline: `Xenova/whisper-tiny`, WASM q8.
- Local quality baseline: `Xenova/whisper-small`, WASM q8.
- Cloud quality candidate: `gpt-4o-transcribe`.
- Cloud cost candidate: `gpt-4o-mini-transcribe`.
- Timestamp baseline: `whisper-1` with word timestamps.

Treat model IDs and capabilities as current-source facts: verify official provider documentation before each evaluation cycle.

## Transcript Correction Rules

- Preserve meaning, negation, uncertainty, numbers, names, and language.
- Correct only when audio evidence or an approved glossary supports the correction.
- Keep raw and corrected transcripts side by side with a machine-readable edit log.
- Never use a language model to silently rewrite style or strengthen claims.

## Decision Gate

Do not promote a candidate unless:

- it wins or is acceptably close on every launch language;
- semantic-critical error rate is reviewed;
- timing quality supports caption and visual synchronization;
- failure, retry, privacy, cost, and file-size limits are documented;
- the full model/revision/configuration is reproducible.

Use [references/evaluation-matrix.md](references/evaluation-matrix.md) for the required result schema and recommended launch thresholds.
