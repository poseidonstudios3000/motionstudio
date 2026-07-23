import assert from "node:assert/strict";
import test from "node:test";
import { GET, POST } from "../app/api/transcription/groq/route";

test("reports Groq configuration without exposing the key", async () => {
  const response = GET();
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(typeof payload.configured, "boolean");
  assert.deepEqual(payload.models, ["whisper-large-v3-turbo", "whisper-large-v3"]);
  assert.equal("apiKey" in payload, false);
});

test("rejects unsupported providers before contacting Groq", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only-key";
  try {
    const input = new FormData();
    input.append("model", "grok");
    input.append("audio", new File([new Uint8Array(44)], "audio.wav", { type: "audio/wav" }));
    const response = await POST(new Request("http://localhost/api/transcription/groq", { method: "POST", body: input }));
    assert.equal(response.status, 400);
    assert.match((await response.json() as { error: string }).error, /supported Groq transcription model/i);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test("rejects an unsupported language before contacting Groq", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-only-key";
  try {
    const input = new FormData();
    input.append("model", "whisper-large-v3");
    input.append("language", "klingon");
    input.append("audio", new File([new Uint8Array(44)], "audio.wav", { type: "audio/wav" }));
    const response = await POST(new Request("http://localhost/api/transcription/groq", { method: "POST", body: input }));
    assert.equal(response.status, 400);
    assert.match((await response.json() as { error: string }).error, /supported transcription language/i);
  } finally {
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});

test("forwards German as the ISO de language hint", async () => {
  const previousKey = process.env.GROQ_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = "test-only-key";
  try {
    globalThis.fetch = async (_input, init) => {
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get("model"), "whisper-large-v3");
      assert.equal(init.body.get("language"), "de");
      assert.match(String(init.body.get("prompt")), /Anthropic/);
      return Response.json({ text: "Guten Tag", language: "de", words: [{ word: "Guten", start: 0, end: 0.4 }] });
    };
    const input = new FormData();
    input.append("model", "whisper-large-v3");
    input.append("language", "german");
    input.append("glossary", "Anthropic, Claude");
    input.append("audio", new File([new Uint8Array(44)], "audio.wav", { type: "audio/wav" }));
    const response = await POST(new Request("http://localhost/api/transcription/groq", { method: "POST", body: input }));
    const payload = await response.json() as { text: string; language: string; words: unknown[] };
    assert.equal(response.status, 200);
    assert.equal(payload.text, "Guten Tag");
    assert.equal(payload.language, "de");
    assert.equal(payload.words.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousKey;
  }
});
