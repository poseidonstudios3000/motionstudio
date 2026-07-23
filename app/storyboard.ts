import type { BrandKind, CountryKind, SceneSpec, SemanticEntity, TimedWord, VisualKind } from "./motion-composition";

export type DetectedLanguage = "EN" | "DE" | "RU";

const germanSignals = /\b(aber|auch|auf|das|dein|deine|der|die|drei|ein|eine|für|gegenüber|hat|ist|jetzt|keinen|kostet|mit|nach|neu|nicht|oder|platz|sachen|schreib|steht|und|unsere|von|was|welche|wichtigsten|wir|zeigen|zurückgeholt)\b/gi;
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

const getCountries = (text: string) => countryMatchers
  .flatMap(([country, pattern]) => { const index = text.search(pattern); return index < 0 ? [] : [{ country, index }]; })
  .sort((left, right) => left.index - right.index)
  .map(({ country }) => country);
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

const getBrands = (text: string) => brandMatchers
  .flatMap(([brand, pattern]) => { const index = text.search(pattern); return index < 0 ? [] : [{ brand, index }]; })
  .sort((left, right) => left.index - right.index)
  .map(({ brand }) => brand);

const getPlatforms = (text: string): SceneSpec["platforms"] => {
  const values: NonNullable<SceneSpec["platforms"]> = [];
  if (/\b(instagram|reels?)\b/i.test(text)) values.push("instagram");
  if (/\b(tiktok)\b/i.test(text)) values.push("tiktok");
  if (/\b(youtube|shorts?)\b/i.test(text)) values.push("youtube");
  return values;
};

const getMetrics = (text: string) => {
  const explicit = Array.from(text.matchAll(/(?:[$€£]\s?\d+(?:[.,]\d+)?(?:\s?(?:million(?:en)?|mio\.?|billion|mrd\.?|k))?|\d+(?:[.,]\d+)?\s?(?:%|percent|prozent|punkt(?:en|e)?|points?|million(?:en)?|mio\.?|billion|mrd\.?|k))/gi), (match) => match[0].trim());
  if (explicit.length) return Array.from(new Set(explicit));
  const contextual = text.match(/\b(?:growth|revenue|sales|users|views|umsatz|wachstum|kunden|aufrufe)\D{0,18}(\d+(?:[.,]\d+)?)/i);
  return contextual?.[1] ? [contextual[1]] : [];
};

const getMetric = (text: string) => getMetrics(text)[0];

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
  words: TimedWord[];
};

const limitBeats = (beats: Beat[], dopaminePacing: boolean) => {
  const limit = dopaminePacing ? 36 : 24;
  if (beats.length <= limit) return beats;
  const selected = beats.slice(0, limit - 1);
  const tail = beats.slice(limit - 1);
  selected.push({ text: tail.map((beat) => beat.text).join(" "), start: tail[0].start, end: tail[tail.length - 1].end, words: tail.flatMap((beat) => beat.words) });
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
  if (!words.length) return [{ text: "Your key message", start: 0, end: duration, words: [] }];

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
        const chunkStart = wordCursor;
        const start = wordCursor / totalWords * duration;
        wordCursor += chunk.length;
        beats.push({ text: chunk.join(" "), start, end: wordCursor / totalWords * duration, words: words.slice(chunkStart, wordCursor) });
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
      words: [...current],
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
  if (/\b(?:keinen cent mehr|ohne preiserh[oö]hung|gleicher preis|kostenlos|preis|preise|price|pricing|cost|free)\b/i.test(text)) return "price";
  if (/\b(?:ranking|rangliste|platz\s*1|spitzenplatz|krone|crown|leaderboard|f[uü]hrung|lead)\b/i.test(text) || (getMetrics(text).length > 1 && brands.length > 0)) return "ranking";
  if (/\b(?:drei sachen|drei punkte|three things|three points|erstens|zweitens|drittens)\b/i.test(text)) return "list";
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
    ranking: ["Leadership signal", "Ranking im Fokus"],
    price: ["Value signal", "Preis-Signal"],
    list: ["Three-part breakdown", "Drei Punkte"],
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
    ranking: "Рейтинг",
    price: "Цена",
    list: "Три пункта",
    race: "Гонка визуализирована",
    keyword: "Ключевая идея",
  };
  if (language === "RU") return russianLabels[kind];
  return labels[kind][language === "DE" ? 1 : 0];
};

const normaliseEvidenceToken = (value: string) => value.toLocaleLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "");

const brandAliases: Record<BrandKind, string[]> = {
  openai: ["openai", "chatgpt", "gpt"],
  anthropic: ["anthropic", "claude", "opus"],
  gemini: ["gemini", "google ai"],
  glm: ["glm"],
  apple: ["apple", "iphone", "ipad", "macbook", "ios"],
  google: ["google"],
  meta: ["meta", "facebook"],
  microsoft: ["microsoft", "windows", "copilot"],
  amazon: ["amazon", "aws"],
  tesla: ["tesla"],
  nvidia: ["nvidia", "geforce"],
};

