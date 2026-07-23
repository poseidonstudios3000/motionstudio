/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import { getTranscriptionOptions, type LocalTranscriptionModelId, type SpeechLanguage } from "./transcription";

type TranscriptionRequest = {
  type: "transcribe";
  requestId: number;
  audio: Float32Array;
  modelId: LocalTranscriptionModelId;
  language: SpeechLanguage;
};

type PipelineResult = {
  text?: string;
  chunks?: Array<{ text?: string; timestamp?: [number | null, number | null] }>;
};

env.allowLocalModels = false;
env.allowRemoteModels = true;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<PipelineResult>;
const transcriberPromises = new Map<LocalTranscriptionModelId, Promise<Transcriber>>();

const getTranscriber = (modelId: LocalTranscriptionModelId) => {
  let transcriberPromise = transcriberPromises.get(modelId);
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", modelId, {
      device: "wasm",
      dtype: "q8",
      progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
        self.postMessage({ type: "model-progress", status: event.status, progress: event.progress, file: event.file });
      },
    }).then((value) => value as unknown as Transcriber);
    transcriberPromises.set(modelId, transcriberPromise);
  }
  return transcriberPromise;
};

self.addEventListener("message", async (event: MessageEvent<TranscriptionRequest>) => {
  if (event.data.type !== "transcribe") return;
  const { requestId, audio, modelId, language } = event.data;
  try {
    const modelLabel = modelId.endsWith("small") ? "Whisper Small" : "Whisper Tiny";
    self.postMessage({ type: "status", requestId, message: `Loading ${modelLabel}` });
    const transcriber = await getTranscriber(modelId);
    self.postMessage({ type: "status", requestId, message: `Transcribing locally with ${modelLabel}` });
    const result = (await transcriber(audio, getTranscriptionOptions(language))) as PipelineResult;
    self.postMessage({ type: "result", requestId, text: result.text?.trim() ?? "", chunks: result.chunks ?? [] });
  } catch (error) {
    self.postMessage({ type: "error", requestId, message: error instanceof Error ? error.message : "Local transcription failed." });
  }
});

export {};
