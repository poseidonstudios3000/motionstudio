import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTranscript, scoreTranscriptionRun } from "../scripts/score-transcription-benchmark.mjs";

test("normalizes Latin and Cyrillic transcripts without deleting letters", () => {
  assert.equal(normalizeTranscript("  Wer gewinnt?  "), "wer gewinnt");
  assert.equal(normalizeTranscript("Кто победит?"), "кто победит");
});

test("scores word, character, entity, and speed metrics", () => {
  const score = scoreTranscriptionRun({
    fixtureId: "en-ai-race",
    language: "en",
    modelId: "candidate",
    reference: "The US and China compete.",
    candidate: "The US and China compete",
    protectedEntities: ["US", "China"],
    audioMs: 10_000,
    processingMs: 5_000,
  });
  assert.equal(score.wer, 0);
  assert.equal(score.cer, 0);
  assert.equal(score.entityAccuracy, 1);
  assert.equal(score.realTimeFactor, 0.5);
});

test("penalizes meaning-changing omissions", () => {
  const score = scoreTranscriptionRun({
    fixtureId: "de-negation",
    language: "de",
    modelId: "candidate",
    reference: "Das ist nicht sicher.",
    candidate: "Das ist sicher.",
  });
  assert.equal(score.wer, 0.25);
  assert.ok(score.cer > 0);
});
