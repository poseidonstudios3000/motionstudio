"use client";

import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import {
  Braces,
  Code2,
  FileCode2,
  FolderOpen,
  Gamepad2,
  GitBranch,
  MapPin,
  MessageCircle,
  MousePointer2,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { BsOpenai } from "react-icons/bs";
import {
  SiAnthropic,
  SiApple,
  SiGoogle,
  SiGooglegemini,
  SiInstagram,
  SiMeta,
  SiNvidia,
  SiTesla,
  SiTiktok,
  SiYoutube,
} from "react-icons/si";

export type CaptionPreset = "punch" | "clean" | "editorial";
export type MotionStyle = "kinetic" | "clean" | "editorial";
export type BrandKind = "openai" | "anthropic" | "gemini" | "glm" | "apple" | "google" | "meta" | "microsoft" | "amazon" | "tesla" | "nvidia";
export type TimedWord = { text: string; start: number; end: number };
export type VisualKind =
  | "hook"
  | "brand"
  | "code"
  | "mechanics"
  | "context"
  | "compare"
  | "cta"
  | "travel"
  | "social"
  | "stat"
  | "keyword";

export type SceneSpec = {
  id: string;
  start: number;
  end: number;
  kind: VisualKind;
  eyebrow: string;
  title: string;
  detail: string;
  brand?: BrandKind;
  brands?: BrandKind[];
  platforms?: Array<"instagram" | "tiktok" | "youtube">;
  metric?: string;
  origin?: string;
  destination?: string;
  ctaLabel?: string;
};

export type MotionCompositionProps = {
  videoUrl: string | null;
  transcript: string;
  scenes: SceneSpec[];
  captionPreset: CaptionPreset;
  motionStyle: MotionStyle;
  accent: string;
  projectName: string;
  durationInFrames: number;
  soundEnabled: boolean;
  words: TimedWord[];
  wordTiming: boolean;
  sourceFit: "cover" | "contain";
};

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
const ease = (frame: number, from = 0, to = 16) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

const card = (accent: string): CSSProperties => ({
  border: "2px solid rgba(255,255,255,.13)",
  backgroundColor: "#14171c",
  boxShadow: `0 24px 70px rgba(0,0,0,.48),0 0 45px ${accent}16`,
  borderRadius: 32,
});

const BrandMark = ({ brand, size = 72 }: { brand: SceneSpec["brand"]; size?: number }) => {
  if (brand === "openai") return <BsOpenai size={size} />;
  if (brand === "anthropic") return <SiAnthropic size={size} />;
  if (brand === "gemini") return <SiGooglegemini size={size} />;
  if (brand === "apple") return <SiApple size={size} />;
  if (brand === "google") return <SiGoogle size={size} />;
  if (brand === "meta") return <SiMeta size={size} />;
  if (brand === "microsoft" || brand === "amazon") return <div style={{ fontSize: size * .26, fontWeight: 950, letterSpacing: "-.05em", textTransform: "uppercase" }}>{brand === "microsoft" ? "MS" : "amazon"}</div>;
  if (brand === "tesla") return <SiTesla size={size} />;
  if (brand === "nvidia") return <SiNvidia size={size} />;
  if (brand === "glm") return (
    <div
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: size * 0.27,
        backgroundColor: "#2b62ff",
        color: "white",
        fontSize: size * 0.29,
        fontWeight: 950,
        letterSpacing: "-.08em",
      }}
    >
      GLM
    </div>
  );
  return <Sparkles size={size} />;
};

const brandLabels: Record<BrandKind, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
  glm: "GLM",
  apple: "Apple",
  google: "Google",
  meta: "Meta",
  microsoft: "Microsoft",
  amazon: "Amazon",
  tesla: "Tesla",
  nvidia: "NVIDIA",
};

