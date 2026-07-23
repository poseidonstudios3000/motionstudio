"use client";

import { Check, Clock3, Cloud, HardDrive, type LucideIcon } from "lucide-react";
import type { TimedWord } from "./motion-composition";
import { getTranscriptionModel, TRANSCRIPTION_MODELS, type TranscriptionModelId } from "./transcription";

export type TranscriptionRun = {
  modelId: TranscriptionModelId;
  status: "success" | "error";
  text: string;
  words: TimedWord[];
  elapsedMs: number;
  error?: string;
};

const formatElapsed = (milliseconds: number) => milliseconds < 1_000
  ? `${Math.max(1, Math.round(milliseconds))} ms`
  : `${(milliseconds / 1_000).toFixed(milliseconds >= 10_000 ? 1 : 2)} s`;

const ProviderIcon = ({ provider }: { provider: "local" | "groq" }) => {
  const Icon: LucideIcon = provider === "groq" ? Cloud : HardDrive;
  return <Icon size={15} />;
};

export const TranscriptionModelPicker = ({
  selected,
  disabled,
  onToggle,
}: {
  selected: readonly TranscriptionModelId[];
  disabled: boolean;
  onToggle: (modelId: TranscriptionModelId) => void;
}) => (
  <div className="transcription-picker" aria-label="Choose transcription models">
    <div className="model-picker-heading"><span>Compare transcription models</span><small>{selected.length} selected</small></div>
    <div className="model-picker-grid">
      {TRANSCRIPTION_MODELS.map((model) => {
        const active = selected.includes(model.id);
        return (
          <button
            className={active ? "active" : ""}
            type="button"
            role="checkbox"
            aria-checked={active}
            disabled={disabled}
            key={model.id}
            onClick={() => onToggle(model.id)}
          >
            <span className="model-provider"><ProviderIcon provider={model.provider} />{model.provider === "groq" ? "Groq cloud" : "On device"}</span>
            <strong>{model.shortLabel}</strong>
            <small>{model.detail}</small>
            <span className="model-check">{active ? <Check size={13} /> : null}</span>
          </button>
        );
      })}
    </div>
  </div>
);

export const TranscriptionComparisonResults = ({
  runs,
  appliedModelId,
  onApply,
}: {
  runs: readonly TranscriptionRun[];
  appliedModelId: TranscriptionModelId | null;
  onApply: (run: TranscriptionRun) => void;
}) => {
  if (!runs.length) return null;
  return (
    <section className="comparison-results" aria-label="Transcription comparison results">
      <div className="comparison-heading"><span>Model comparison</span><small>{runs.filter((run) => run.status === "success").length}/{runs.length} completed</small></div>
      <div className="comparison-stack">
        {runs.map((run) => {
          const model = getTranscriptionModel(run.modelId);
          const applied = appliedModelId === run.modelId;
          return (
            <article className={`comparison-card ${run.status} ${applied ? "applied" : ""}`} key={run.modelId}>
              <header><span><ProviderIcon provider={model.provider} /><strong>{model.shortLabel}</strong></span><em><Clock3 size={11} />{formatElapsed(run.elapsedMs)}</em></header>
              {run.status === "success" ? (
                <>
                  <p>{run.text}</p>
                  <footer><span>{run.text.split(/\s+/).filter(Boolean).length} words · {run.words.length ? "word timed" : "segment timed"}</span><button type="button" onClick={() => onApply(run)} disabled={applied}>{applied ? <><Check size={12} /> Applied</> : "Use transcript"}</button></footer>
                </>
              ) : <p className="comparison-error">{run.error ?? "This model could not transcribe the clip."}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
};
