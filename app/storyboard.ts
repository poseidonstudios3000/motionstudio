import type { BrandKind, CountryKind, SceneSpec, TimedWord, VisualKind } from "./motion-composition";

export type DetectedLanguage = "EN" | "DE" | "RU";

const germanSignals = /\b(aber|auch|das|dein|deine|der|die|ein|eine|für|ist|mit|nach|nicht|oder|schreib|und|unsere|von|was|welche|wir|zeigen)\b/gi;
const englishSignals = /\b(and|are|below|comment|for|from|how|is|our|the|this|to|what|which|with|you|your)\b/gi;
const russianSignals = /\b(а|без|будет|вы|гонк|другая|за|и|или|искусственн|как|китай|кто|не|побед|росси|сша|страна|что|это)\p{L}*/giu;

export const detectLanguage = (text: string): DetectedLanguage => {
  const german = text.match(germanSignals)?.length ?? 0;
  const english = text.match(englishSignals)?.length ?? 0;
  const russian = text.match(russianSignals)?.length ?? 0;
  if (russian > 0 || (text.match(/[\u0400-\u04ff]/g)?.length ?? 0) >= 4) return "RU";
  return german > english ? "DE" : "EN";
};

const countryMatchers: Array<[CountryKind, RegExp]> = [
  ["us", /(?:\b(?:u\.?s\.?a?|united states|america|vereinigte staaten)\b|сша|америк\p{L}*)/iu],
  ["china", /(?:\b(?:china|chinese|chinesisch\p{L}*)\b|китай\p{L}*)/iu],
  ["germany", /(?:\b(?:germany|german|deutschland|deutsch\p{L}*)\b|германи\p{L}*)/iu],
  ["russia", /(?:\b(?:russia|russian|russland|russisch\p{L}*)\b|росси\p{L}*|русск\p{L}*)/iu],
  ["india", /(?:\b(?:india|indian|indien|indisch\p{L}*)\b|инди\p{L}*)/iu],
  ["eu", /(?:\b(?:european union|europäische union|eu)\b|евросоюз|европейск\p{L}* союз)/iu],
  ["other", /(?:\b(?:another country|other countr\p{L}*|anderes land|weitere\p{L}* land)\b|другая страна|друг\p{L}* стран\p{L}*)/iu],
];

const getCountries = (text: string) => countryMatchers.filter(([, pattern]) => pattern.test(text)).map(([country]) => country);
const hasCompetitionMeaning = (text: string) =>
  /\b(?:ai race|race|competition|compete|competitor|win|winner|rennen|wettlauf|wettbewerb|gewinnen|sieger)\b/iu.test(text) ||
  /(?:гонк\p{L}*|соревнован\p{L}*|конкурен\p{L}*|побед\p{L}*)/iu.test(text);

const brandMatchers: Array<[BrandKind, RegExp]> = [
  ["openai", /\b(chatgpt|openai|gpt[-\s]?\d*)\b/i],
  ["anthropic", /\b(claude|anthropic)\b/i],
  ["gemini", /\b(gemini|google ai)\b/i],
  ["glm", /\bglm(?:\s?\d+(?:\.\d+)?)?\b/i],
  ["apple", /\b(apple|iphone|ipad|macbook|ios)\b/i],
  ["google", /\bgoogle\b/i],
  ["meta", /\b(meta|facebook)\b/i],
  ["microsoft", /\b(microsoft|windows|copilot)\b/i],
  ["amazon", /\b(amazon|aws)\b/i],
  ["tesla", /\btesla\b/i],
  ["nvidia", /\b(nvidia|geforce)\b/i],
];

const getBrands = (text: string) => brandMatchers.filter(([, pattern]) => pattern.test(text)).map(([brand]) => brand);

const getPlatforms = (text: string): SceneSpec["platforms"] => {
  const values: NonNullable<SceneSpec["platforms"]> = [];
  if (/\b(instagram|reels?)\b/i.test(text)) values.push("instagram");
  if (/\b(tiktok)\b/i.test(text)) values.push("tiktok");
  if (/\b(youtube|shorts?)\b/i.test(text)) values.push("youtube");
  return values;
};

