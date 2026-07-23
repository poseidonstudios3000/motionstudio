import { isGroqTranscriptionModel } from "../../../transcription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

const parseWords = (payload: JsonRecord) => {
  if (!Array.isArray(payload.words)) return [];
  return payload.words.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const text = typeof entry.word === "string" ? entry.word.trim() : typeof entry.text === "string" ? entry.text.trim() : "";
    const start = typeof entry.start === "number" && Number.isFinite(entry.start) ? Math.max(0, entry.start) : 0;
    const end = typeof entry.end === "number" && Number.isFinite(entry.end) ? Math.max(start, entry.end) : start;
    return text ? [{ text, start, end }] : [];
  });
};

export const GET = () =>
  Response.json(
    {
      configured: Boolean(process.env.GROQ_API_KEY),
      models: ["whisper-large-v3-turbo", "whisper-large-v3"],
    },
    { headers: { "cache-control": "no-store" } },
  );

export const POST = async (request: Request) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return errorResponse("Groq transcription is not configured on this deployment.", 503);

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return errorResponse("Send a multipart audio upload.", 400);
  }

  const model = input.get("model");
  const audio = input.get("audio");
  if (typeof model !== "string" || !isGroqTranscriptionModel(model)) return errorResponse("Choose a supported Groq transcription model.", 400);
  if (!(audio instanceof File)) return errorResponse("An extracted WAV audio file is required.", 400);
  if (!audio.size) return errorResponse("The extracted audio file is empty.", 400);
  if (audio.size > MAX_AUDIO_BYTES) return errorResponse("The extracted audio exceeds the 90-second analysis limit.", 413);
  if (audio.type && audio.type !== "audio/wav" && audio.type !== "audio/wave" && audio.type !== "audio/x-wav") {
    return errorResponse("Only normalized WAV audio is accepted.", 415);
  }

  const providerInput = new FormData();
  providerInput.append("file", audio, "motion-studio-audio.wav");
  providerInput.append("model", model);
  providerInput.append("response_format", "verbose_json");
  providerInput.append("timestamp_granularities[]", "word");
  providerInput.append("temperature", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const startedAt = performance.now();
    const providerResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: providerInput,
      signal: controller.signal,
    });
    const payload: unknown = await providerResponse.json().catch(() => null);
    if (!providerResponse.ok) {
      const providerMessage = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === "string"
        ? payload.error.message
        : "Groq rejected the transcription request.";
      return errorResponse(providerResponse.status === 401 ? "The configured Groq key is invalid or expired." : providerMessage, providerResponse.status);
    }
    if (!isRecord(payload) || typeof payload.text !== "string") return errorResponse("Groq returned an unreadable transcription response.", 502);

    return Response.json(
      {
        model,
        text: payload.text.trim(),
        language: typeof payload.language === "string" ? payload.language : null,
        words: parseWords(payload),
        providerElapsedMs: Math.round(performance.now() - startedAt),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return errorResponse("Groq transcription timed out. Try a shorter clip.", 504);
    return errorResponse("Groq transcription could not be reached. Try again or use a local model.", 502);
  } finally {
    clearTimeout(timeout);
  }
};
