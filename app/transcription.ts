export type SpeechLanguage = "auto" | "english" | "german" | "russian" | "spanish" | "french";
export const SPEECH_LANGUAGE_OPTIONS: readonly { id: SpeechLanguage; label: string; shortLabel: string }[] = [
  { id: "auto", label: "Auto detect", shortLabel: "Auto" },
  { id: "english", label: "English", shortLabel: "EN" },
  { id: "german", label: "German / Deutsch", shortLabel: "DE" },
  { id: "russian", label: "Russian / Русский", shortLabel: "RU" },
  { id: "spanish", label: "Spanish / Español", shortLabel: "ES" },
  { id: "french", label: "French / Français", shortLabel: "FR" },
];

const groqLanguageCodes: Record<Exclude<SpeechLanguage, "auto">, string> = {
  english: "en",
  german: "de",
  russian: "ru",
  spanish: "es",
  french: "fr",
};

export const isSpeechLanguage = (value: string): value is SpeechLanguage =>
  SPEECH_LANGUAGE_OPTIONS.some((language) => language.id === value);

export const getGroqLanguageCode = (language: SpeechLanguage) => language === "auto" ? null : groqLanguageCodes[language];
export const DEFAULT_TRANSCRIPTION_GLOSSARY = "Anthropic, OpenAI, ChatGPT, Claude, Gemini, Groq, Kimi, xAI";
export const MAX_TRANSCRIPTION_GLOSSARY_LENGTH = 500;
export const CLOUD_TRANSCRIPTION_CHUNK_SECONDS = 30;

export const normalizeTranscriptionGlossary = (value: string) =>
  value.replace(/\s+/g, " ").replace(/^[,\s]+|[,\s]+$/g, "").slice(0, MAX_TRANSCRIPTION_GLOSSARY_LENGTH);

export const getGroqTranscriptionPrompt = (language: SpeechLanguage, glossary: string) => {
  const terms = normalizeTranscriptionGlossary(glossary);
  if (!terms) return "";
  if (language === "german") return `Folgende Eigennamen und Fachbegriffe können vorkommen: ${terms}. Schreibe sie genau so.`;
  if (language === "russian") return `В аудио могут встречаться следующие имена и термины: ${terms}. Пиши их именно так.`;
  if (language === "spanish") return `El audio puede contener estos nombres y términos: ${terms}. Escríbelos exactamente así.`;
  if (language === "french") return `L'audio peut contenir ces noms et termes : ${terms}. Écris-les exactement ainsi.`;
  return `The audio may contain these names and terms: ${terms}. Spell them exactly as written.`;
};

export const splitAudioForCloud = (
  audio: Float32Array,
  sampleRate = 16_000,
  chunkSeconds = CLOUD_TRANSCRIPTION_CHUNK_SECONDS,
) => {
  const samplesPerChunk = Math.max(1, Math.floor(sampleRate * chunkSeconds));
  const chunks: Array<{ audio: Float32Array; offsetSeconds: number }> = [];
  for (let offset = 0; offset < audio.length; offset += samplesPerChunk) {
    chunks.push({
      audio: audio.slice(offset, Math.min(audio.length, offset + samplesPerChunk)),
      offsetSeconds: offset / sampleRate,
    });
  }
  return chunks;
};

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
  "whisper-large-v3",
  "Xenova/whisper-small",
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
