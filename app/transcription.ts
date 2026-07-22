export type SpeechLanguage = "english" | "german";

export const SPEECH_MODEL_ID = "Xenova/whisper-small";
export const SPEECH_MODEL_LABEL = "Whisper small";

export const getTranscriptionOptions = (language: SpeechLanguage) => ({
  chunk_length_s: 30,
  stride_length_s: 5,
  return_timestamps: "word" as const,
  language,
  task: "transcribe" as const,
});
