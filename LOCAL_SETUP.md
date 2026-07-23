# MOTN Studio — Local Codex Setup and Migration

This document is the handoff plan for turning the existing MOTN Studio prototype into a production-capable application without rebuilding the product or visual system from scratch.

## 1. Prerequisites

- Node.js 22.13+ (or the current active LTS after dependency verification)
- Corepack and pnpm 10+
- Git 2.40+
- Docker Desktop or Docker Engine with Compose
- FFmpeg 7+ with `ffprobe`, H.264, AAC, VP8/VP9, and Opus support
- Chromium dependencies required by Remotion
- At least 16 GB RAM and 20 GB free disk space for local rendering

Recommended: macOS or Linux. On Windows, use WSL2 and keep the repository inside the Linux filesystem.

Verify the toolchain:

```bash
node --version
pnpm --version
ffmpeg -version
ffprobe -version
docker compose version
```

## 2. Target Repository Layout

```text
motn-studio/
├── apps/
│   ├── web/                 # Next.js editor, upload UI, Remotion Player
│   ├── api/                 # Projects, assets, transcripts, storyboards, render jobs
│   ├── worker/              # FFmpeg normalization, audio extraction, transcription
│   └── renderer/            # Remotion bundle and MP4 rendering service
├── packages/
│   ├── compositions/        # Reusable Remotion scenes and 9:16 composition
│   ├── storyboard/          # Transcript-to-scene planning and entity grounding
│   ├── shared/              # Zod schemas, types, constants, job payloads
│   ├── ui/                  # Shared editor components and design tokens
│   └── config/              # TypeScript, ESLint, test, and build configuration
├── tests/
│   ├── fixtures/            # Short licensed/synthetic EN and DE media samples
│   └── e2e/                 # Upload-to-export browser tests
├── infra/                   # Docker Compose and deployment templates
├── scripts/                 # Bootstrap, health checks, fixture generation
├── AGENTS.md
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Keep the browser editor separate from media processing. The web app may preview a composition, but production normalization, transcription, and rendering must run in workers.

## 3. Bootstrap and Daily Commands

After the repository has been created and the current prototype source copied into it:

```bash
corepack enable
pnpm install
cp .env.example .env.local
docker compose up -d postgres redis minio
pnpm db:migrate
pnpm dev
```

Expected local services:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- MinIO console: `http://localhost:9001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Repository-wide verification:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm remotion:validate
```

Useful focused commands:

```bash
pnpm --filter @motn/web dev
pnpm --filter @motn/worker dev
pnpm --filter @motn/renderer dev
pnpm --filter @motn/storyboard test
pnpm --filter @motn/compositions remotion:studio
```

These are target command names. Add them to the root scripts during repository bootstrap and keep them stable afterward.

## 4. Environment Variables

Commit `.env.example`, never real secrets. Use placeholders such as:

```dotenv
# Runtime
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database and queue
DATABASE_URL=postgresql://motn:motn@localhost:5432/motn
REDIS_URL=redis://localhost:6379

# Object storage (MinIO locally, S3-compatible in production)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=motn-media
S3_ACCESS_KEY_ID=local-placeholder
S3_SECRET_ACCESS_KEY=local-placeholder
S3_FORCE_PATH_STYLE=true

# Auth
AUTH_SECRET=replace-with-a-long-random-value
AUTH_TRUST_HOST=true

# Transcription — choose one provider for each environment
TRANSCRIPTION_PROVIDER=local-whisper
WHISPER_MODEL=large-v3-turbo
WHISPER_DEVICE=auto

# Current Motion Studio comparison UI — optional; local Tiny/Small work without it
GROQ_API_KEY=

# Storyboard intelligence
STORYBOARD_PROVIDER=openai
STORYBOARD_MODEL=
OPENAI_API_KEY=

