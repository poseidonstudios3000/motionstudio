import assert from "node:assert/strict";
import test from "node:test";
import { alignTranscriptToWordTimings, createCaptionCues, estimateTimedWords } from "../app/caption-timing";

test("keeps captions hidden until the first timed word after an intro", () => {
  const cues = createCaptionCues([
    { text: "Das", start: 6.4, end: 6.7 },
    { text: "ist", start: 6.7, end: 6.9 },
    { text: "wichtig.", start: 6.9, end: 7.4 },
  ]);
  assert.equal(cues[0].start, 6.4);
  assert.equal(cues[0].words.map((word) => word.text).join(" "), "Das ist wichtig.");
});

test("starts a new one-line cue at sentence and pause boundaries", () => {
  const cues = createCaptionCues([
    { text: "Erster", start: 1, end: 1.3 },
    { text: "Satz.", start: 1.3, end: 1.7 },
    { text: "Neue", start: 1.8, end: 2.1 },
    { text: "Sequenz", start: 2.1, end: 2.5 },
    { text: "hier", start: 3.4, end: 3.7 },
  ]);
  assert.deepEqual(cues.map((cue) => cue.words.map((word) => word.text).join(" ")), ["Erster Satz.", "Neue Sequenz", "hier"]);
});

test("preserves the speech window when correcting misheard brand words", () => {
  const aligned = alignTranscriptToWordTimings("Wir nutzen Anthropic heute.", [
    { text: "Wir", start: 6.2, end: 6.5 },
    { text: "nutzen", start: 6.5, end: 6.9 },
    { text: "Ein", start: 6.9, end: 7.1 },
    { text: "Fropik", start: 7.1, end: 7.5 },
    { text: "heute.", start: 7.5, end: 8 },
  ]);
  assert.equal(aligned[0].start, 6.2);
  assert.equal(aligned[2].text, "Anthropic");
  assert.equal(aligned[2].start, 6.9);
  assert.equal(aligned[2].end, 7.5);
  assert.equal(aligned.at(-1)?.end, 8);
});

test("uses a manual speech offset for estimated timing", () => {
  const estimated = estimateTimedWords("Hallo aus Berlin.", 12, 6.5);
  assert.equal(estimated[0].start, 6.5);
  assert.equal(estimated.at(-1)?.end, 12);
});
