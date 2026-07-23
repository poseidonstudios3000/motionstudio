export type SpeechLanguage = "auto" | "english" | "german" | "russian" | "spanish" | "french";
export type TranscriptionModelId =
  | "Xenova/whisper-tiny"
  | "Xenova/whisper-small"
  | "gpt-4o-mini-transcribe"
  | "gpt-4o-transcribe"
  | "whisper-1";

export type TranscriptionModelProfile = {
  id: TranscriptionModelId;
  label: string;
  execution: "browser" | "server";
  quality: "baseline" | "enhanced" | "premium";
  wordTimestamps: boolean;
};

export const TRANSCRIPTION_MODELS: readonly TranscriptionModelProfile[] = [
  { id: "Xenova/whisper-tiny", label: "Whisper tiny", execution: "browser", quality: "baseline", wordTimestamps: true },
  { id: "Xenova/whisper-small", label: "Whisper small", execution: "browser", quality: "enhanced", wordTimestamps: true },
  { id: "gpt-4o-mini-transcribe", label: "GPT-4o mini transcribe", execution: "server", quality: "enhanced", wordTimestamps: false },
  { id: "gpt-4o-transcribe", label: "GPT-4o transcribe", execution: "server", quality: "premium", wordTimestamps: false },
  { id: "whisper-1", label: "Whisper API", execution: "server", quality: "enhanced", wordTimestamps: true },
] as const;

export const DEFAULT_LOCAL_SPEECH_MODEL_ID: TranscriptionModelId = "Xenova/whisper-tiny";
export const SPEECH_MODEL_ID = DEFAULT_LOCAL_SPEECH_MODEL_ID;
export const SPEECH_MODEL_LABEL = "Whisper tiny";

export const getTranscriptionOptions = (language: SpeechLanguage) => ({
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: "word" as const,
  ...(language === "auto" ? {} : { language }),
  task: "transcribe" as const,
});
