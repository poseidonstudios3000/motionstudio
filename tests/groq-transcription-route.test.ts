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
