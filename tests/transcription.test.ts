import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LOCAL_SPEECH_MODEL_ID,
  DEFAULT_TRANSCRIPTION_MODEL_IDS,
  encodePcm16Wav,
  getTranscriptionOptions,
  isGroqTranscriptionModel,
  isLocalTranscriptionModel,
  TRANSCRIPTION_MODELS,
} from "../app/transcription";

test("keeps the browser worker and model catalog on the same default", () => {
  assert.equal(DEFAULT_LOCAL_SPEECH_MODEL_ID, "Xenova/whisper-tiny");
  assert.equal(TRANSCRIPTION_MODELS.find((model) => model.id === DEFAULT_LOCAL_SPEECH_MODEL_ID)?.execution, "browser");
});

test("supports automatic and explicit multilingual transcription options", () => {
  assert.equal("language" in getTranscriptionOptions("auto"), false);
  assert.equal(getTranscriptionOptions("russian").language, "russian");
});

test("offers local and Groq models with a useful default comparison", () => {
  assert.deepEqual(DEFAULT_TRANSCRIPTION_MODEL_IDS, ["whisper-large-v3-turbo", "Xenova/whisper-tiny"]);
  assert.equal(TRANSCRIPTION_MODELS.filter((model) => model.provider === "groq").length, 2);
  assert.equal(TRANSCRIPTION_MODELS.filter((model) => model.provider === "local").length, 2);
  assert.equal(isGroqTranscriptionModel("whisper-large-v3"), true);
  assert.equal(isGroqTranscriptionModel("grok"), false);
  assert.equal(isLocalTranscriptionModel("Xenova/whisper-small"), true);
});

test("encodes normalized browser audio as mono 16-bit WAV", async () => {
  const blob = encodePcm16Wav(new Float32Array([-1, 0, 1]));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(blob.type, "audio/wav");
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(bytes.length, 50);
});