const getMetric = (text: string) => {
  const explicit = text.match(/(?:[$€£]\s?\d+(?:[.,]\d+)?(?:\s?(?:million(?:en)?|mio\.?|billion|mrd\.?|k))?|\d+(?:[.,]\d+)?\s?(?:%|percent|prozent|million(?:en)?|mio\.?|billion|mrd\.?|k))/i);
  if (explicit) return explicit[0].trim();
  const contextual = text.match(/\b(?:growth|revenue|sales|users|views|umsatz|wachstum|kunden|aufrufe)\D{0,18}(\d+(?:[.,]\d+)?)/i);
  return contextual?.[1];
};

const getRoute = (text: string) => {
  const match = text.match(/\b(?:from|von)\s+([\p{L}\d .'-]{2,28}?)\s+(?:to|nach)\s+([\p{L}\d .'-]{2,28}?)(?:[,.!?]|\s+(?:and|und|in|on|am|für|for)\b|$)/iu);
  return match ? { origin: match[1].trim(), destination: match[2].trim() } : {};
};

const titleFromText = (text: string, fallback: string) => {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[,.:;!?\s]+|[,.:;!?\s]+$/g, "")
    .trim();
  if (!cleaned) return fallback;
  const words = cleaned.split(" ");
  return words.slice(0, 7).join(" ") + (words.length > 7 ? "…" : "");
};

type Beat = {
  text: string;
  start: number;
  end: number;
};

const limitBeats = (beats: Beat[], dopaminePacing: boolean) => {
  const limit = dopaminePacing ? 36 : 24;
  if (beats.length <= limit) return beats;
  const selected = beats.slice(0, limit - 1);
  const tail = beats.slice(limit - 1);
  selected.push({ text: tail.map((beat) => beat.text).join(" "), start: tail[0].start, end: tail[tail.length - 1].end });
  return selected;
};

const untimedWords = (transcript: string, duration: number): TimedWord[] => {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const step = Math.max(0.04, duration / words.length);
  return words.map((text, index) => ({ text, start: index * step, end: Math.min(duration, (index + 1) * step) }));
};

