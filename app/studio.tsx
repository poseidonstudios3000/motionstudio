"use client";

import { type ChangeEvent, type CSSProperties, type DragEvent, type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  ArrowDownToLine,
  AudioLines,
  AlertTriangle,
  BadgeCheck,
  Bot,
  Captions,
  Check,
  ChevronDown,
  Clapperboard,
  CloudUpload,
  Code2,
  Film,
  FolderOpen,
  Gauge,
  Gamepad2,
  ImageIcon,
  Languages,
  Layers3,
  LoaderCircle,
  Map,
  MessageCircle,
  MonitorPlay,
  MoreHorizontal,
  MousePointer2,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Scissors,
  Sparkles,
  Upload,
  WandSparkles,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import packageJson from "../package.json";
import {
  MotionComposition,
  type CaptionPreset,
  type MotionCompositionProps,
  type MotionStyle,
  type SceneSpec,
  type TimedWord,
  type VisualKind,
} from "./motion-composition";
import { extractSpeechAudio, inspectMedia, MAX_ANALYSIS_SECONDS, normalizeTimedWords } from "./media-analysis";
import { planStoryboard, type DetectedLanguage } from "./storyboard";
import { TranscriptionComparisonResults, TranscriptionGlossaryInput, TranscriptionLanguagePicker, TranscriptionModelPicker, type TranscriptionRun } from "./transcription-comparison";
import {
  DEFAULT_TRANSCRIPTION_GLOSSARY,
  DEFAULT_TRANSCRIPTION_MODEL_IDS,
  encodePcm16Wav,
  getTranscriptionModel,
  isGroqTranscriptionModel,
  isLocalTranscriptionModel,
  SPEECH_LANGUAGE_OPTIONS,
  splitAudioForCloud,
  type GroqTranscriptionModelId,
  type LocalTranscriptionModelId,
  type SpeechLanguage,
  type TranscriptionModelId,
} from "./transcription";

const FPS = 30;
const APP_VERSION = packageJson.version;
type MaterialPreset = "graphite" | "silver" | "chrome" | "titanium" | "carbon" | "frost";
type FontPreset = "geist" | "swiss" | "humanist" | "technical" | "editorial" | "rounded";
const MATERIAL_PRESETS: readonly { id: MaterialPreset; label: string; shortLabel: string }[] = [
  { id: "graphite", label: "Graphite · plain", shortLabel: "GP" },
  { id: "silver", label: "Silver · plain", shortLabel: "SP" },
  { id: "chrome", label: "Chrome · gradient", shortLabel: "CG" },
  { id: "titanium", label: "Titanium · gradient", shortLabel: "TG" },
  { id: "carbon", label: "Carbon · plain", shortLabel: "CP" },
  { id: "frost", label: "Frost · gradient", shortLabel: "FG" },
];
const FONT_PRESETS: readonly { id: FontPreset; label: string; shortLabel: string }[] = [
  { id: "geist", label: "Geist", shortLabel: "G" },
  { id: "swiss", label: "Swiss", shortLabel: "H" },
  { id: "humanist", label: "Humanist", shortLabel: "A" },
  { id: "technical", label: "Technical", shortLabel: "01" },
  { id: "editorial", label: "Editorial serif", shortLabel: "E" },
  { id: "rounded", label: "Rounded modern", shortLabel: "R" },
];
const demoTranscript =
  "Stop building games with ChatGPT. Claude Code ships a playable game in one shot. GLM 5.2 wins in wild mechanics. Gemini eats your whole codebase and assets in one prompt. So which one is your default? Comment down below.";

const demoScenes: SceneSpec[] = [
  { id: "hook-chatgpt", start: 0, end: 0.17, kind: "hook", eyebrow: "The old default", title: "Building games with ChatGPT?", detail: "The first sentence becomes a hard visual interrupt.", brand: "openai" },
  { id: "claude-code", start: 0.17, end: 0.36, kind: "code", eyebrow: "One-shot build", title: "Code becomes playable", detail: "Code assembles into a playable game window.", brand: "anthropic" },
  { id: "glm-mechanics", start: 0.36, end: 0.53, kind: "mechanics", eyebrow: "GLM 5.2", title: "Wild mechanics", detail: "Physics nodes mutate around the model.", brand: "glm" },
  { id: "gemini-context", start: 0.53, end: 0.73, kind: "context", eyebrow: "Full-context reasoning", title: "Gemini eats the whole repo", detail: "Folders, code and assets converge into one model.", brand: "gemini" },
  { id: "model-compare", start: 0.73, end: 0.88, kind: "compare", eyebrow: "Choose your player", title: "Four models. Four strengths.", detail: "A rapid comparison locks the message in.", brands: ["openai", "anthropic", "glm", "gemini"] },
  { id: "comment-cta", start: 0.88, end: 1, kind: "cta", eyebrow: "Your turn", title: "Which is your default?", detail: "The final frame converts attention into comments.", ctaLabel: "Comment below" },
];

const sceneNames: Record<VisualKind, string> = {
  hook: "Pattern interrupt",
  brand: "Brand focus",
  code: "Code → product",
  mechanics: "Gaming mechanics",
  context: "Context ingest",
  compare: "Brand comparison",
  cta: "Comment CTA",
  travel: "Map journey",
  social: "Social logos",
  stat: "Data counter",
  race: "Country robot race",
  keyword: "Kinetic keyword",
};

const sceneIcons: Record<VisualKind, typeof Sparkles> = {
  hook: Zap,
  brand: BadgeCheck,
  code: Code2,
  mechanics: Gamepad2,
  context: FolderOpen,
  compare: Layers3,
  cta: MessageCircle,
  travel: Map,
  social: ImageIcon,
  stat: Gauge,
  race: Bot,
  keyword: Sparkles,
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

const formatBytes = (bytes: number) => bytes ? `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB` : "Demo source";
const languageName: Record<DetectedLanguage, string> = { EN: "English", DE: "German", RU: "Russian" };

type Panel = "scenes" | "captions" | "brand";
type RenderStatus = "idle" | "checking" | "rendering" | "complete" | "error";

type GroqTranscriptionPayload = {
  text: string;
  words: TimedWord[];
};

const transcribeGroqChunk = async (audio: Float32Array, modelId: GroqTranscriptionModelId, language: SpeechLanguage, glossary: string, signal: AbortSignal): Promise<GroqTranscriptionPayload> => {
  const formData = new FormData();
  formData.append("model", modelId);
  formData.append("language", language);
  formData.append("glossary", glossary);
  formData.append("audio", encodePcm16Wav(audio), "motion-studio-audio.wav");
  const response = await fetch("/api/transcription/groq", { method: "POST", body: formData, signal });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Groq transcription failed.";
    throw new Error(message);
  }
  if (typeof payload !== "object" || payload === null || !("text" in payload) || typeof payload.text !== "string") {
    throw new Error("Groq returned an unreadable transcript.");
  }
  const words = "words" in payload && Array.isArray(payload.words)
    ? payload.words.flatMap((word) => {
        if (typeof word !== "object" || word === null) return [];
        const candidate = word as Record<string, unknown>;
        if (typeof candidate.text !== "string" || typeof candidate.start !== "number" || typeof candidate.end !== "number") return [];
        return [{ text: candidate.text, start: candidate.start, end: candidate.end }];
      })
    : [];
  return { text: payload.text.trim(), words };
};

const transcribeWithGroq = async (audio: Float32Array, modelId: GroqTranscriptionModelId, language: SpeechLanguage, glossary: string, signal: AbortSignal): Promise<GroqTranscriptionPayload> => {
  const textParts: string[] = [];
  const words: TimedWord[] = [];
  for (const chunk of splitAudioForCloud(audio)) {
    if (signal.aborted) throw new DOMException("Transcription cancelled", "AbortError");
    const result = await transcribeGroqChunk(chunk.audio, modelId, language, glossary, signal);
    if (result.text) textParts.push(result.text);
    words.push(...result.words.map((word) => ({
      ...word,
      start: word.start + chunk.offsetSeconds,
      end: word.end + chunk.offsetSeconds,
    })));
  }
  return { text: textParts.join(" ").trim(), words };
};

export default function Studio() {
  const fileInput = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const uploadUrl = useRef<string | null>(null);
  const transcriptionWorker = useRef<Worker | null>(null);
  const analysisRequest = useRef(0);
  const analysisAbort = useRef<AbortController | null>(null);
  const sourceAudio = useRef<Float32Array | null>(null);
  const renderAbort = useRef<AbortController | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("AI models — demo.mov");
  const [sourceMeta, setSourceMeta] = useState({ duration: 18.2, width: 1080, height: 1920, size: 0 });
  const [language, setLanguage] = useState<DetectedLanguage>("EN");
  const [transcript, setTranscript] = useState(demoTranscript);
  const [words, setWords] = useState<TimedWord[]>([]);
  const [scenes, setScenes] = useState<SceneSpec[]>(demoScenes);
  const [selectedSceneId, setSelectedSceneId] = useState(demoScenes[0].id);
  const [captionPreset, setCaptionPreset] = useState<CaptionPreset>("punch");
  const [motionStyle, setMotionStyle] = useState<MotionStyle>("kinetic");
  const [accent, setAccent] = useState("#1035F4");
  const [activePanel, setActivePanel] = useState<Panel>("scenes");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("Preparing media");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [needsTranscript, setNeedsTranscript] = useState(false);
  const [storyboardDirty, setStoryboardDirty] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [renderStatus, setRenderStatus] = useState<RenderStatus>("idle");
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState("");
  const [resolution, setResolution] = useState<720 | 1080>(720);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [wordTiming, setWordTiming] = useState(true);
  const [dopaminePacing, setDopaminePacing] = useState(true);
  const [sourceFit, setSourceFit] = useState<"cover" | "contain">("cover");
  const [materialPreset, setMaterialPreset] = useState<MaterialPreset>("chrome");
  const [fontPreset, setFontPreset] = useState<FontPreset>("geist");
  const [dropActive, setDropActive] = useState(false);
  const [selectedTranscriptionModels, setSelectedTranscriptionModels] = useState<TranscriptionModelId[]>([...DEFAULT_TRANSCRIPTION_MODEL_IDS]);
  const [selectedSpeechLanguage, setSelectedSpeechLanguage] = useState<SpeechLanguage>("auto");
  const [transcriptionGlossary, setTranscriptionGlossary] = useState(DEFAULT_TRANSCRIPTION_GLOSSARY);
  const [lastTranscriptionLanguage, setLastTranscriptionLanguage] = useState<SpeechLanguage>("auto");
  const [transcriptionRuns, setTranscriptionRuns] = useState<TranscriptionRun[]>([]);
  const [appliedTranscriptionModel, setAppliedTranscriptionModel] = useState<TranscriptionModelId | null>(null);
  const [hasSourceAudio, setHasSourceAudio] = useState(false);

  const durationInFrames = Math.max(1, Math.ceil(sourceMeta.duration * FPS));
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0];
  const currentProgress = durationInFrames <= 1 ? 0 : Math.min(1, currentFrame / (durationInFrames - 1));
  const playingSceneId = scenes.find((scene) => currentProgress >= scene.start && currentProgress < scene.end)?.id ?? scenes.at(-1)?.id;
  const usesGroqTranscription = selectedTranscriptionModels.some(isGroqTranscriptionModel);
  const appliedModel = appliedTranscriptionModel ? getTranscriptionModel(appliedTranscriptionModel) : null;
  const comparisonLanguageLabel = SPEECH_LANGUAGE_OPTIONS.find((option) => option.id === lastTranscriptionLanguage)?.label ?? "Auto detect";
  const compositionProps = useMemo<MotionCompositionProps>(() => ({ videoUrl, transcript, words, scenes, captionPreset, motionStyle, accent, projectName: "MOTN / 001", durationInFrames, soundEnabled, wordTiming, sourceFit }), [videoUrl, transcript, words, scenes, captionPreset, motionStyle, accent, durationInFrames, soundEnabled, wordTiming, sourceFit]);

  useEffect(() => () => {
    analysisRequest.current += 1;
    analysisAbort.current?.abort();
    transcriptionWorker.current?.terminate();
    renderAbort.current?.abort();
    if (uploadUrl.current) URL.revokeObjectURL(uploadUrl.current);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = ({ detail }: { detail: { frame: number } }) => setCurrentFrame(detail.frame);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = ({ detail }: { detail: { error: Error } }) => setUploadError(`Preview error: ${detail.error.message}`);
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onEnded);
    player.addEventListener("error", onError);
    setCurrentFrame(player.getCurrentFrame());
    setIsPlaying(player.isPlaying());
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onEnded);
      player.removeEventListener("error", onError);
    };
  }, [videoUrl, durationInFrames]);

  useEffect(() => {
    if (!showImport && !showComparison) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || processing) return;
      if (showComparison) setShowComparison(false);
      else setShowImport(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showComparison, showImport, processing]);

  const transcribeAudio = useCallback((audio: Float32Array, requestId: number, signal: AbortSignal, modelId: LocalTranscriptionModelId, languageHint: SpeechLanguage) => new Promise<{ text: string; words: TimedWord[] }>((resolve, reject) => {
    const worker = transcriptionWorker.current ?? new Worker(new URL("./transcription-worker.ts", import.meta.url), { type: "module" });
    transcriptionWorker.current = worker;
    let settled = false;
    const timeout = window.setTimeout(() => fail(new Error("Local transcription took too long. Paste a transcript manually or try a shorter clip."), true), 6 * 60_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onWorkerError);
      worker.removeEventListener("messageerror", onMessageError);
      signal.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error, resetWorker = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (resetWorker) {
        worker.terminate();
        if (transcriptionWorker.current === worker) transcriptionWorker.current = null;
      }
      reject(error);
    };
    const succeed = (value: { text: string; words: TimedWord[] }) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const onMessage = (event: MessageEvent<{ type: string; requestId?: number; message?: string; progress?: number; text?: string; chunks?: Array<{ text?: string; timestamp?: [number | null, number | null] }> }>) => {
      const data = event.data;
      if (data.type === "model-progress") {
        if (typeof data.progress === "number") setAnalysisProgress(42 + Math.round(data.progress * .28));
        setAnalysisStage("Loading private speech model");
        return;
      }
      if (data.requestId !== requestId) return;
      if (data.type === "status") {
        setAnalysisStage(data.message ?? "Transcribing speech locally");
        setAnalysisProgress((value) => Math.max(value, 72));
      }
      if (data.type === "result") {
        succeed({ text: data.text?.trim() ?? "", words: normalizeTimedWords(data.chunks) });
      }
      if (data.type === "error") {
        fail(new Error(data.message ?? "Local transcription failed."));
      }
    };
    const onWorkerError = (event: ErrorEvent) => {
      event.preventDefault();
      fail(new Error(event.message || "The local speech engine could not start. Paste a transcript manually to continue."), true);
    };
    const onMessageError = () => fail(new Error("The local speech engine returned unreadable data. Paste a transcript manually to continue."), true);
    const onAbort = () => fail(new DOMException("Transcription cancelled", "AbortError"), true);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onWorkerError);
    worker.addEventListener("messageerror", onMessageError);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    worker.postMessage({ type: "transcribe", requestId, audio, modelId, language: languageHint }, [audio.buffer]);
  }), []);

  const toggleTranscriptionModel = (modelId: TranscriptionModelId) => {
    setSelectedTranscriptionModels((current) => current.includes(modelId)
      ? current.length === 1 ? current : current.filter((candidate) => candidate !== modelId)
      : [...current, modelId]);
  };

  const applyTranscription = useCallback((run: TranscriptionRun, duration: number) => {
    if (run.status !== "success" || !run.text.trim()) return;
    const planned = planStoryboard({ transcript: run.text, words: run.words, duration, dopaminePacing });
    setTranscript(run.text);
    setWords(run.words);
    setLanguage(planned.language);
    setAppliedTranscriptionModel(run.modelId);
    setNeedsTranscript(false);
    setStoryboardDirty(true);
    setActivePanel("captions");
  }, [dopaminePacing]);

  const runTranscriptionComparison = useCallback(async (audio: Float32Array, requestId: number, signal: AbortSignal, duration: number) => {
    const completed: TranscriptionRun[] = [];
    const publish = (run: TranscriptionRun) => {
      completed.push(run);
      setTranscriptionRuns((current) => [...current.filter((candidate) => candidate.modelId !== run.modelId), run]);
    };
    const capture = async (modelId: TranscriptionModelId, operation: () => Promise<{ text: string; words: TimedWord[] }>) => {
      const startedAt = performance.now();
      try {
        const result = await operation();
        const run: TranscriptionRun = { modelId, status: "success", text: result.text, words: result.words, elapsedMs: performance.now() - startedAt };
        publish(run);
        return run;
      } catch (error) {
        if (signal.aborted) throw error;
        const run: TranscriptionRun = { modelId, status: "error", text: "", words: [], elapsedMs: performance.now() - startedAt, error: error instanceof Error ? error.message : "Transcription failed." };
        publish(run);
        return run;
      }
    };

    setTranscriptionRuns([]);
    setAppliedTranscriptionModel(null);
    setLastTranscriptionLanguage(selectedSpeechLanguage);
    const groqModels = selectedTranscriptionModels.filter(isGroqTranscriptionModel);
    const localModels = selectedTranscriptionModels.filter(isLocalTranscriptionModel);
    const groqTask = Promise.all(groqModels.map((modelId) => {
      setAnalysisStage(`Sending normalized audio to ${getTranscriptionModel(modelId).shortLabel}`);
      return capture(modelId, () => transcribeWithGroq(audio, modelId, selectedSpeechLanguage, transcriptionGlossary, signal));
    }));
    const localTask = (async () => {
      const localRuns: TranscriptionRun[] = [];
      for (const [index, modelId] of localModels.entries()) {
        if (signal.aborted) throw new DOMException("Transcription cancelled", "AbortError");
        setAnalysisStage(`Running ${getTranscriptionModel(modelId).label} on this device`);
        const run = await capture(modelId, () => transcribeAudio(new Float32Array(audio), requestId * 10 + index + 1, signal, modelId, selectedSpeechLanguage));
        localRuns.push(run);
        if (index < localModels.length - 1) {
          transcriptionWorker.current?.terminate();
          transcriptionWorker.current = null;
        }
      }
      return localRuns;
    })();

    await Promise.all([groqTask, localTask]);
    const successful = completed.filter((run) => run.status === "success" && run.text.trim());
    if (!successful.length) throw new Error("None of the selected models produced a transcript. Review each model error and try again.");
    const priority: readonly TranscriptionModelId[] = ["whisper-large-v3", "whisper-large-v3-turbo", "Xenova/whisper-small", "Xenova/whisper-tiny"];
    const preferred = [...successful].sort((left, right) => priority.indexOf(left.modelId) - priority.indexOf(right.modelId))[0];
    applyTranscription(preferred, duration);
    setShowComparison(true);
    return preferred;
  }, [applyTranscription, selectedSpeechLanguage, selectedTranscriptionModels, transcribeAudio, transcriptionGlossary]);

  const rerunTranscriptionComparison = async () => {
    if (!sourceAudio.current || processing) return;
    analysisAbort.current?.abort();
    const controller = new AbortController();
    analysisAbort.current = controller;
    const requestId = ++analysisRequest.current;
    setProcessing(true);
    setUploadError("");
    setAnalysisStage(`Starting ${selectedTranscriptionModels.length}-model transcription comparison`);
    setAnalysisProgress(42);
    try {
      await runTranscriptionComparison(new Float32Array(sourceAudio.current), requestId, controller.signal, sourceMeta.duration);
      if (requestId !== analysisRequest.current) return;
      setAnalysisProgress(100);
      setAnalysisStage("Comparison ready");
      setActivePanel("captions");
    } catch (error) {
      if (requestId !== analysisRequest.current || controller.signal.aborted) return;
      setUploadError(error instanceof Error ? error.message : "The transcription comparison failed.");
    } finally {
      if (requestId === analysisRequest.current) setProcessing(false);
      if (analysisAbort.current === controller) analysisAbort.current = null;
    }
  };

  const handleFile = async (file: File) => {
    if (renderStatus === "checking" || renderStatus === "rendering") return;
    analysisAbort.current?.abort();
    const controller = new AbortController();
    analysisAbort.current = controller;
    const requestId = ++analysisRequest.current;
    setUploadError("");
    setProcessing(true);
    setAnalysisStage("Inspecting media safely");
    setAnalysisProgress(8);
    let adoptedUrl: string | null = null;
    try {
      const metadata = await inspectMedia(file);
      if (requestId !== analysisRequest.current) return;
      if (!metadata.canPreviewVideo) throw new Error("This video codec cannot play in your browser. Convert it to H.264/AAC or WebM, then try again.");
      const projectDuration = Math.min(metadata.duration, MAX_ANALYSIS_SECONDS);

      playerRef.current?.pause();
      playerRef.current?.seekTo(0);
      setCurrentFrame(0);
      adoptedUrl = URL.createObjectURL(file);
      const previousUrl = uploadUrl.current;
      uploadUrl.current = adoptedUrl;
      setVideoUrl(adoptedUrl);
      setFileName(file.name);
      setSourceMeta({ duration: projectDuration, width: metadata.width, height: metadata.height, size: metadata.size });
      setTranscript("");
      setWords([]);
      setHasSourceAudio(false);
      setTranscriptionRuns([]);
      setAppliedTranscriptionModel(null);
      setShowComparison(false);
      setNeedsTranscript(true);
      setStoryboardDirty(true);
      const placeholder: SceneSpec = { id: "uploaded-placeholder", start: 0, end: 1, kind: "keyword", eyebrow: "Source ready", title: "Comparing your transcript", detail: `${selectedTranscriptionModels.length} speech model${selectedTranscriptionModels.length === 1 ? " is" : "s are"} analyzing the first ${Math.round(projectDuration)} seconds.` };
      setScenes([placeholder]);
      setSelectedSceneId(placeholder.id);
      setShowImport(false);
      if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 1_500);

      setAnalysisStage(`Extracting audio · first ${Math.min(MAX_ANALYSIS_SECONDS, Math.ceil(metadata.duration))}s`);
      setAnalysisProgress(28);
      const audio = await extractSpeechAudio(file);
      if (requestId !== analysisRequest.current) return;
      sourceAudio.current = new Float32Array(audio);
      setHasSourceAudio(true);
      setAnalysisStage(`Starting ${selectedTranscriptionModels.length}-model transcription comparison`);
      setAnalysisProgress(42);
      const result = await runTranscriptionComparison(audio, requestId, controller.signal, projectDuration);
      if (requestId !== analysisRequest.current) return;
      if (!result.text) throw new Error("No speech was detected. You can still paste a transcript manually.");

      setAnalysisStage("Comparison ready — choose the transcript you prefer");
      setActivePanel("captions");
      setAnalysisProgress(100);
      setAnalysisStage("Custom video ready");
    } catch (error) {
      if (requestId !== analysisRequest.current) return;
      const message = error instanceof Error ? error.message : "The video could not be analyzed.";
      setUploadError(message);
      if (adoptedUrl) {
        setNeedsTranscript(true);
        setStoryboardDirty(true);
        setActivePanel("captions");
        setAnalysisStage("Transcript needed");
      } else {
        setShowImport(true);
      }
    } finally {
      if (requestId === analysisRequest.current) setProcessing(false);
      if (analysisAbort.current === controller) analysisAbort.current = null;
    }
  };

  const loadDemo = () => {
    analysisAbort.current?.abort();
    analysisAbort.current = null;
    analysisRequest.current += 1;
    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
    setCurrentFrame(0);
    const previousUrl = uploadUrl.current;
    uploadUrl.current = null;
    sourceAudio.current = null;
    setHasSourceAudio(false);
    setVideoUrl(null);
    setFileName("AI models — demo.mov");
    setSourceMeta({ duration: 18.2, width: 1080, height: 1920, size: 0 });
    setLanguage("EN");
    setTranscript(demoTranscript);
    setWords([]);
    setTranscriptionRuns([]);
    setAppliedTranscriptionModel(null);
    setShowComparison(false);
    setScenes(demoScenes);
    setSelectedSceneId(demoScenes[0].id);
    setNeedsTranscript(false);
    setStoryboardDirty(false);
    setProcessing(false);
    setUploadError("");
    setShowImport(false);
    setActivePanel("scenes");
    if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 1_500);
  };

  const redirectScenes = (pacing = dopaminePacing) => {
    if (!transcript.trim()) return;
    const planned = planStoryboard({ transcript, words, duration: sourceMeta.duration, dopaminePacing: pacing });
    setLanguage(planned.language);
    setScenes(planned.scenes);
    setSelectedSceneId(planned.scenes[0].id);
    setNeedsTranscript(false);
    setStoryboardDirty(false);
    setActivePanel("scenes");
    playerRef.current?.seekTo(0);
    setCurrentFrame(0);
  };

  const selectScene = (scene: SceneSpec) => {
    setSelectedSceneId(scene.id);
    playerRef.current?.seekTo(Math.min(durationInFrames - 1, Math.ceil(scene.start * (durationInFrames - 1))));
  };
  const updateScene = (patch: Partial<SceneSpec>) => setScenes((current) => current.map((scene) => scene.id === selectedScene?.id ? { ...scene, ...patch } : scene));
  const togglePlayback = (event: SyntheticEvent) => playerRef.current?.toggle(event);
  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const frame = Number(event.target.value);
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const exportMp4 = async () => {
    if (processing || renderStatus === "checking" || renderStatus === "rendering") return;
    if (!transcript.trim() || needsTranscript || storyboardDirty) {
      setActivePanel("captions");
      setRenderStatus("error");
      setRenderMessage("Finish the transcript and regenerate the storyboard before exporting.");
      return;
    }
    const controller = new AbortController();
    renderAbort.current = controller;
    setRenderStatus("checking");
    setRenderProgress(0);
    setRenderMessage("Checking browser encoder…");
    try {
      const { canRenderMediaOnWeb, renderMediaOnWeb } = await import("@remotion/web-renderer");
      const muted = !videoUrl || !soundEnabled;
      const outputWidth = resolution;
      const outputHeight = Math.round((resolution * 16) / 9);
      const support = await canRenderMediaOnWeb({ width: outputWidth, height: outputHeight, container: "mp4", videoCodec: "h264", audioCodec: muted ? null : "aac", videoBitrate: "high", audioBitrate: "high", outputTarget: null, muted });
      if (!support.canRender) throw new Error("This browser does not expose the WebCodecs features needed for local MP4 rendering. Try current Chrome or Edge.");
      setRenderStatus("rendering");
      setRenderMessage("Rendering frames locally — keep this tab open");
      const result = await renderMediaOnWeb({
        composition: { id: "motn-talking-head", component: MotionComposition, durationInFrames, fps: FPS, width: 1080, height: 1920, defaultProps: compositionProps },
        inputProps: compositionProps,
        container: "mp4",
        videoCodec: support.resolvedVideoCodec,
        audioCodec: muted ? null : support.resolvedAudioCodec,
        videoBitrate: "high",
        audioBitrate: "high",
        sampleRate: 48_000,
        hardwareAcceleration: "no-preference",
        keyframeIntervalInSeconds: 5,
        pageResponsiveness: "medium",
        outputTarget: support.resolvedOutputTarget,
        muted,
        scale: resolution / 1080,
        licenseKey: "free-license",
        isProduction: true,
        signal: controller.signal,
        onProgress: ({ progress }) => setRenderProgress(Math.max(1, Math.round(progress * 100))),
      });
      const blob = await result.getBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `motn-${fileName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${resolution}p.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setRenderProgress(100);
      setRenderStatus("complete");
      setRenderMessage("MP4 downloaded");
    } catch (error) {
      if (controller.signal.aborted) {
        setRenderStatus("idle");
        setRenderMessage("");
      } else {
        setRenderStatus("error");
        const rawMessage = error instanceof Error ? error.message : "Local MP4 rendering failed.";
        setRenderMessage(/decode|codec|media source/i.test(rawMessage) ? "The uploaded codec cannot be decoded for export. Normalize it to H.264/AAC and try again." : rawMessage);
      }
    } finally {
      if (renderAbort.current === controller) renderAbort.current = null;
    }
  };
  const cancelRender = () => renderAbort.current?.abort();

  return (
    <main className="studio-shell" data-material={materialPreset} data-font={fontPreset}>
      <header className="topbar">
        <div className="topbar-brand-zone">
          <div className="brand-lockup" aria-label={`MOTION Studio version ${APP_VERSION} alpha`}><span className="brand-mark"><img src="/motion-studio-logo.png" alt="" /></span><span className="brand-name">MOTION</span><span className="brand-product">Studio</span><span className="brand-version">v{APP_VERSION} alpha</span></div>
          <button className="ghost-button new-video-button" type="button" onClick={() => setShowImport(true)} disabled={processing || renderStatus === "checking" || renderStatus === "rendering"}><Plus size={16} /> New video</button>
        </div>
        <div className="project-heading"><span className={`project-status-dot ${needsTranscript || storyboardDirty ? "warning" : "success"}`} /><div><strong>{fileName}</strong><span>Local draft · private on this device</span></div><ChevronDown size={15} /></div>
        <div className="topbar-actions">
          <div className="ui-preset-control" aria-label="Background theme"><span>Background</span><div>{MATERIAL_PRESETS.map((preset) => <button type="button" key={preset.id} className={materialPreset === preset.id ? "active" : ""} aria-pressed={materialPreset === preset.id} title={preset.label} onClick={() => setMaterialPreset(preset.id)}>{preset.shortLabel}</button>)}</div></div>
          <div className="ui-preset-control font-preset-control" aria-label="Font set"><span>Type</span><div>{FONT_PRESETS.map((preset) => <button type="button" key={preset.id} className={fontPreset === preset.id ? "active" : ""} aria-pressed={fontPreset === preset.id} title={preset.label} onClick={() => setFontPreset(preset.id)}>{preset.shortLabel}</button>)}</div></div>
        </div>
      </header>

      <div className="studio-grid">
        <aside className="workflow-rail">
          <div className="rail-title"><span>Workflow</span><MoreHorizontal size={18} /></div>
          <div className="workflow-list">
            {[
              { n: "01", label: "Source", meta: `${formatTime(sourceMeta.duration)} · ${sourceMeta.width}×${sourceMeta.height}`, icon: CloudUpload },
              { n: "02", label: "Transcript", meta: needsTranscript ? "Needs review" : `${languageName[language]} · ${transcript.trim().split(/\s+/).filter(Boolean).length} words`, icon: Languages },
              { n: "03", label: "AI Storyboard", meta: `${scenes.length} visual beats`, icon: WandSparkles },
              { n: "04", label: "Style", meta: `${captionPreset} · ${motionStyle}`, icon: Palette },
            ].map((item, index) => {
              const Icon = item.icon;
              const active = showImport ? index === 0 : activePanel === "captions" ? index === 1 : activePanel === "scenes" ? index === 2 : index === 3;
              const complete = index === 0 || (index > 0 && index < 4 && !needsTranscript && !storyboardDirty);
              return <button type="button" className={`workflow-step ${active ? "active" : ""}`} key={item.n} onClick={() => { if (index === 0) setShowImport(true); if (index === 1) setActivePanel("captions"); if (index === 2) setActivePanel("scenes"); if (index === 3) setActivePanel("brand"); }} disabled={processing}><span className="step-number">{item.n}</span><span className="step-icon"><Icon size={16} /></span><span className="step-copy"><strong>{item.label}</strong><small>{item.meta}</small></span>{complete ? <Check className="step-check" size={14} /> : null}</button>;
            })}
          </div>
          <div className="source-card"><div className="source-preview"><Film size={23} /><span>9:16</span></div><div className="source-copy"><strong>{fileName}</strong><span>{formatTime(sourceMeta.duration)} · {formatBytes(sourceMeta.size)}</span></div><button type="button" aria-label="Replace source" onClick={() => setShowImport(true)} disabled={processing || renderStatus === "checking" || renderStatus === "rendering"}><RefreshCcw size={14} /></button></div>
          <div className="director-card"><span className="director-icon"><img src="/motion-studio-logo.png" alt="" /></span><div><strong>Local AI Director</strong><p>{dopaminePacing ? "Meaning first. A grounded visual change every 2–3 seconds." : "A calmer sequence with longer visual holds."}</p></div></div>
        </aside>

        <aside className={"transcript-panel " + (activePanel === "captions" ? "active-panel" : "")} aria-label="Transcript and captions editor">
          <div className="panel-titlebar"><span><Captions size={15} /> Transcript</span><small>{transcript.trim().split(/\s+/).filter(Boolean).length} words</small></div>
          <div className="panel-content transcript-content">
            <div className="section-heading"><div><span>Captions</span><strong>{languageName[language]} transcript</strong></div><span className="confidence"><BadgeCheck size={13} /> {words.length ? "Word timed" : "Estimated"}</span></div>
            <div className="speech-model-row"><span><AudioLines size={15} /><span><strong>{appliedModel?.label ?? "Transcription benchmark"}</strong><small>{appliedModel ? `${appliedModel.provider === "groq" ? "Groq cloud" : "On device"} · ${appliedModel.wordTimestamps ? "word timed" : "text only"}` : "Choose models below"}</small></span></span><em>{appliedModel ? "Selected" : `${selectedTranscriptionModels.length} selected`}</em></div>
            {transcriptionRuns.length ? <button className="comparison-open" type="button" onClick={() => setShowComparison(true)}><Layers3 size={14} /> Open full transcript comparison</button> : null}
            {needsTranscript ? <div className="prototype-note"><Sparkles size={16} /><p>Local transcription could not finish for this source. Paste the transcript here; the context director will still build a custom storyboard.</p></div> : null}
            {storyboardDirty && transcript.trim() ? <div className="stale-note"><RefreshCcw size={14} /> Review spelling, then save this transcript to generate the scenes.</div> : null}
            <label className="transcript-editor-label" htmlFor="transcript-editor"><span>Spoken text</span><small>Edit mistakes directly. Timing becomes estimated after a manual edit.</small></label>
            <textarea id="transcript-editor" className="transcript-field transcript-field-persistent" value={transcript} onChange={(event) => { setTranscript(event.target.value); setWords([]); setStoryboardDirty(true); setNeedsTranscript(!event.target.value.trim()); setActivePanel("captions"); }} placeholder={language === "DE" ? "Transkript hier einfügen…" : language === "RU" ? "Вставьте расшифровку…" : "Paste transcript here…"} aria-label="Transcript" />
            <button className="primary-action" type="button" onClick={() => redirectScenes()} disabled={!transcript.trim()}><WandSparkles size={16} /> Save transcript and generate scenes</button>
            <details className="transcription-settings">
              <summary><span>Transcription setup</span><small>Language · names · models</small></summary>
              <div>
                <TranscriptionLanguagePicker value={selectedSpeechLanguage} disabled={processing} onChange={setSelectedSpeechLanguage} />
                <TranscriptionGlossaryInput value={transcriptionGlossary} disabled={processing} onChange={setTranscriptionGlossary} />
                <TranscriptionModelPicker selected={selectedTranscriptionModels} disabled={processing} onToggle={toggleTranscriptionModel} />
                {hasSourceAudio ? <button className="secondary-action rerun-models" type="button" onClick={() => void rerunTranscriptionComparison()} disabled={processing}><RefreshCcw size={14} /> Run selected models on current audio</button> : null}
              </div>
            </details>
            <div className="control-section"><div className="control-label"><span>Caption style</span><small>Live preview</small></div><div className="preset-grid">{([ ["punch", "PUNCH", "Fast & bold"], ["clean", "Clean", "Calm & modern"], ["editorial", "Editorial", "Premium serif"] ] as Array<[CaptionPreset, string, string]>).map(([value, label, detail]) => <button className={captionPreset === value ? "active" : ""} type="button" key={value} onClick={() => { setCaptionPreset(value); setActivePanel("captions"); }} aria-pressed={captionPreset === value}><strong className={"caption-sample " + value}>{label}</strong><small>{detail}</small></button>)}</div></div>
            <div className="toggle-row"><div><AudioLines size={17} /><span><strong>Word timing</strong><small>{words.length ? "Whisper timestamps" : "Estimated from duration"}</small></span></div><button className={"switch " + (wordTiming ? "on" : "")} role="switch" aria-checked={wordTiming} type="button" aria-label="Highlight active caption word" onClick={() => { setWordTiming((value) => !value); setActivePanel("captions"); }}><span /></button></div>
          </div>
        </aside>

        <section className="preview-workspace">
          <div className="preview-toolbar"><div className="toolbar-group"><button className="tool-pill active" type="button" aria-pressed="true"><MousePointer2 size={15} /> Select</button><button className={`tool-pill ${sourceFit === "contain" ? "active" : ""}`} type="button" onClick={() => setSourceFit((value) => value === "cover" ? "contain" : "cover")} aria-pressed={sourceFit === "contain"}><Scissors size={15} /> {sourceFit === "cover" ? "Fill" : "Fit"}</button></div><div className="canvas-label"><MonitorPlay size={14} /> 1080 × 1920 <span>·</span> 30 FPS</div><button className="icon-button" type="button" onClick={() => setSoundEnabled((value) => !value)} aria-label="Toggle audio" aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div>
          <div className="player-stage"><div className="player-glow" />
            <aside className="preview-context preview-context-left" aria-label="Source and transcript summary">
              <span className="preview-context-kicker"><Gauge size={13} /> Source</span>
              <strong>{formatTime(sourceMeta.duration)} talking head</strong>
              <dl><div><dt>Frame</dt><dd>{sourceMeta.width} × {sourceMeta.height}</dd></div><div><dt>Audio</dt><dd>{hasSourceAudio ? "Ready" : videoUrl ? "Unavailable" : "Demo"}</dd></div><div><dt>Fit</dt><dd>{sourceFit === "cover" ? "Fill frame" : "Show full source"}</dd></div></dl>
            </aside>
            <div className="player-frame">
            <Player key={`${videoUrl ?? "demo"}-${durationInFrames}`} ref={playerRef} component={MotionComposition} inputProps={compositionProps} durationInFrames={durationInFrames} compositionWidth={1080} compositionHeight={1920} fps={FPS} controls={false} loop playbackRate={playbackRate} acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} />
            {processing ? <div className="analysis-overlay"><span className="analysis-orb"><Sparkles size={25} /></span><strong>{analysisStage}</strong><p>{analysisProgress}% · {usesGroqTranscription ? "local + secure Groq comparison" : "private, on-device transcription"}</p><div className="analysis-bar"><span style={{ width: `${analysisProgress}%` }} /></div></div> : null}
            </div>
            <aside className="preview-context preview-context-right" aria-label="Director and output summary">
              <span className="preview-context-kicker"><Sparkles size={13} /> Director</span>
              <strong>{storyboardDirty ? "Transcript needs saving" : "Storyboard ready"}</strong>
              <dl><div><dt>Transcript</dt><dd>{transcript.trim().split(/\s+/).filter(Boolean).length} words</dd></div><div><dt>Scenes</dt><dd>{scenes.length} visual beats</dd></div><div><dt>Selected</dt><dd>{selectedScene ? sceneNames[selectedScene.kind] : "None"}</dd></div></dl>
            </aside>
          </div>
          {uploadError && !processing ? <div className="source-alert" role="alert"><AlertTriangle size={15} /><span>{uploadError}</span><button type="button" onClick={() => { setActivePanel("captions"); setUploadError(""); }}>Use transcript</button></div> : null}
          <div className="transport-bar"><button className="transport-play" type="button" onClick={togglePlayback} aria-label={isPlaying ? "Pause" : "Play"}>{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><span className="timecode">{formatTime(currentFrame / FPS)}</span><input className="transport-line" type="range" min="0" max={Math.max(0, durationInFrames - 1)} value={Math.min(currentFrame, durationInFrames - 1)} onChange={handleSeek} aria-label="Video progress" style={{ "--progress": `${currentProgress * 100}%` } as CSSProperties} /><span className="timecode muted">{formatTime(sourceMeta.duration)}</span><button className="speed-pill" type="button" onClick={() => setPlaybackRate((value) => value === .5 ? 1 : value === 1 ? 1.5 : value === 1.5 ? 2 : .5)} aria-label={`Playback speed ${playbackRate} times`}>{playbackRate}×</button></div>
        </section>

        <aside className={"inspector-panel scene-panel " + (activePanel === "scenes" ? "active-panel" : "")} aria-label="Storyboard scenes">
          <div className="panel-titlebar"><span><Clapperboard size={15} /> Scenes</span><small>{scenes.length} beats</small></div>
          <div className="panel-content" id="panel-scenes">
            <div className="section-heading"><div><span>AI Storyboard</span><strong>{scenes.length} grounded beats</strong></div><button type="button" onClick={() => redirectScenes()} aria-label="Regenerate storyboard" disabled={!transcript.trim() || processing}><RefreshCcw size={15} /></button></div>
            <div className="scene-list">{scenes.map((scene, index) => { const Icon = sceneIcons[scene.kind]; return <button type="button" key={scene.id} className={`scene-card ${scene.id === selectedScene?.id ? "selected" : ""} ${scene.id === playingSceneId ? "playing" : ""}`} onClick={() => selectScene(scene)} aria-current={scene.id === playingSceneId ? "true" : undefined}><span className="scene-index">{String(index + 1).padStart(2, "0")}</span><span className="scene-thumbnail"><Icon size={23} /></span><span className="scene-copy"><small>{formatTime(scene.start * sourceMeta.duration)} – {formatTime(scene.end * sourceMeta.duration)}</small><strong>{scene.title}</strong><em>{sceneNames[scene.kind]}</em></span><MoreHorizontal size={16} /></button>; })}</div>
            {selectedScene ? <div className="scene-editor"><label><span>Visual treatment</span><select value={selectedScene.kind} onChange={(event) => updateScene({ kind: event.target.value as VisualKind })}>{Object.entries(sceneNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><label><span>Scene headline</span><input value={selectedScene.title} onChange={(event) => updateScene({ title: event.target.value })} /></label><button className="secondary-action" type="button" onClick={() => { const variation = planStoryboard({ transcript: selectedScene.detail, duration: Math.max(1, (selectedScene.end - selectedScene.start) * sourceMeta.duration), dopaminePacing: false }).scenes[0]; updateScene({ kind: variation.kind, eyebrow: variation.eyebrow, brand: variation.brand, brands: variation.brands, countries: variation.countries, platforms: variation.platforms, metric: variation.metric, origin: variation.origin, destination: variation.destination, ctaLabel: variation.ctaLabel }); }}><WandSparkles size={15} /> Re-direct this scene</button></div> : null}
          </div>
        </aside>

        <aside className={"inspector-panel style-panel " + (activePanel === "brand" ? "active-panel" : "")} aria-label="Style and export settings">
          <div className="panel-titlebar"><span><Palette size={15} /> Style</span><small>{motionStyle}</small></div>
          <div className="panel-content" id="panel-brand">
            <div className="section-heading"><div><span>Visual system</span><strong>One coherent motion language</strong></div><Sparkles size={17} /></div>
            <div className="control-section no-border"><div className="control-label"><span>Motion direction</span><small>Curated templates</small></div><div className="style-stack">{([ ["kinetic", "Kinetic dark", "Hard cuts · glow · energy"], ["clean", "Clean tech", "Crisp cards · controlled pace"], ["editorial", "Neo editorial", "Warm black · bold type"] ] as Array<[MotionStyle, string, string]>).map(([value, label, detail]) => <button type="button" key={value} className={motionStyle === value ? "active" : ""} onClick={() => setMotionStyle(value)} aria-pressed={motionStyle === value}><span className={`style-swatch ${value}`} /><span><strong>{label}</strong><small>{detail}</small></span>{motionStyle === value ? <Check size={15} /> : null}</button>)}</div></div>
            <div className="control-section"><div className="control-label"><span>Accent</span><small>{accent}</small></div><div className="color-row">{["#1035F4", "#caff3d", "#8b7dff", "#43d7ff", "#ff5c4d", "#f4f1e8"].map((color) => <button type="button" aria-label={`Set accent ${color}`} aria-pressed={accent === color} key={color} onClick={() => setAccent(color)} className={accent === color ? "active" : ""} style={{ background: color }}>{accent === color ? <Check size={14} color={color === "#1035F4" ? "#ffffff" : "#08090a"} /> : null}</button>)}</div></div>
            <div className="control-section"><div className="control-label"><span>Export size</span><small>MP4 · H.264</small></div><div className="resolution-row"><button type="button" className={resolution === 720 ? "active" : ""} onClick={() => setResolution(720)} aria-pressed={resolution === 720}><strong>720p</strong><small>Fast preview</small></button><button type="button" className={resolution === 1080 ? "active" : ""} onClick={() => setResolution(1080)} aria-pressed={resolution === 1080}><strong>1080p</strong><small>High quality</small></button></div></div>
            <div className="toggle-row"><div><Volume2 size={17} /><span><strong>Source audio</strong><small>Keep talking head voice</small></span></div><button className={`switch ${soundEnabled ? "on" : ""}`} role="switch" aria-checked={soundEnabled} aria-label="Keep source audio" type="button" onClick={() => setSoundEnabled((value) => !value)}><span /></button></div>
            <div className="toggle-row"><div><Zap size={17} /><span><strong>Dopamine pacing</strong><small>{dopaminePacing ? "Visual beat every 2–3 sec" : "Longer, calmer visual holds"}</small></span></div><button className={`switch ${dopaminePacing ? "on" : ""}`} role="switch" aria-checked={dopaminePacing} aria-label="Use fast dopamine pacing" type="button" onClick={() => { const next = !dopaminePacing; setDopaminePacing(next); if (transcript.trim() && !storyboardDirty) redirectScenes(next); }}><span /></button></div>
          </div>
          <div className="inspector-export">
            <div><span className={`export-status ${renderStatus}`} /> <span>{renderStatus === "rendering" ? `Rendering ${renderProgress}%` : renderStatus === "complete" ? "Export ready" : renderStatus === "error" ? "Export needs attention" : `9:16 · ${resolution}p MP4`}</span></div>
            <button className="export-button" type="button" onClick={exportMp4} disabled={processing || renderStatus === "checking" || renderStatus === "rendering"}>{renderStatus === "checking" || renderStatus === "rendering" ? <LoaderCircle className="spin" size={17} /> : <ArrowDownToLine size={17} />}Export MP4</button>
          </div>
        </aside>
      </div>

      <section className="timeline-panel">
        <div className="timeline-header"><div><strong>Visual beats</strong><span>{scenes.length} scenes · meaning-led</span></div><div className="timeline-tools"><button type="button" onClick={() => setTimelineZoom((value) => Math.max(1, Number((value - .25).toFixed(2))))} aria-label="Zoom timeline out"><span>−</span></button><input type="range" min="1" max="3" step=".25" value={timelineZoom} onChange={(event) => setTimelineZoom(Number(event.target.value))} aria-label="Timeline zoom" /><button type="button" onClick={() => setTimelineZoom((value) => Math.min(3, Number((value + .25).toFixed(2))))} aria-label="Zoom timeline in"><Plus size={13} /></button></div></div>
        <div className="timeline-ruler">{[0, .25, .5, .75, 1].map((point) => <span key={point} style={{ left: `${point * 100}%` }}>{formatTime(sourceMeta.duration * point)}</span>)}</div>
        <div className="timeline-tracks"><div className="track-label"><Sparkles size={14} /><span>Motion</span></div><div className="track-scroll"><div className="scene-track" style={{ width: `${timelineZoom * 100}%` }}><i className="timeline-playhead" style={{ left: `${currentProgress * 100}%` }} />{scenes.map((scene, index) => { const Icon = sceneIcons[scene.kind]; return <button type="button" key={scene.id} className={`${scene.id === selectedScene?.id ? "selected" : ""} ${scene.id === playingSceneId ? "playing" : ""}`} style={{ width: `${Math.max(5, (scene.end - scene.start) * 100)}%` }} onClick={() => selectScene(scene)}><Icon size={13} /><span>{index + 1}. {sceneNames[scene.kind]}</span></button>; })}</div></div><div className="track-label"><Captions size={14} /><span>Captions</span></div><div className="track-scroll"><div className="caption-track" style={{ width: `${timelineZoom * 100}%` }}><span>{transcript || "Transcript required"}</span></div></div></div>
      </section>

      {showImport ? (
        <div className="modal-backdrop">
          <div className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <button className="modal-close" type="button" onClick={() => setShowImport(false)} aria-label="Close upload" disabled={processing}><X size={18} /></button>
            <span className="modal-kicker"><Sparkles size={14} /> New scroll stopper</span>
            <h2 id="import-title">Compare the words. Direct the meaning.</h2>
            <p>Select one model for a fast run or several to benchmark the same English, German, or Russian clip.</p>
            {uploadError ? <div className="modal-error" role="alert"><AlertTriangle size={16} />{uploadError}</div> : null}
            <TranscriptionLanguagePicker value={selectedSpeechLanguage} disabled={processing} onChange={setSelectedSpeechLanguage} />
            <TranscriptionGlossaryInput value={transcriptionGlossary} disabled={processing} onChange={setTranscriptionGlossary} />
            <TranscriptionModelPicker selected={selectedTranscriptionModels} disabled={processing} onToggle={toggleTranscriptionModel} />
            <button className={`dropzone ${dropActive ? "active" : ""}`} type="button" onClick={() => fileInput.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDropActive(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDropActive(false)} onDrop={handleDrop} disabled={processing}>
              <span>{processing ? <LoaderCircle className="spin" size={26} /> : <Upload size={26} />}</span>
              <strong>{processing ? analysisStage : `Choose video · run ${selectedTranscriptionModels.length} model${selectedTranscriptionModels.length === 1 ? "" : "s"}`}</strong>
              <small>Up to 500 MB · first 90 seconds analyzed · browser-decodable MP4, MOV, WebM or MKV</small>
            </button>
            <input ref={fileInput} hidden type="file" accept="video/*,.mkv,.avi,.mov,.webm" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void handleFile(file); }} />
            <div className="privacy-note"><BadgeCheck size={14} />{usesGroqTranscription ? "Selected local models stay on this device. Cloud models receive Vercel-safe 30-second WAV chunks covering the first 90 seconds." : "All selected transcription models run on this device and are cached by your browser."}</div>
            <div className="modal-or"><span>or</span></div>
            <button className="demo-button" type="button" onClick={loadDemo} disabled={processing}><Play size={15} fill="currentColor" /> Load the AI-models demo</button>
            <div className="modal-features"><span><Check size={13} /> EN + DE + RU</span><span><Check size={13} /> Word timing</span><span><Check size={13} /> Side-by-side results</span></div>
          </div>
        </div>
      ) : null}

      {showComparison && transcriptionRuns.length ? (
        <div className="modal-backdrop comparison-backdrop">
          <div className="comparison-modal" role="dialog" aria-modal="true" aria-labelledby="comparison-title">
            <button className="modal-close" type="button" onClick={() => setShowComparison(false)} aria-label="Close transcript comparison"><X size={18} /></button>
            <span className="modal-kicker"><Layers3 size={14} /> Transcription benchmark</span>
            <h2 id="comparison-title">Compare every transcript.</h2>
            <p>Language hint used: <strong>{comparisonLanguageLabel}</strong>. Correct words directly inside any model result, then choose <strong>Save &amp; select</strong>. Your edited version becomes the active transcript.</p>
            <TranscriptionComparisonResults
              runs={transcriptionRuns}
              appliedModelId={appliedTranscriptionModel}
              onApply={(run) => {
                applyTranscription(run, sourceMeta.duration);
                setShowComparison(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {renderStatus !== "idle" ? <div className={`render-toast ${renderStatus}`} role={renderStatus === "error" ? "alert" : "status"}><span className="render-icon">{renderStatus === "complete" ? <Check size={18} /> : renderStatus === "error" ? <X size={18} /> : <LoaderCircle className="spin" size={18} />}</span><div><strong>{renderStatus === "complete" ? "Export complete" : renderStatus === "error" ? "Export needs attention" : renderStatus === "checking" ? "Checking MP4 support" : "Rendering MP4"}</strong><p>{renderMessage}</p>{renderStatus === "rendering" ? <div className="render-progress"><span style={{ width: `${renderProgress}%` }} /></div> : null}</div>{renderStatus === "rendering" ? <button className="render-cancel" type="button" onClick={cancelRender}>Cancel {renderProgress}%</button> : <button type="button" onClick={() => setRenderStatus("idle")} aria-label="Dismiss export message"><X size={15} /></button>}</div> : null}
    </main>
  );
}