# Media and rendering
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
REMOTION_CONCURRENCY=2
RENDER_TIMEOUT_MS=900000
MAX_UPLOAD_BYTES=524288000
MAX_ANALYSIS_SECONDS=90

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=
SENTRY_DSN=
LOG_LEVEL=info
```

Validate required variables at process startup with a shared Zod schema. A missing required secret must fail startup, not fail halfway through a job.

## 5. Production Services

The minimum reliable production architecture is:

| Service | Responsibility |
|---|---|
| Web | Upload/editor UX, authenticated project state, Remotion Player preview |
| API | Signed uploads, persistence, job creation, status/events, authorization |
| PostgreSQL | Users, projects, assets, transcripts, storyboards, render records |
| Object storage | Original uploads, normalized media, thumbnails, rendered MP4 files |
| Redis + queue | Durable normalization, transcription, analysis, and render jobs |
| Media worker | `ffprobe`, FFmpeg normalization, audio extraction, thumbnails |
| Transcription worker | Language detection, EN/DE transcription, word timestamps |
| Renderer | Server-side Remotion bundle/render, MP4 validation and publication |
| Observability | Structured logs, traces, error reporting, job metrics |

Use explicit job states: `queued`, `probing`, `normalizing`, `transcribing`, `directing`, `ready`, `rendering`, `completed`, `failed`, and `cancelled`. Persist real progress and errors; do not estimate completion unless the UI labels it as an estimate.

## 6. Migration Sequence

1. **Freeze the prototype baseline.** Export or copy the current source, assets, design tokens, demo composition, and storyboard tests into a Git repository. Tag it `prototype-baseline`.
2. **Create the monorepo shell.** Add workspace configuration, shared TypeScript/ESLint settings, Docker Compose, `.env.example`, and `AGENTS.md`.
3. **Move without redesigning.** Port the current editor to `apps/web`, motion components to `packages/compositions`, and pure storyboard logic/tests to `packages/storyboard`. Preserve the visual appearance first.
4. **Define contracts.** Add versioned Zod schemas for media metadata, timed words, scenes, projects, and all queue payloads before connecting services.
5. **Replace browser-only upload analysis.** Send originals directly to object storage, probe them server-side, normalize to a known proxy format, and expose a signed preview URL.
6. **Replace browser-only transcription.** Extract mono 16 kHz audio in the worker, transcribe EN/DE with word timestamps, persist the result, and support manual corrections.
7. **Connect contextual direction.** Run the existing deterministic planner first; add model-assisted scene direction behind a typed, validated adapter. Never let model output bypass schema validation or entity grounding.
8. **Add durable project state.** Store transcript edits, storyboard versions, brand settings, composition settings, and render history. Mark renders stale whenever an input revision changes.
9. **Move export to the renderer.** Render with Remotion on the server, validate the output with `ffprobe`, upload the MP4, and only then mark the job complete.
10. **Harden and deploy.** Add authentication, signed URLs, rate limits, retention, cancellation, idempotency, monitoring, backups, and deployment pipelines.

Do not delete the in-browser path until the server pipeline has equivalent fixture coverage. It may remain as an explicitly labeled experimental/local mode.

## 7. Core Product Acceptance Flow

For both an English and a German fixture, the system must:

1. Accept a supported upload up to 500 MB.
2. Preserve the original and generate a playable normalized proxy.
3. Detect language and produce editable text plus word timestamps for the first 90 seconds.
4. Create chronological scenes grounded only in spoken content.
5. Show the talking head in the lower region, captions in the middle, and semantic motion graphics above.
6. Use company logos, metrics, routes, social platforms, and CTAs only when supported by the transcript.
7. Keep play/pause, seeking, speed, timeline, reframe, caption timing, source audio, and pacing controls synchronized.
8. Render a valid 1080 × 1920 H.264/AAC MP4 with correct duration and audible source audio.
9. Surface actionable failures and allow retry or cancellation without duplicating jobs.

## 8. Definition of Done

The local-production migration is complete when:

- A clean clone boots from documented commands with no manual database or bucket setup.
- EN and DE fixture uploads pass the complete upload-to-MP4 flow.
- MOV, MP4, WebM, and MKV fixtures are normalized server-side; unsupported/corrupt media fails clearly.
- Transcript words, scenes, preview, captions, audio, timeline, and final render share one canonical timebase.
- Storyboards never invent brands, statistics, routes, quotes, or calls to action.
- Refreshing the browser does not lose a project or an active job.
- Workers are idempotent, retryable, cancellable, and safe to run concurrently.
- Every completed render has passed `ffprobe` validation and is downloadable through an authorized URL.
- Unit, integration, composition, and end-to-end tests pass in CI.
- Secrets are absent from client bundles, logs, Git history, and fixtures.
- Production has health checks, structured logs, error alerts, queue visibility, backups, and retention policies.
- Known limitations are documented honestly; no placeholder is presented as a completed result.
