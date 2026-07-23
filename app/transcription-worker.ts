/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import { DEFAULT_LOCAL_SPEECH_MODEL_ID, getTranscriptionOptions } from "./transcription";

type TranscriptionRequest = {
  type: "transcribe";
  requestId: number;
  audio: Float32Array;
};

type PipelineResult = {
  text?: string;
  chunks?: Array<{ text?: string; timestamp?: [number | null, number | null] }>;
};

env.allowLocalModels = false;
env.allowRemoteModels = true;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;

type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<PipelineResult>;
let transcriberPromise: Promise<Transcriber> | null = null;

const getTranscriber = () => {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", DEFAULT_LOCAL_SPEECH_MODEL_ID, {
      device: "wasm",
      dtype: "q8",
      progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
        self.postMessage({ type: "model-progress", status: event.status, progress: event.progress, file: event.file });
      },
    }).then((value) => value as unknown as Transcriber);
  }
  return transcriberPromise;
};

self.addEventListener("message", async (event: MessageEvent<TranscriptionRequest>) => {
  if (event.data.type !== "transcribe") return;
  const { requestId, audio } = event.data;
  try {
    self.postMessage({ type: "status", requestId, message: "Loading multilingual Whisper" });
    const transcriber = await getTranscriber();
    self.postMessage({ type: "status", requestId, message: "Transcribing speech locally" });
    const result = (await transcriber(audio, getTranscriptionOptions("auto"))) as PipelineResult;
    self.postMessage({ type: "result", requestId, text: result.text?.trim() ?? "", chunks: result.chunks ?? [] });
  } catch (error) {
    self.postMessage({ type: "error", requestId, message: error instanceof Error ? error.message : "Local transcription failed." });
  }
});

export {};
