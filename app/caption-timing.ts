import type { TimedWord } from "./motion-composition";

export type CaptionCue = {
  words: TimedWord[];
  start: number;
  end: number;
};

const tokenise = (transcript: string) => transcript.trim().split(/\s+/).filter(Boolean);
const normaliseToken = (token: string) => token.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const endsSentence = (token: string) => /[.!?…]["'”’)]?$/.test(token);

export const estimateTimedWords = (transcript: string, duration: number, startOffset = 0): TimedWord[] => {
  const tokens = tokenise(transcript);
  if (!tokens.length) return [];
  const start = Math.max(0, Math.min(duration, startOffset));
  const available = Math.max(0.08, duration - start);
  const step = available / tokens.length;
  return tokens.map((text, index) => ({
    text,
    start: start + index * step,
    end: Math.min(duration, start + (index + 1) * step),
  }));
};

export const shiftTimedWords = (words: readonly TimedWord[], offset: number): TimedWord[] => words.map((word) => ({
  ...word,
  start: Math.max(0, word.start + offset),
  end: Math.max(0, word.end + offset),
}));

export const alignTranscriptToWordTimings = (transcript: string, sourceWords: readonly TimedWord[]): TimedWord[] => {
  const tokens = tokenise(transcript);
  if (!tokens.length || !sourceWords.length) return [];
  const sourceTokens = sourceWords.map((word) => normaliseToken(word.text));
  const targetTokens = tokens.map(normaliseToken);
  const table = Array.from({ length: targetTokens.length + 1 }, () => new Uint16Array(sourceTokens.length + 1));

  for (let target = 1; target <= targetTokens.length; target += 1) {
    for (let source = 1; source <= sourceTokens.length; source += 1) {
      table[target][source] = targetTokens[target - 1] && targetTokens[target - 1] === sourceTokens[source - 1]
        ? table[target - 1][source - 1] + 1
        : Math.max(table[target - 1][source], table[target][source - 1]);
    }
  }

  const matches = new Map<number, number>();
  let target = targetTokens.length;
  let source = sourceTokens.length;
  while (target > 0 && source > 0) {
    if (targetTokens[target - 1] && targetTokens[target - 1] === sourceTokens[source - 1]) {
      matches.set(target - 1, source - 1);
      target -= 1;
      source -= 1;
    } else if (table[target - 1][source] >= table[target][source - 1]) {
      target -= 1;
    } else {
      source -= 1;
    }
  }

  const result: Array<TimedWord | undefined> = tokens.map((text, index) => {
    const sourceIndex = matches.get(index);
    return sourceIndex === undefined ? undefined : { ...sourceWords[sourceIndex], text };
  });

  let index = 0;
  while (index < result.length) {
    if (result[index]) {
      index += 1;
      continue;
    }
    const runStart = index;
    while (index < result.length && !result[index]) index += 1;
    const runEnd = index;
    const previous = result[runStart - 1];
    const next = result[runEnd];
    const windowStart = previous?.end ?? sourceWords[0].start;
    const windowEnd = Math.max(windowStart + (runEnd - runStart) * 0.08, next?.start ?? sourceWords[sourceWords.length - 1].end);
    const step = (windowEnd - windowStart) / (runEnd - runStart);
    for (let runIndex = runStart; runIndex < runEnd; runIndex += 1) {
      result[runIndex] = {
        text: tokens[runIndex],
        start: windowStart + (runIndex - runStart) * step,
        end: windowStart + (runIndex - runStart + 1) * step,
      };
    }
  }

  return result.filter((word): word is TimedWord => Boolean(word));
};

export const createCaptionCues = (
  words: readonly TimedWord[],
  { maxWords = 6, maxCharacters = 34, pauseBoundary = 0.65 }: { maxWords?: number; maxCharacters?: number; pauseBoundary?: number } = {},
): CaptionCue[] => {
  const cues: CaptionCue[] = [];
  let current: TimedWord[] = [];
  const flush = () => {
    if (!current.length) return;
    cues.push({ words: current, start: current[0].start, end: current[current.length - 1].end });
    current = [];
  };

  words.forEach((word, index) => {
    const prospectiveLength = [...current, word].map((item) => item.text).join(" ").length;
    if (current.length && prospectiveLength > maxCharacters) flush();
    current.push(word);
    const next = words[index + 1];
    const longPause = next ? next.start - word.end >= pauseBoundary : false;
    if (endsSentence(word.text) || longPause || current.length >= maxWords) flush();
  });
  flush();

  return cues.map((cue, index) => {
    const nextStart = cues[index + 1]?.start ?? Number.POSITIVE_INFINITY;
    return { ...cue, end: Math.max(cue.end + 0.08, Math.min(nextStart, cue.end + 0.3)) };
  });
};
