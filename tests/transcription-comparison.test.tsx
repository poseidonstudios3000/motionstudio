import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TranscriptionComparisonResults, TranscriptionLanguagePicker, type TranscriptionRun } from "../app/transcription-comparison";

test("renders every selected model result in the full comparison view", () => {
  const runs: TranscriptionRun[] = [
    ["whisper-large-v3-turbo", "Groq turbo transcript"],
    ["whisper-large-v3", "Groq accuracy transcript"],
    ["Xenova/whisper-tiny", "Local tiny transcript"],
    ["Xenova/whisper-small", "Local small transcript"],
  ].map(([modelId, text], index) => ({
    modelId: modelId as TranscriptionRun["modelId"],
    status: "success",
    text,
    words: [],
    elapsedMs: 500 + index,
  }));

  const html = renderToStaticMarkup(
    <TranscriptionComparisonResults runs={runs} appliedModelId="whisper-large-v3" onApply={() => undefined} />,
  );

  assert.match(html, /Transcription comparison results/);
  assert.match(html, /Groq turbo transcript/);
  assert.match(html, /Groq accuracy transcript/);
  assert.match(html, /Local tiny transcript/);
  assert.match(html, /Local small transcript/);
  assert.equal((html.match(/comparison-card success/g) ?? []).length, 4);
});

test("renders an explicit German language hint for every model", () => {
  const html = renderToStaticMarkup(
    <TranscriptionLanguagePicker value="german" disabled={false} onChange={() => undefined} />,
  );
  assert.match(html, /Speech language/);
  assert.match(html, /Deutsch is sent explicitly/);
  assert.match(html, />de</);
  assert.match(html, />German</);
  assert.equal((html.match(/aria-pressed=/g) ?? []).length, 6);
});
