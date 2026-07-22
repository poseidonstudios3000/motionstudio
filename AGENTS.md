# MOTN Studio Agent Guidance

This repository builds a premium 9:16 talking-head motion-graphics editor and render pipeline. Preserve the established product direction: lower talking head, central captions, semantic motion graphics above, fast but readable pacing, and transcript-grounded visuals.

## Repository Conventions

- Use pnpm workspaces and Turbo. Do not introduce a second package manager or commit another lockfile.
- TypeScript is strict. Avoid `any`; validate external data at runtime with Zod.
- Use named exports for shared code. Keep package public APIs explicit through `index.ts` files.
- Prefer pure functions for storyboard, timing, and scene selection logic.
- Keep UI components focused; move media, job, and persistence logic into services/hooks.
- Use structured logging with stable job, project, asset, and render identifiers.
- Preserve existing behavior and visual design unless the task explicitly requests a redesign.
- Do not edit generated output, lockfiles by hand, vendored code, or build artifacts.

## Architectural Boundaries

- `apps/web` may upload, edit, preview, and display job state. It must not perform production FFmpeg normalization, hold provider secrets, or claim a browser export is universal.
- `apps/api` owns authentication, authorization, persistence, signed URLs, job creation, and status APIs. It must not perform long-running media work in request handlers.
- `apps/worker` owns probing, normalization, audio extraction, thumbnails, and transcription.
- `apps/renderer` owns Remotion bundling/rendering, output validation, publication, and cancellation.
- `packages/compositions` must be deterministic from typed input props. It must not query databases, call AI services, or depend on editor state.
- `packages/storyboard` owns deterministic planning, semantic grounding, and validated model adapters. Provider-specific code stays behind interfaces.
- `packages/shared` owns canonical schemas and timebase utilities; it must not depend on application packages.
- Services communicate through versioned schemas and durable IDs, never through shared mutable filesystem paths.

Dependencies must point inward toward shared contracts. Do not import an app from another app or import server-only modules into the browser bundle.

## Canonical Media Rules

- Store the original upload unchanged.
- Probe media before processing and persist real metadata.
- Normalize a preview/render source with FFmpeg; do not infer support from filename extensions alone.
- Use seconds for persisted timestamps and explicit FPS/frame conversion helpers for Remotion.
- Treat transcript edits, storyboard edits, brand changes, and composition settings as versioned inputs. Any change makes earlier renders stale.
- Validate every completed render with `ffprobe` before publishing it.

## No-Fake-Processing Rules

These rules are non-negotiable:

- Never fabricate upload duration, language, transcript text, progress, scene direction, render completion, or download URLs.
- Never invent brands, logos, products, metrics, routes, quotes, social platforms, or CTAs that are not supported by the transcript or explicit user input.
- Never silently replace a failed backend operation with demo data.
- Never label a timer as progress unless it represents measured work. Label estimates as estimates.
- Never mark a job `completed` until its artifact exists, is validated, and can be accessed by the authorized user.
- Never catch an error without logging it and returning a meaningful typed failure state.
- Demo mode and fixture data must be visibly labeled and isolated from production project state.
- If a capability is unavailable, disable it or explain the limitation. Honest failure is preferable to apparent success.

## Security and Privacy

- Keep all secrets server-side and validate environment variables at startup.
- Use signed, short-lived upload/download URLs and authorize every project/asset/job access.
- Treat uploaded video, audio, transcripts, and faces as sensitive user data.
- Do not log media contents, transcript bodies, signed URLs, tokens, or provider payloads containing user content.
- Sanitize filenames; generate internal object keys and IDs server-side.
- Enforce file-size, duration, MIME/content, and decompression limits before expensive processing.
- Run FFmpeg and render jobs with timeouts, resource limits, isolated temporary directories, and no shell interpolation of user input.
- Implement retention and deletion for originals, proxies, transcripts, intermediate files, and renders.
- Pin production dependencies and address critical advisories before release.

## Commands

Run commands from the repository root unless a package README says otherwise.

```bash
pnpm install
pnpm dev
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm remotion:validate
```

Focused development:

```bash
pnpm --filter @motn/web dev
pnpm --filter @motn/worker test
pnpm --filter @motn/renderer test
pnpm --filter @motn/storyboard test
pnpm --filter @motn/compositions remotion:studio
```

Do not bypass failing checks, weaken strictness, or update snapshots solely to make CI green. Fix the underlying behavior or document why an intentional change requires a reviewed expectation update.

## Verification Expectations

Match verification to the change:

- UI/editor change: lint, typecheck, relevant component tests, and the affected browser flow.
- Storyboard change: unit tests in English and German, including negative tests against invented entities or metrics.
- Timing/caption change: boundary tests at scene and word transitions plus composition frame checks.
- Worker/media change: real short fixtures for each supported container/codec, corrupt-input tests, retry, cancellation, and cleanup tests.
- Renderer change: render a short fixture, then assert codec, dimensions, duration, frame rate, and audio with `ffprobe`.
- Schema/API change: migration test, compatibility test, authorization test, and job-payload validation.
- Dependency/config change: repository-wide lint, typecheck, tests, and build.

Before handoff, report which commands ran, their results, and any check that could not run. Do not claim unperformed tests passed.

## Test Fixtures

- Only commit licensed, generated, or consented media.
- Keep fixtures short and small while preserving audio/video streams.
- Maintain at least: English speech, German speech, silence, no-audio video, variable frame rate, portrait, landscape, corrupt input, and supported container variants.
- Expected transcripts and storyboards must live beside fixtures and be reviewable.
- Provider-dependent tests must be separated from deterministic CI tests and clearly labeled.

## Change Discipline

- Inspect the current implementation and tests before editing.
- Make the smallest coherent change that completes the requested behavior.
- Preserve unrelated user changes and do not use destructive Git commands.
- Add or update tests with every behavior change.
- Add a database migration for schema changes; never mutate production schemas implicitly at startup.
- Keep queue jobs idempotent. Retrying the same logical request must not duplicate assets, transcripts, or renders.
- Update relevant documentation and `.env.example` when commands, configuration, architecture, or limitations change.
- When a decision changes a public contract or crosses service boundaries, record it in a short ADR under `docs/adr/`.

## Product Quality Bar

- The first three seconds must communicate a clear hook without compromising caption readability.
- Motion must be purposeful and grounded in speech, not decorative noise.
- Captions, cuts, and visuals must remain synchronized in preview and export.
- Respect safe zones for platform overlays and preserve the speaker's face when reframing.
- Prefer deterministic, editable direction over opaque one-shot generation.
- Accessibility is part of done: keyboard transport controls, visible focus, labels, contrast, and reduced-motion behavior where applicable.
- A feature is done only when its normal, loading, empty, error, retry, cancellation, and stale states are truthful and usable.
