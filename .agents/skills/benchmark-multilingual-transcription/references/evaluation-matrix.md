# Evaluation matrix

Record one row per fixture and candidate.

| Field | Meaning |
|---|---|
| fixture_id | Stable consented clip identifier |
| language | ISO language code; preserve code-switches |
| model_id | Exact provider model identifier |
| model_revision | Exact revision or API snapshot when available |
| language_mode | auto or explicit language |
| prompt_id | Stable glossary/context prompt identifier |
| reference_text | Human-reviewed truth |
| candidate_text | Raw model output |
| wer | Word error rate |
| cer | Character error rate |
| entity_accuracy | Exact-match accuracy for protected entities |
| critical_errors | Negation, number, name, or meaning-changing errors |
| timing_median_ms | Median absolute word-start drift |
| timing_p95_ms | p95 absolute word-start drift |
| cold_start_ms | First-run initialization |
| processing_ms | Transcription time |
| audio_ms | Source duration |
| real_time_factor | processing_ms / audio_ms |
| estimated_cost | Provider cost recorded at evaluation time |
| notes | Failures, truncation, language switches, or artifacts |

## Recommended initial gates

- Zero unreviewed critical errors in the release fixture set.
- Entity accuracy at least 98% for explicitly protected glossary terms.
- Word timing p95 below 250 ms for active-word captions and semantic cue changes.
- Track WER and CER per language; never average away a weak launch language.
- Keep cold-start and real-time factor separate because browser-local models have very different first and repeat runs.

## Fixture coverage

Start with at least five clips per launch language:

1. clean studio speech;
2. fast speech;
3. room noise or music bed;
4. proper nouns, brands, countries, and numbers;
5. code-switching or borrowed English technical terms.

Add negative fixtures for silence, no speech, corrupt audio, unsupported codecs, and over-limit files.
