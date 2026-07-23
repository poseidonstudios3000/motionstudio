"use client";

import { useState } from "react";
import { Check, Clock3, Cloud, HardDrive, type LucideIcon } from "lucide-react";
import type { TimedWord } from "./motion-composition";
import {
  getTranscriptionModel,
  MAX_TRANSCRIPTION_GLOSSARY_LENGTH,
  SPEECH_LANGUAGE_OPTIONS,
  TRANSCRIPTION_MODELS,
  type SpeechLanguage,
  type TranscriptionModelId,
} from "./transcription";

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

export const TranscriptionLanguagePicker = ({
  value,
  disabled,
  onChange,
}: {
  value: SpeechLanguage;
  disabled: boolean;
  onChange: (language: SpeechLanguage) => void;
}) => (
  <div className="language-picker" aria-label="Speech language">
    <div className="model-picker-heading"><span>Speech language</span><small>{value === "auto" ? "Detect automatically" : "Forced for all models"}</small></div>
    <div className="language-picker-row">
      {SPEECH_LANGUAGE_OPTIONS.map((language) => (
        <button
          className={language.id === value ? "active" : ""}
          type="button"
          aria-pressed={language.id === value}
          title={language.label}
          disabled={disabled}
          key={language.id}
          onClick={() => onChange(language.id)}
        >
          {language.shortLabel}
        </button>
      ))}
    </div>
    {value === "german" ? <p className="language-hint">Deutsch is sent explicitly as <strong>de</strong> to Groq and as <strong>German</strong> to local Whisper.</p> : null}
  </div>
);

export const TranscriptionGlossaryInput = ({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="transcription-glossary">
    <span>Names &amp; terms <small>Improves cloud spelling</small></span>
    <input
      type="text"
      value={value}
      disabled={disabled}
      maxLength={MAX_TRANSCRIPTION_GLOSSARY_LENGTH}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Anthropic, OpenAI, product names, people..."
      aria-label="Transcription names and terms"
    />
    <small>Add unusual brand, product, and person names before transcribing. You can still correct the selected transcript afterward.</small>
  </label>
);

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
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!runs.length) return null;
  return (
    <section className="comparison-results" aria-label="Transcription comparison results">
      <div className="comparison-heading"><span>Model comparison</span><small>{runs.filter((run) => run.status === "success").length}/{runs.length} completed</small></div>
      <div className="comparison-stack">
        {runs.map((run) => {
          const model = getTranscriptionModel(run.modelId);
          const applied = appliedModelId === run.modelId;
          const draft = drafts[run.modelId] ?? run.text;
          const edited = draft !== run.text;
          return (
            <article className={`comparison-card ${run.status} ${applied ? "applied" : ""}`} key={run.modelId}>
              <header><span><ProviderIcon provider={model.provider} /><strong>{model.shortLabel}</strong></span><em><Clock3 size={11} />{formatElapsed(run.elapsedMs)}</em></header>
              {run.status === "success" ? (
                <>
                  <label className="comparison-edit-label" htmlFor={`comparison-draft-${run.modelId}`}>Edit this model&apos;s transcript</label>
                  <textarea
                    id={`comparison-draft-${run.modelId}`}
                    className="comparison-draft"
                    value={draft}
                    onChange={(event) => setDrafts((current) => ({ ...current, [run.modelId]: event.target.value }))}
                    aria-label={`Edit ${model.shortLabel} transcript`}
                    spellCheck
                  />
                  <footer>
                    <span>{draft.trim().split(/\s+/).filter(Boolean).length} words · {edited ? "edited · timing estimated" : run.words.length ? "word timed" : "segment timed"}</span>
                    <div className="comparison-actions">
                      {edited ? <button className="comparison-reset" type="button" onClick={() => setDrafts((current) => ({ ...current, [run.modelId]: run.text }))}>Reset</button> : null}
                      <button
                        type="button"
                        onClick={() => onApply({ ...run, text: draft.trim(), words: edited ? [] : run.words })}
                        disabled={!draft.trim() || (applied && !edited)}
                      >
                        {applied && !edited ? <><Check size={12} /> Selected</> : "Save & select"}
                      </button>
                    </div>
                  </footer>
                </>
              ) : <p className="comparison-error">{run.error ?? "This model could not transcribe the clip."}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
};
