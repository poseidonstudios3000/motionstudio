import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const normalizeTranscript = (text) =>
  text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

export const levenshteinDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const errorRate = (referenceUnits, candidateUnits) =>
  referenceUnits.length ? levenshteinDistance(referenceUnits, candidateUnits) / referenceUnits.length : candidateUnits.length ? 1 : 0;

export const scoreTranscriptionRun = (run) => {
  const reference = normalizeTranscript(run.reference);
  const candidate = normalizeTranscript(run.candidate);
  const referenceWords = reference ? reference.split(" ") : [];
  const candidateWords = candidate ? candidate.split(" ") : [];
  const referenceCharacters = [...reference.replaceAll(" ", "")];
  const candidateCharacters = [...candidate.replaceAll(" ", "")];
  const protectedEntities = Array.isArray(run.protectedEntities) ? run.protectedEntities : [];
  const entityHits = protectedEntities.filter((entity) => candidate.includes(normalizeTranscript(entity))).length;
  return {
    fixtureId: run.fixtureId,
    language: run.language,
    modelId: run.modelId,
    wer: errorRate(referenceWords, candidateWords),
    cer: errorRate(referenceCharacters, candidateCharacters),
    entityAccuracy: protectedEntities.length ? entityHits / protectedEntities.length : null,
    processingMs: run.processingMs ?? null,
    realTimeFactor: run.processingMs && run.audioMs ? run.processingMs / run.audioMs : null,
  };
};

const isBenchmarkFile = (value) =>
  value && typeof value === "object" && Array.isArray(value.runs) && value.runs.every((run) =>
    run && typeof run.fixtureId === "string" && typeof run.language === "string" && typeof run.modelId === "string" &&
    typeof run.reference === "string" && typeof run.candidate === "string");

export const scoreBenchmark = (value) => {
  if (!isBenchmarkFile(value)) throw new Error("Benchmark JSON must contain valid runs with fixtureId, language, modelId, reference, and candidate.");
  return value.runs.map(scoreTranscriptionRun);
};

const main = async () => {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error("Usage: npm run benchmark:transcription -- <results.json>");
  const parsed = JSON.parse(await readFile(inputPath, "utf8"));
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), scores: scoreBenchmark(parsed) }, null, 2));
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