const Stage = ({ eyebrow, accent, children }: { eyebrow: string; accent: string; children: ReactNode }) => (
  <div style={{ position: "absolute", inset: "130px 72px 110px", display: "flex", flexDirection: "column", gap: 28 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        color: "rgba(255,255,255,.52)",
        fontSize: 23,
        fontWeight: 850,
        letterSpacing: ".16em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 99, backgroundColor: accent, boxShadow: `0 0 20px ${accent}` }} />
      {eyebrow}
    </div>
    <div style={{ position: "relative", flex: 1 }}>{children}</div>
  </div>
);

type VisualProps = { localFrame: number; accent: string; scene: SceneSpec };

const HookVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const pop = spring({ fps: 30, frame: localFrame, config: { damping: 12, stiffness: 165, mass: 0.7 } });
  const strike = ease(localFrame, 7, 16);
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div
        style={{
          ...card(accent),
          position: "absolute",
          inset: "16px 0 0 80px",
          padding: 44,
          overflow: "hidden",
          transform: `rotate(3deg) scale(${0.88 + pop * 0.12})`,
          opacity: pop,
        }}
      >
        {[1, 2, 3, 4].map((line) => (
          <div key={line} style={{ position: "absolute", left: line * 135, top: 0, width: 1, bottom: 0, backgroundColor: "rgba(255,255,255,.055)" }} />
        ))}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ width: 132, height: 132, display: "grid", placeItems: "center", borderRadius: 34, border: "2px solid rgba(255,255,255,.13)", backgroundColor: "#20242a" }}>
            <BrandMark brand={scene.brand} size={76} />
          </div>
          {/game|gaming|spiel/i.test(`${scene.title} ${scene.detail}`) ? <Gamepad2 color={accent} size={110} strokeWidth={1.6} /> : <Star color={accent} size={100} strokeWidth={1.5} />}
        </div>
        <div style={{ position: "relative", marginTop: 48, maxWidth: 700, fontSize: 90, lineHeight: 0.9, letterSpacing: "-.075em", fontWeight: 950, textTransform: "uppercase" }}>
          {scene.title}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 275,
          left: -10,
          right: -24,
          height: 104,
          display: "grid",
          placeItems: "center",
          transform: `rotate(-8deg) scaleX(${strike})`,
          backgroundColor: "#ff4f42",
          color: "#070809",
          fontSize: 65,
          fontWeight: 1000,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          boxShadow: "0 16px 50px rgba(255,79,66,.3)",
        }}
      >
        {scene.eyebrow}
      </div>
    </Stage>
  );
};

const BrandVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const pop = spring({ fps: 30, frame: localFrame, config: { damping: 13, stiffness: 155, mass: 0.72 } });
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, overflow: "hidden", display: "grid", placeItems: "center", textAlign: "center", padding: 58 }}>
        {[0, 1, 2].map((ring) => <div key={ring} style={{ position: "absolute", width: 280 + ring * 170, height: 280 + ring * 170, borderRadius: 999, border: `2px solid ${accent}${ring === 0 ? "55" : "22"}`, transform: `scale(${0.72 + pop * 0.28}) rotate(${localFrame * (ring % 2 ? -0.35 : 0.35)}deg)` }} />)}
        <div style={{ position: "relative", width: 230, height: 230, display: "grid", placeItems: "center", borderRadius: 58, backgroundColor: "#f6f5ef", color: "#090a0b", transform: `scale(${pop})`, boxShadow: `0 0 85px ${accent}38` }}><BrandMark brand={scene.brand} size={130} /></div>
        <div style={{ position: "absolute", left: 50, right: 50, bottom: 48, fontSize: 62, lineHeight: .96, fontWeight: 950, letterSpacing: "-.055em", textTransform: "uppercase" }}>{scene.title}</div>
      </div>
    </Stage>
  );
};

const CodeVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const enter = interpolate(localFrame, [0, 16], [70, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const built = interpolate(localFrame, [16, 34], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ display: "grid", gridTemplateColumns: "1.08fr .92fr", gap: 26, height: "100%", transform: `translateY(${enter}px)` }}>
        <div style={{ ...card(accent), padding: 34, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 34 }}>
            {["#ff5d56", "#ffc642", accent].map((color) => <span key={color} style={{ width: 16, height: 16, borderRadius: 20, backgroundColor: color }} />)}
          </div>
          {[76, 52, 88, 64, 94, 42].map((width, index) => {
            const reveal = ease(localFrame, index * 3, index * 3 + 12);
            return <div key={`${width}-${index}`} style={{ height: 18, width: `${width * reveal}%`, marginBottom: 20, borderRadius: 10, backgroundColor: index % 3 === 0 ? accent : "rgba(255,255,255,.16)" }} />;
          })}
          <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 18, fontSize: 27, fontWeight: 850 }}>
            <BrandMark brand={scene.brand} size={56} /> {scene.brand ? brandLabels[scene.brand] : "Build system"}
          </div>
        </div>
        <div style={{ ...card(accent), position: "relative", overflow: "hidden", transform: `scale(${0.76 + built * 0.24})`, opacity: 0.25 + built * 0.75, backgroundColor: "#1a1e29" }}>
          <div style={{ position: "absolute", left: 36, bottom: 118, width: 72, height: 72, borderRadius: 18, backgroundColor: accent, boxShadow: `0 0 38px ${accent}88`, transform: `translateY(${Math.sin(localFrame * 0.28) * 20}px)` }} />
          {[35, 145, 255].map((left, index) => <div key={left} style={{ position: "absolute", left, bottom: 78 + index * 30, width: 92, height: 18, borderRadius: 8, backgroundColor: "rgba(255,255,255,.66)" }} />)}
          <div style={{ position: "absolute", left: 30, top: 30, padding: "13px 18px", borderRadius: 16, backgroundColor: accent, color: "#080a0b", fontSize: 22, fontWeight: 950, textTransform: "uppercase" }}>Playable</div>
        </div>
      </div>
    </Stage>
  );
};

const MechanicsVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const spin = localFrame * 2.6;
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 430, height: 430, borderRadius: 999, border: `2px solid ${accent}55`, top: 35, left: 250, transform: `rotate(${spin}deg)` }}>
          {[0, 90, 180, 270].map((deg, index) => <div key={deg} style={{ position: "absolute", width: 50 + index * 5, height: 50 + index * 5, borderRadius: index % 2 ? 16 : 99, backgroundColor: index === 0 ? accent : "#f6f4eb", left: "50%", top: "50%", transform: `rotate(${deg}deg) translateX(215px) rotate(${-deg - spin}deg)`, boxShadow: index === 0 ? `0 0 36px ${accent}` : "none" }} />)}
        </div>
        <div style={{ position: "absolute", top: 155, left: 362, width: 205, height: 205, display: "grid", placeItems: "center", transform: `rotate(${-spin * 0.35}deg)` }}>
          <BrandMark brand={scene.brand} size={155} />
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 36, display: "flex", justifyContent: "space-between", alignItems: "end" }}>
          <div>
            <div style={{ fontSize: 82, lineHeight: 0.9, fontWeight: 950, letterSpacing: "-.06em" }}>WILD<br />MECHANICS</div>
            <div style={{ color: accent, fontSize: 26, marginTop: 16, fontWeight: 850 }}>Physics without a playbook</div>
          </div>
          <GitBranch color={accent} size={100} strokeWidth={1.5} />
        </div>
      </div>
    </Stage>
  );
};

const ContextVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const pull = interpolate(localFrame, [0, 34], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const inputs = [
    { x: -300, y: -150, icon: <FolderOpen size={54} /> },
    { x: 315, y: -135, icon: <FileCode2 size={54} /> },
    { x: -325, y: 150, icon: <Braces size={54} /> },
    { x: 300, y: 155, icon: <Sparkles size={54} /> },
  ];
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, overflow: "hidden" }}>
        {inputs.map((input, index) => <div key={`${input.x}-${input.y}`} style={{ position: "absolute", left: "50%", top: "47%", width: 112, height: 112, display: "grid", placeItems: "center", borderRadius: 28, border: "2px solid rgba(255,255,255,.15)", backgroundColor: "#262931", color: index === 1 ? accent : "white", transform: `translate(calc(-50% + ${input.x * pull}px),calc(-50% + ${input.y * pull}px)) scale(${0.85 + (1 - pull) * 0.15})` }}>{input.icon}</div>)}
        <div style={{ position: "absolute", left: "50%", top: "47%", width: 238, height: 238, display: "grid", placeItems: "center", borderRadius: 62, border: `3px solid ${accent}88`, backgroundColor: "#20242a", boxShadow: `0 0 ${80 - pull * 30}px ${accent}33`, transform: `translate(-50%,-50%) scale(${1.08 - pull * 0.2})` }}>
          <BrandMark brand={scene.brand} size={126} />
        </div>
        <div style={{ position: "absolute", bottom: 35, left: 0, right: 0, textAlign: "center", fontSize: 32, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>Code + assets + context</div>
      </div>
    </Stage>
  );
};

const CompareVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const brands = (scene.brands ?? []).slice(0, 4);
  if (brands.length < 2) return <KeywordVisual localFrame={localFrame} accent={accent} scene={scene} />;
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ display: "grid", gridTemplateColumns: brands.length === 2 ? "1fr 1fr" : "1fr 1fr", gap: 22, height: "100%" }}>
        {brands.map((brand, index) => {
          const scale = spring({ fps: 30, frame: localFrame - index * 4, config: { damping: 14, stiffness: 155 } });
          return <div key={brand} style={{ ...card(index === brands.length - 1 ? accent : "#f3f1e8"), display: "flex", alignItems: "center", gap: 25, padding: "0 30px", transform: `scale(${scale})`, opacity: scale }}><BrandMark brand={brand} size={68} /><div><div style={{ fontSize: 30, fontWeight: 900 }}>{brandLabels[brand]}</div><div style={{ color: "rgba(255,255,255,.45)", fontSize: 18, marginTop: 6 }}>Compared in context</div></div></div>;
        })}
      </div>
    </Stage>
  );
};

const CtaVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const scale = spring({ fps: 30, frame: localFrame, config: { damping: 10, stiffness: 145, mass: 0.8 } });
  const cursorX = interpolate(localFrame, [12, 34], [140, 0], clamp);
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transform: `scale(${0.76 + scale * 0.24})` }}>
        <MessageCircle size={110} color={accent} strokeWidth={1.5} />
        <div style={{ marginTop: 32, maxWidth: 720, fontSize: 78, lineHeight: 0.92, letterSpacing: "-.07em", fontWeight: 950, textTransform: "uppercase" }}>{scene.title}</div>
        <div style={{ marginTop: 38, padding: "20px 30px", borderRadius: 22, backgroundColor: accent, color: "#070809", fontWeight: 950, fontSize: 28, textTransform: "uppercase", letterSpacing: ".04em" }}>{scene.ctaLabel ?? "Leave a comment"}</div>
        <MousePointer2 size={62} fill="white" color="black" style={{ position: "absolute", bottom: 44, right: 160 + cursorX, transform: "rotate(-15deg)" }} />
      </div>
    </Stage>
  );
};

const TravelVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const line = interpolate(localFrame, [0, 34], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 72, top: 115, maxWidth: 350, fontSize: 54, fontWeight: 950 }}>{scene.origin ?? "START"}</div>
        <div style={{ position: "absolute", right: 72, bottom: 105, maxWidth: 350, textAlign: "right", fontSize: 54, fontWeight: 950 }}>{scene.destination ?? "DESTINATION"}</div>
        <div style={{ position: "absolute", left: 175, top: 285, width: 560 * line, height: 6, borderRadius: 10, backgroundColor: accent, boxShadow: `0 0 25px ${accent}`, transform: "rotate(22deg)", transformOrigin: "left center" }} />
        <MapPin size={70} color={accent} fill={accent} style={{ position: "absolute", left: 140 + 520 * line, top: 235 + 205 * line }} />
        <div style={{ position: "absolute", left: 46, right: 46, bottom: 32, fontSize: 55, fontWeight: 950, letterSpacing: "-.05em", textTransform: "uppercase" }}>{scene.title}</div>
      </div>
    </Stage>
  );
};

const SocialVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const available = {
    instagram: { Icon: SiInstagram, color: "#ad36a7" },
    tiktok: { Icon: SiTiktok, color: "#070708" },
    youtube: { Icon: SiYoutube, color: "#f03" },
  };
  const platforms = scene.platforms?.length ? scene.platforms : ["instagram" as const];
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 35, overflow: "hidden" }}>
        {platforms.map((platform, index) => {
          const { Icon, color } = available[platform];
          const rise = spring({ fps: 30, frame: localFrame - index * 6, config: { damping: 11 } });
          return <div key={platform} style={{ width: platforms.length === 1 ? 270 : 190, height: platforms.length === 1 ? 310 : 260, display: "grid", placeItems: "center", border: "2px solid rgba(255,255,255,.16)", borderRadius: 38, backgroundColor: color, transform: `translateY(${(1 - rise) * 120}px) rotate(${(index - (platforms.length - 1) / 2) * 5}deg)`, opacity: rise, boxShadow: index === platforms.length - 1 ? `12px 10px 0 ${accent}` : "0 24px 70px rgba(0,0,0,.35)" }}><Icon size={110} /></div>;
        })}
      </div>
    </Stage>
  );
};

const StatVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const metric = scene.metric ?? "";
  const parsed = metric.match(/\d+(?:[.,]\d+)?/);
  const target = parsed ? Number(parsed[0].replace(",", ".")) : 0;
  const count = interpolate(localFrame, [0, 42], [0, target], clamp);
  const displayMetric = parsed ? metric.replace(parsed[0], Number.isInteger(target) ? String(Math.round(count)) : count.toFixed(1).replace(".", ",")) : "KEY METRIC";
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, padding: 48 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,.45)", fontSize: 24, fontWeight: 800 }}><span>PERFORMANCE</span><WandSparkles color={accent} size={54} /></div>
        <div style={{ marginTop: 30, fontSize: displayMetric.length > 9 ? 126 : 190, lineHeight: 0.9, fontWeight: 950, color: accent }}>{displayMetric}</div>
        <div style={{ fontSize: 54, lineHeight: 1, fontWeight: 900, letterSpacing: "-.04em" }}>{scene.title}</div>
        <div style={{ position: "absolute", left: 48, right: 48, bottom: 48, height: 22, borderRadius: 20, backgroundColor: "rgba(255,255,255,.1)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, target ? count / target * 100 : 0)}%`, borderRadius: 20, backgroundColor: accent }} /></div>
      </div>
    </Stage>
  );
};

const KeywordVisual = ({ localFrame, accent, scene }: VisualProps) => {
  const scale = spring({ fps: 30, frame: localFrame, config: { damping: 13, stiffness: 160 } });
  return (
    <Stage eyebrow={scene.eyebrow} accent={accent}>
      <div style={{ ...card(accent), position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: 60, transform: `scale(${0.8 + scale * 0.2})` }}>
        <Code2 color={accent} size={85} strokeWidth={1.6} />
        <div style={{ fontSize: 80, lineHeight: 0.95, fontWeight: 950, letterSpacing: "-.06em", textTransform: "uppercase" }}>{scene.title}</div>
        <div style={{ maxWidth: 650, color: "rgba(255,255,255,.5)", fontSize: 26, lineHeight: 1.3 }}>{scene.detail}</div>
      </div>
    </Stage>
  );
};

const VisualStage = (props: VisualProps) => {
  if (props.scene.kind === "hook") return <HookVisual {...props} />;
  if (props.scene.kind === "brand") return <BrandVisual {...props} />;
  if (props.scene.kind === "code") return <CodeVisual {...props} />;
  if (props.scene.kind === "mechanics") return <MechanicsVisual {...props} />;
  if (props.scene.kind === "context") return <ContextVisual {...props} />;
  if (props.scene.kind === "compare") return <CompareVisual {...props} />;
  if (props.scene.kind === "cta") return <CtaVisual {...props} />;
  if (props.scene.kind === "travel") return <TravelVisual {...props} />;
  if (props.scene.kind === "social") return <SocialVisual {...props} />;
  if (props.scene.kind === "stat") return <StatVisual {...props} />;
  return <KeywordVisual {...props} />;
};

const TalkingHeadPlaceholder = ({ accent, frame }: { accent: string; frame: number }) => {
  const breathe = 1 + Math.sin(frame * 0.09) * 0.012;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#171b22" }}>
      <div style={{ position: "absolute", left: "50%", top: 0, width: 440, height: 440, borderRadius: 999, backgroundColor: `${accent}22`, transform: "translateX(-50%)" }} />
      <div style={{ position: "absolute", left: "50%", bottom: -90, width: 640, height: 780, transform: `translateX(-50%) scale(${breathe})` }}>
        <div style={{ position: "absolute", width: 255, height: 310, borderRadius: "48% 48% 43% 43%", left: 193, top: 5, backgroundColor: "#777c87", boxShadow: "-30px 20px 55px rgba(0,0,0,.28)" }} />
        <div style={{ position: "absolute", width: 610, height: 560, borderRadius: "49% 49% 15% 15%", left: 15, top: 270, backgroundColor: "#373c47", boxShadow: "-70px 20px 90px rgba(0,0,0,.28)" }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300, backgroundColor: "rgba(4,5,7,.34)" }} />
    </div>
  );
};