const countryAliases: Record<CountryKind, string[]> = {
  us: ["us", "usa", "united states", "vereinigte staaten", "america"],
  china: ["china", "chinese", "chinesisch"],
  germany: ["germany", "german", "deutschland", "deutsch"],
  russia: ["russia", "russian", "russland", "russisch"],
  india: ["india", "indian", "indien", "indisch"],
  eu: ["eu", "european union", "europaische union"],
  other: ["another country", "other country", "anderes land", "weiteres land"],
};

const locateEvidence = (words: TimedWord[], aliases: string[]) => {
  const tokens = words.map((word) => normaliseEvidenceToken(word.text));
  for (const alias of aliases) {
    const parts = alias.split(/\s+/).map(normaliseEvidenceToken).filter(Boolean);
    for (let index = 0; index <= tokens.length - parts.length; index += 1) {
      const matches = parts.every((part, offset) => tokens[index + offset] === part || (parts.length === 1 && part.length >= 3 && tokens[index + offset].startsWith(part)));
      if (matches) return words.slice(index, index + parts.length);
    }
  }
  return [];
};

const makeEntity = (id: string, type: SemanticEntity["type"], label: string, source: TimedWord[], assetId?: string): SemanticEntity | undefined => {
  if (!source.length) return undefined;
  return { id, type, label, evidence: source.map((word) => word.text).join(" "), startSeconds: source[0].start, endSeconds: source[source.length - 1].end, assetId };
};

const extractEntities = (beat: Beat, brands: BrandKind[], countries: CountryKind[], platforms: NonNullable<SceneSpec["platforms"]>, metrics: string[]) => {
  const entities: SemanticEntity[] = [];
  brands.forEach((brand) => {
    const entity = makeEntity(`brand-${brand}`, "brand", brand, locateEvidence(beat.words, brandAliases[brand]), `brand:${brand}`);
    if (entity) entities.push(entity);
  });
  countries.forEach((country) => {
    const entity = makeEntity(`country-${country}`, "country", country, locateEvidence(beat.words, countryAliases[country]), country === "other" ? "symbol:neutral-country" : `flag:${country}`);
    if (entity) entities.push(entity);
  });
  platforms.forEach((platform) => {
    const entity = makeEntity(`platform-${platform}`, "platform", platform, locateEvidence(beat.words, [platform]), `platform:${platform}`);
    if (entity) entities.push(entity);
  });
  metrics.forEach((metric, index) => {
    const entity = makeEntity(`metric-${index}`, "metric", metric, locateEvidence(beat.words, [metric]));
    if (entity) entities.push(entity);
  });
  return entities;
};

const intentFor = (kind: VisualKind) => ({
  hook: "interrupt attention", brand: "identify the named company or product", code: "explain a build or software action", mechanics: "show system behavior", context: "show connected inputs", compare: "compare named alternatives", cta: "prompt the requested action", travel: "show movement between spoken places", social: "identify the spoken platform", stat: "make the spoken number legible", ranking: "show the spoken leadership or score relationship", price: "show the spoken cost relationship", list: "structure the spoken list", race: "visualize the spoken competition", keyword: "reinforce the central phrase",
} satisfies Record<VisualKind, string>)[kind];

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
  const competitionContext = hasCompetitionMeaning(transcript);

  const scenes = beats.map((beat, index) => {
    const brands = getBrands(beat.text);
    const spokenCountries = getCountries(beat.text);
    const platforms = getPlatforms(beat.text);
    const kind = classify(beat.text, index, brands, platforms, spokenCountries, competitionContext);
    const countries = spokenCountries;
    const metrics = getMetrics(beat.text);
    const metric = metrics[0];
    const route = getRoute(beat.text);
    const sourceStart = Math.max(0, Math.min(safeDuration, beat.start));
    const nextStart = beats[index + 1]?.start ?? safeDuration;
    const start = sourceStart / safeDuration;
    const end = index === beats.length - 1 ? 1 : Math.max(start + 0.001, Math.min(1, nextStart / safeDuration));
    const entities = extractEntities(beat, brands, countries, platforms ?? [], metrics);
    const cues = entities.map((entity) => ({ entityId: entity.id, startSeconds: entity.startSeconds, endSeconds: entity.endSeconds, emphasis: "enter" as const }));
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
      metrics,
      ...route,
      ctaLabel: language === "DE" ? "Schreib einen Kommentar" : language === "RU" ? "Оставь комментарий" : "Leave a comment",
      startSeconds: sourceStart,
      endSeconds: index === beats.length - 1 ? safeDuration : nextStart,
      evidence: beat.text,
      intent: intentFor(kind),
      metaphor: kind === "race" ? "A robot race represents the explicitly spoken competition; it is not a factual ranking." : undefined,
      entities,
      cues,
      uncertainties: countries.includes("other") ? ["The speaker did not name the other country; keep this competitor neutral."] : [],
      rationale: kind === "keyword" ? "Typography reinforces the phrase without adding an unsupported literal claim." : "The visual directly represents an entity, relationship, or structure stated in this timed transcript span.",
    } satisfies SceneSpec;
  });

  return { language, scenes };
};