const makeBeats = (transcript: string, timedWords: TimedWord[], duration: number, dopaminePacing: boolean): Beat[] => {
  const words = timedWords.length ? timedWords : untimedWords(transcript, duration);
  if (!words.length) return [{ text: "Your key message", start: 0, end: duration }];

  const targetSeconds = dopaminePacing ? 2.7 : 4.4;
  const maxWords = dopaminePacing ? 12 : 18;
  const beats: Beat[] = [];

  if (!timedWords.length) {
    const sentences = transcript.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [transcript];
    const totalWords = Math.max(1, words.length);
    let wordCursor = 0;
    sentences.forEach((sentence) => {
      const sentenceWords = sentence.split(/\s+/).filter(Boolean);
      for (let offset = 0; offset < sentenceWords.length; offset += maxWords) {
        const chunk = sentenceWords.slice(offset, offset + maxWords);
        const start = wordCursor / totalWords * duration;
        wordCursor += chunk.length;
        beats.push({ text: chunk.join(" "), start, end: wordCursor / totalWords * duration });
      }
    });
    return limitBeats(beats, dopaminePacing);
  }

  let current: TimedWord[] = [];

  const flush = () => {
    if (!current.length) return;
    beats.push({
      text: current.map((word) => word.text).join(" ").replace(/\s+([,.!?])/g, "$1").trim(),
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
  };

  words.forEach((word) => {
    current.push(word);
    const elapsed = current[current.length - 1].end - current[0].start;
    const sentenceEnd = /[.!?][\"'”’)]?$/.test(word.text);
    if (sentenceEnd || (elapsed >= targetSeconds && current.length >= 7) || current.length >= maxWords) flush();
  });
  flush();

  return limitBeats(beats, dopaminePacing);
};

const classify = (text: string, index: number, brands: BrandKind[], platforms: SceneSpec["platforms"], countries: CountryKind[], competitionContext: boolean): VisualKind => {
  if (/\b(comment|comments|below|tell me|let me know|kommentar|kommentare|schreib|sag mir)\b/i.test(text)) return "cta";
  if (platforms?.length) return "social";
  if (/\b(travel|trip|flight|journey|route|reise|reisen|flug|roadtrip)\b/i.test(text) || /\b(?:from|von)\s+.+\s+(?:to|nach)\s+/i.test(text)) return "travel";
  if (getMetric(text)) return "stat";
  if (hasCompetitionMeaning(text) || (competitionContext && countries.length > 0)) return "race";
  if (/\b(game|gaming|gameplay|mechanic|physics|controller|spiel|spielen|mechanik|physik)\b/i.test(text)) return "mechanics";
  if (/\b(code|coding|developer|build|ship|deploy|app|software|programm|entwickl|bauen)\b/i.test(text)) return "code";
  if (/\b(context|repo|codebase|files|assets|prompt|kontext|dateien|daten)\b/i.test(text)) return "context";
  if (/\b(compare|versus|\bvs\.?\b|which|choose|better|vergleich|welche|besser)\b/i.test(text) || brands.length > 1) return "compare";
  if (brands.length) return "brand";
  if (index === 0 || /\b(stop|secret|mistake|warning|never|hör auf|fehler|achtung|niemals)\b/i.test(text)) return "hook";
  return "keyword";
};

const eyebrowFor = (kind: VisualKind, language: DetectedLanguage) => {
  const labels: Record<VisualKind, [string, string]> = {
    hook: ["Pattern interrupt", "Scroll-Stopper"],
    brand: ["Company signal", "Marken-Signal"],
    code: ["Build in motion", "Build in Bewegung"],
    mechanics: ["Gameplay visualized", "Gameplay visualisiert"],
    context: ["Connected context", "Vernetzter Kontext"],
    compare: ["Rapid comparison", "Schneller Vergleich"],
    cta: ["Your turn", "Du bist dran"],
    travel: ["Route in motion", "Route in Bewegung"],
    social: ["Platform moment", "Plattform-Moment"],
    stat: ["Make the number land", "Die Zahl im Fokus"],
    race: ["Competition visualized", "Wettbewerb visualisiert"],
    keyword: ["Key idea", "Kernidee"],
  };
  const russianLabels: Record<VisualKind, string> = {
    hook: "Захват внимания",
    brand: "Фокус на бренде",
    code: "Код в движении",
    mechanics: "Механика в движении",
    context: "Связанный контекст",
    compare: "Быстрое сравнение",
    cta: "Ваш ход",
    travel: "Маршрут в движении",
    social: "Социальная платформа",
    stat: "Главная цифра",
    race: "Гонка визуализирована",
    keyword: "Ключевая идея",
  };
  if (language === "RU") return russianLabels[kind];
  return labels[kind][language === "DE" ? 1 : 0];
};

export const planStoryboard = ({
  transcript,
  words = [],
  duration,
  dopaminePacing = true,
}: {
  transcript: string;
  words?: TimedWord[];
  duration: number;
  dopaminePacing?: boolean;
}): { language: DetectedLanguage; scenes: SceneSpec[] } => {
  const language = detectLanguage(transcript);
  const safeDuration = Math.max(1, duration);
  const beats = makeBeats(transcript, words, safeDuration, dopaminePacing);
  const transcriptCountries = getCountries(transcript);
  const competitionContext = hasCompetitionMeaning(transcript);

  const scenes = beats.map((beat, index) => {
    const brands = getBrands(beat.text);
    const spokenCountries = getCountries(beat.text);
    const platforms = getPlatforms(beat.text);
    const kind = classify(beat.text, index, brands, platforms, spokenCountries, competitionContext);
    const countries = kind === "race" && spokenCountries.length === 0 ? transcriptCountries : spokenCountries;
    const metric = getMetric(beat.text);
    const route = getRoute(beat.text);
    const sourceStart = Math.max(0, Math.min(safeDuration, beat.start));
    const nextStart = beats[index + 1]?.start ?? safeDuration;
    const start = index === 0 ? 0 : sourceStart / safeDuration;
    const end = index === beats.length - 1 ? 1 : Math.max(start + 0.001, Math.min(1, nextStart / safeDuration));
    return {
      id: `beat-${index}-${kind}`,
      start,
      end,
      kind,
      eyebrow: eyebrowFor(kind, language),
      title: titleFromText(beat.text, language === "DE" ? "Deine Kernidee" : language === "RU" ? "Ключевая идея" : "Your key idea"),
      detail: beat.text,
      brand: brands[0],
      brands,
      countries,
      platforms,
      metric,
      ...route,
      ctaLabel: language === "DE" ? "Schreib einen Kommentar" : language === "RU" ? "Оставь комментарий" : "Leave a comment",
    } satisfies SceneSpec;
  });

  return { language, scenes };
};
