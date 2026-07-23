import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LOCAL_SPEECH_MODEL_ID, getTranscriptionOptions, TRANSCRIPTION_MODELS } from "../app/transcription";

test("keeps the browser worker and model catalog on the same default", () => {
  assert.equal(DEFAULT_LOCAL_SPEECH_MODEL_ID, "Xenova/whisper-tiny");
  assert.equal(TRANSCRIPTION_MODELS.find((model) => model.id === DEFAULT_LOCAL_SPEECH_MODEL_ID)?.execution, "browser");
});

test("supports automatic and explicit multilingual transcription options", () => {
  assert.equal("language" in getTranscriptionOptions("auto"), false);
  assert.equal(getTranscriptionOptions("russian").language, "russian");
});
