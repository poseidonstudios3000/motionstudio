# MOTN Studio — Current Prototype State

This file describes the exact handoff baseline recovered from the deployed MOTN Studio prototype. It exists so a local Codex session can distinguish implemented behavior from production work that remains.

## Baseline

- Source commit: `812d65c` (`Repair uploads, custom direction, and player controls`)
- Application: Vinext/React 19 prototype deployed through ChatGPT Sites
- Video composition: Remotion 4, 1080 × 1920, 30 FPS
- Package manager: npm with `package-lock.json`
- Validation at handoff: `npm run lint` and `npm test` pass
- Automated coverage: rendered-page metadata plus five deterministic storyboard tests

## Implemented Today

### Editor and player

- Premium three-panel editor with workflow rail, 9:16 preview, inspector, and timeline.
- Remotion Player preview with real play/pause state, seeking, timecode, playback speed, active scene, and timeline playhead.
- Timeline zoom, Fill/Fit reframing, source-audio toggle, caption word highlighting, caption presets, motion styles, colors, and pacing control.
- English and German transcript editing with stale-storyboard protection.

### Upload and local analysis

- Local file selection and drag/drop.
- 500 MB limit, empty-file checks, real media metadata, video-track validation, and browser codec checks through Mediabunny.
- First 90 seconds extracted as mono 16 kHz audio.
- Browser Worker transcription through Transformers.js and `Xenova/whisper-tiny` with word timestamps.
- Worker error, message-error, cancellation, request-race, and six-minute timeout handling.
- Manual transcript fallback when automatic transcription cannot complete.

### Storyboard direction

- Pure deterministic planner with chronological EN/DE beats.
- Fast and calm pacing modes.
- Grounded detection for OpenAI, Anthropic, Gemini, GLM, Apple, Google, Meta, Microsoft, Amazon, Tesla, and NVIDIA.
- Grounded metrics, routes, Instagram/TikTok/YouTube mentions, and localized comment CTAs.
- Visual types: hook, brand, code, mechanics, context, compare, travel, social, statistic, keyword, and CTA.
- Negative tests prevent invented brands and prevent product versions such as GPT-5 from becoming fake statistics.

### Composition and export

- Split composition: semantic motion graphics above, captions across the middle, talking head below.
- Scene-specific brand marks, exact metrics, routes, platform icons, and CTA copy.
- Word-timed captions when Whisper timestamps exist; duration-estimated captions after manual edits.
- Local browser MP4 export through Remotion Web Renderer when WebCodecs/H.264/AAC support is available.
- Export guards for unfinished analysis, missing transcript, stale storyboard, duplicate renders, cancellation, and codec failures.

## Prototype Boundaries — Not Production-Ready

- Media is a browser `blob:` URL and disappears on refresh.
- No user/project database is connected.
- No object storage is connected.
- No durable background jobs, retries, resumability, or cross-device state.
- “Any format” is not yet universal: the browser must decode the uploaded codec.
- Browser Whisper requires a first-run model download and can be slow or memory constrained.
- Only the first 90 seconds are analyzed and exported by the prototype.
- MP4 export depends on browser WebCodecs support and keeping the tab open.
- No server FFmpeg normalization or server Remotion renderer exists.
- No authentication, billing, quotas, retention controls, or production observability exists.
- Automated browser upload-to-export tests and real media fixtures have not been added.

## Existing Source Map

- `app/studio.tsx` — editor UI, upload orchestration, player state, local transcription, and browser export.
- `app/media-analysis.ts` — media inspection, audio extraction, resampling, and timed-word normalization.
- `app/transcription-worker.ts` — Transformers.js Whisper Worker.
- `app/storyboard.ts` — deterministic transcript-to-scenes planner.
- `app/motion-composition.tsx` — Remotion composition and semantic visuals.
- `app/globals.css` — full editor visual system and responsive layout.
- `tests/storyboard.test.ts` — planner grounding and timing tests.
- `tests/rendered-html.test.mjs` — starter rendering verification.

## Existing Commands

```bash
# Linux/WSL CPU-only install; avoids an unnecessary optional CUDA download.
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci

npm run dev
npm run lint
npm test
npm run build
```

The current starter build scripts use Linux utilities. The production migration should replace those Sites-specific scripts with cross-platform monorepo commands rather than carrying them forward unchanged.

## First Local Codex Instruction

Open the extracted repository and tell Codex:

> Read `AGENTS.md`, `CURRENT_STATE.md`, `PRD.md`, and `LOCAL_SETUP.md`. Preserve the current visual design and behavior. First create a migration plan that moves the prototype into the target monorepo without redesigning it. Do not implement new features until the current player, composition, planner, and tests run in their new packages. Treat every current limitation in `CURRENT_STATE.md` as unfinished work, not as a supported production capability.