const CaptionLayer = ({ transcript, words, preset, accent, progress, currentSeconds, wordTiming }: { transcript: string; words: TimedWord[]; preset: CaptionPreset; accent: string; progress: number; currentSeconds: number; wordTiming: boolean }) => {
  const displayWords = words.length ? words : transcript.trim().split(/\s+/).filter(Boolean).map((text) => ({ text, start: 0, end: 0 }));
  if (!displayWords.length) return null;
  const timedIndex = words.length ? words.findIndex((word) => currentSeconds >= word.start && currentSeconds < Math.max(word.end, word.start + .08)) : -1;
  const previousTimedIndex = words.length ? words.reduce((latest, word, index) => word.start <= currentSeconds ? index : latest, 0) : -1;
  const activeIndex = timedIndex >= 0 ? timedIndex : previousTimedIndex >= 0 ? previousTimedIndex : Math.min(displayWords.length - 1, Math.floor(progress * displayWords.length));
  const pageSize = preset === "clean" ? 6 : preset === "editorial" ? 5 : 4;
  const pageStart = Math.floor(activeIndex / pageSize) * pageSize;
  return (
    <div style={{ position: "absolute", left: 62, right: 62, top: 930, minHeight: 210, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: preset === "clean" ? 10 : 14, textAlign: "center", textTransform: preset === "clean" ? "none" : "uppercase", fontFamily: preset === "editorial" ? "Georgia,Times New Roman,serif" : "inherit", fontWeight: preset === "editorial" ? 800 : 950, fontSize: preset === "clean" ? 58 : preset === "editorial" ? 65 : 72, lineHeight: 0.98, letterSpacing: preset === "clean" ? "-.035em" : "-.055em", textShadow: "0 5px 25px rgba(0,0,0,.9)" }}>
      {displayWords.slice(pageStart, pageStart + pageSize).map((word, index) => {
        const active = wordTiming && pageStart + index === activeIndex;
        return <span key={`${pageStart + index}-${word.text}`} style={{ display: "inline-block", maxWidth: "100%", overflowWrap: "anywhere", padding: preset === "punch" && active ? "8px 13px 10px" : preset === "editorial" && active ? "3px 4px 11px" : "3px 1px", borderRadius: preset === "punch" && active ? 12 : 0, color: active ? (preset === "punch" ? "#070809" : accent) : "white", backgroundColor: preset === "punch" && active ? accent : "transparent", borderBottom: preset === "editorial" && active ? `8px solid ${accent}` : "none", transform: active && preset === "punch" ? "rotate(-1.5deg) scale(1.05)" : "none" }}>{word.text}</span>;
      })}
    </div>
  );
};

export const MotionComposition = ({ videoUrl, transcript, scenes, captionPreset, motionStyle, accent, projectName, durationInFrames, soundEnabled, words, wordTiming, sourceFit }: MotionCompositionProps) => {
  const frame = useCurrentFrame();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const activeScene = scenes.find((scene) => progress >= scene.start && progress < scene.end) ?? scenes[scenes.length - 1];
  const sceneStartFrame = Math.ceil((activeScene?.start ?? 0) * Math.max(1, durationInFrames - 1));
  const localFrame = Math.max(0, frame - sceneStartFrame);
  const sceneEntry = ease(localFrame, 0, 10);
  const background = motionStyle === "editorial" ? "#12100d" : motionStyle === "clean" ? "#11151a" : "#08090b";
  return (
    <AbsoluteFill style={{ backgroundColor: background, color: "#f7f6f0", fontFamily: "Inter,Arial,Helvetica,sans-serif", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 1015, opacity: sceneEntry, transform: `translateY(${(1 - sceneEntry) * 20}px)` }}>
        {activeScene ? <VisualStage localFrame={localFrame} accent={accent} scene={activeScene} /> : null}
      </div>
      <div style={{ position: "absolute", left: 0, top: 1005, right: 0, bottom: 0, backgroundColor: "#13161b" }}>
        {videoUrl ? <Video src={videoUrl} objectFit={sourceFit} premountFor={30} disallowFallbackToOffthreadVideo volume={soundEnabled ? 1 : 0} style={{ width: "100%", height: "100%", backgroundColor: "#08090b" }} /> : <TalkingHeadPlaceholder accent={accent} frame={frame} />}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 980, height: 96, backgroundColor: "rgba(7,8,10,.62)" }} />
      <CaptionLayer transcript={transcript} words={words} preset={captionPreset} accent={accent} progress={progress} currentSeconds={frame / 30} wordTiming={wordTiming} />
      <div style={{ position: "absolute", top: 48, left: 52, display: "flex", alignItems: "center", gap: 13, color: "rgba(255,255,255,.72)", fontSize: 19, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>
        <div style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 11, backgroundColor: accent, color: "#070809", fontSize: 18 }}>M</div>{projectName}
      </div>
      <div style={{ position: "absolute", top: 48, right: 52, display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,.45)", fontSize: 17, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}><span style={{ color: accent }}>●</span> AI directed</div>
    </AbsoluteFill>
  );
};
