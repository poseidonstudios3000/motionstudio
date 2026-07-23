export type SpeechLanguage = "auto" | "english" | "german" | "russian" | "spanish" | "french";
export type LocalTranscriptionModelId = "Xenova/whisper-tiny" | "Xenova/whisper-small";
export type GroqTranscriptionModelId = "whisper-large-v3-turbo" | "whisper-large-v3";
export type TranscriptionModelId = LocalTranscriptionModelId | GroqTranscriptionModelId;

export type TranscriptionModelProfile = {
  id: TranscriptionModelId;
  label: string;
  shortLabel: string;
  provider: "local" | "groq";
  execution: "browser" | "server";
  quality: "baseline" | "enhanced" | "premium";
  wordTimestamps: boolean;
  detail: string;
};

export const TRANSCRIPTION_MODELS: readonly TranscriptionModelProfile[] = [
  {
    id: "whisper-large-v3-turbo",
    label: "Groq Whisper Large V3 Turbo",
    shortLabel: "Large V3 Turbo",
    provider: "groq",
    execution: "server",
    quality: "enhanced",
    wordTimestamps: true,
    detail: "Fast cloud benchmark",
  },
  {
    id: "whisper-large-v3",
    label: "Groq Whisper Large V3",
    shortLabel: "Large V3",
    provider: "groq",
    execution: "server",
    quality: "premium",
    wordTimestamps: true,
    detail: "Accuracy-first cloud model",
  },
  {
    id: "Xenova/whisper-tiny",
    label: "Whisper Tiny",
    shortLabel: "Tiny",
    provider: "local",
    execution: "browser",
    quality: "baseline",
    wordTimestamps: true,
    detail: "Fastest private baseline",
  },
  {
    id: "Xenova/whisper-small",
    label: "Whisper Small",
    shortLabel: "Small",
    provider: "local",
    execution: "browser",
    quality: "enhanced",
    wordTimestamps: true,
    detail: "Stronger private model",
  },
] as const;

export const DEFAULT_LOCAL_SPEECH_MODEL_ID: LocalTranscriptionModelId = "Xenova/whisper-tiny";
export const DEFAULT_TRANSCRIPTION_MODEL_IDS: readonly TranscriptionModelId[] = [
  "whisper-large-v3-turbo",
  "Xenova/whisper-tiny",
];
export const SPEECH_MODEL_ID = DEFAULT_LOCAL_SPEECH_MODEL_ID;
export const SPEECH_MODEL_LABEL = "Whisper tiny";

const localModelIds: readonly LocalTranscriptionModelId[] = ["Xenova/whisper-tiny", "Xenova/whisper-small"];
const groqModelIds: readonly GroqTranscriptionModelId[] = ["whisper-large-v3-turbo", "whisper-large-v3"];

export const isLocalTranscriptionModel = (modelId: TranscriptionModelId): modelId is LocalTranscriptionModelId =>
  localModelIds.includes(modelId as LocalTranscriptionModelId);

export const isGroqTranscriptionModel = (modelId: string): modelId is GroqTranscriptionModelId =>
  groqModelIds.includes(modelId as GroqTranscriptionModelId);

export const getTranscriptionModel = (modelId: TranscriptionModelId) => {
  const model = TRANSCRIPTION_MODELS.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Unsupported transcription model: ${modelId}`);
  return model;
};

export const getTranscriptionOptions = (language: SpeechLanguage) => ({
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: "word" as const,
  ...(language === "auto" ? {} : { language }),
  task: "transcribe" as const,
});

export const encodePcm16Wav = (audio: Float32Array, sampleRate = 16_000) => {
  const bytesPerSample = 2;
  const dataLength = audio.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);

  for (let index = 0; index < audio.length; index++) {
    const sample = Math.max(-1, Math.min(1, audio[index]));
    view.setInt16(44 + index * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
};
