import assert from "node:assert/strict";
import test from "node:test";
import { planStoryboard } from "../app/storyboard";

test("keeps brand scenes grounded and in spoken order", () => {
  const result = planStoryboard({ transcript: "First we use Gemini. Then ChatGPT handles the next task.", duration: 10 });
  assert.equal(result.scenes[0].brand, "gemini");
  assert.equal(result.scenes[1].brand, "openai");
  assert.deepEqual(result.scenes.flatMap((scene) => scene.brands ?? []), ["gemini", "openai"]);
});

test("does not invent a company for generic content", () => {
  const result = planStoryboard({ transcript: "This simple routine helps you focus every morning.", duration: 7 });
  assert.equal(result.scenes[0].brand, undefined);
  assert.deepEqual(result.scenes[0].brands, []);
});

test("does not mistake a product version for a performance metric", () => {
  const result = planStoryboard({ transcript: "OpenAI released GPT-5 for developers.", duration: 6 });
  assert.equal(result.scenes[0].kind, "brand");
  assert.equal(result.scenes[0].brand, "openai");
  assert.equal(result.scenes[0].metric, undefined);
});

test("detects German, routes, exact metrics, social platforms and CTA copy", () => {
  const result = planStoryboard({
    transcript: "Wir reisen von Berlin nach Dubai. Unser Wachstum liegt bei 23%. Danach zeigen wir alles auf Instagram. Schreib einen Kommentar.",
    duration: 20,
  });
  assert.equal(result.language, "DE");
  assert.equal(result.scenes.find((scene) => scene.kind === "travel")?.origin, "Berlin");
  assert.equal(result.scenes.find((scene) => scene.kind === "travel")?.destination, "Dubai");
  assert.equal(result.scenes.find((scene) => scene.kind === "stat")?.metric, "23%");
  assert.deepEqual(result.scenes.find((scene) => scene.kind === "social")?.platforms, ["instagram"]);
  assert.equal(result.scenes.find((scene) => scene.kind === "cta")?.ctaLabel, "Schreib einen Kommentar");
});

test("uses Whisper word timestamps to place beat boundaries", () => {
  const result = planStoryboard({
    transcript: "OpenAI starts. Tesla follows.",
    duration: 10,
    words: [
      { text: "OpenAI", start: 0, end: 1 },
      { text: "starts.", start: 1, end: 2 },
      { text: "Tesla", start: 6, end: 7 },
      { text: "follows.", start: 7, end: 8 },
    ],
  });
  assert.equal(result.scenes.length, 2);
  assert.equal(result.scenes[1].start, 0.6);
  assert.equal(result.scenes[1].brand, "tesla");
});
