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

test("turns an AI competition question into grounded country robot races", () => {
  const result = planStoryboard({
    transcript: "Who will win the AI race? The US, China, or another country?",
    duration: 9,
  });
  assert.equal(result.scenes[0].kind, "race");
  assert.deepEqual(result.scenes[0].countries, []);
  assert.equal(result.scenes[1].kind, "race");
  assert.deepEqual(result.scenes[1].countries, ["us", "china", "other"]);
  assert.equal(result.scenes.flatMap((scene) => scene.countries ?? []).includes("russia"), false);
});

test("detects Russian competition language and spoken countries", () => {
  const result = planStoryboard({
    transcript: "Кто победит в гонке искусственного интеллекта: США, Китай или другая страна?",
    duration: 8,
  });
  assert.equal(result.language, "RU");
  assert.equal(result.scenes[0].kind, "race");
  assert.deepEqual(result.scenes[0].countries, ["us", "china", "other"]);
});

test("does not assign a specific flag to another country", () => {
  const result = planStoryboard({
    transcript: "Could another country win the AI race?",
    duration: 5,
  });
  assert.deepEqual(result.scenes[0].countries, ["other"]);
});

test("keeps German motion hidden during a silent intro and preserves absolute evidence timing", () => {
  const result = planStoryboard({
    transcript: "Anthropic steht jetzt auf Platz 1.",
    duration: 12,
    words: [
      { text: "Anthropic", start: 6.4, end: 7.0 },
      { text: "steht", start: 7.05, end: 7.35 },
      { text: "jetzt", start: 7.4, end: 7.7 },
      { text: "auf", start: 7.75, end: 7.95 },
      { text: "Platz", start: 8.0, end: 8.35 },
      { text: "1.", start: 8.4, end: 8.7 },
    ],
  });
  assert.equal(result.language, "DE");
  assert.equal(result.scenes[0].kind, "ranking");
  assert.equal(result.scenes[0].startSeconds, 6.4);
  assert.equal(result.scenes[0].start, 6.4 / 12);
  assert.equal(result.scenes[0].entities?.find((entity) => entity.id === "brand-anthropic")?.startSeconds, 6.4);
});

test("directs German AI ranking, scores, crown, price and list language", () => {
  const result = planStoryboard({
    transcript: "Anthropic steht auf Platz 1 im wichtigsten KI-Ranking. 61,4 Punkte gegenüber 60,2 Punkten für GPT. Damit hat Anthropic die Krone von OpenAI zurückgeholt. Es kostet keinen Cent mehr und kommt ohne Preiserhöhung. Drei Sachen sind neu.",
    duration: 30,
    dopaminePacing: false,
  });
  assert.equal(result.language, "DE");
  assert.ok(result.scenes.some((scene) => scene.kind === "ranking"));
  assert.ok(result.scenes.some((scene) => scene.kind === "price"));
  assert.ok(result.scenes.some((scene) => scene.kind === "list"));
  assert.deepEqual(result.scenes.find((scene) => scene.metrics?.length === 2)?.metrics, ["61,4 Punkte", "60,2 Punkten"]);
  assert.deepEqual(result.scenes.find((scene) => scene.detail.includes("Krone"))?.brands, ["anthropic", "openai"]);
  assert.equal(result.scenes.every((scene) => scene.evidence === scene.detail), true);
});

test("gives each spoken AI-race country its own timestamped cue", () => {
  const result = planStoryboard({
    transcript: "Die USA, China oder ein anderes Land?",
    duration: 10,
    words: [
      { text: "Die", start: 2, end: 2.2 },
      { text: "USA,", start: 2.25, end: 2.7 },
      { text: "China", start: 3.2, end: 3.7 },
      { text: "oder", start: 3.8, end: 4.0 },
      { text: "ein", start: 4.1, end: 4.2 },
      { text: "anderes", start: 4.25, end: 4.6 },
      { text: "Land?", start: 4.65, end: 5.0 },
    ],
  });
  assert.deepEqual(result.scenes[0].countries, ["us", "china", "other"]);
  assert.deepEqual(result.scenes[0].cues?.map((cue) => [cue.entityId, cue.startSeconds]), [["country-us", 2.25], ["country-china", 3.2], ["country-other", 4.25]]);
});
