# MOTN Studio Local Handoff

This package contains the exact working prototype source plus the production handoff documents. It is intended to continue the product locally with Codex without rebuilding the editor or motion system from zero.

## Read in this order

1. `CURRENT_STATE.md` — what is working today and what is still prototype-only.
2. `PRD.md` — production product requirements, architecture, acceptance criteria, and milestones.
3. `LOCAL_SETUP.md` — target local toolchain, repository structure, services, and migration sequence.
4. `AGENTS.md` — durable instructions for Codex and contributors.

## Run the recovered prototype first

The package initially preserves the existing npm/Vinext layout. On Linux or WSL:

```bash
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run lint
npm test
npm run dev
```

The CUDA-skip variable prevents an unnecessary optional GPU runtime download; the prototype uses browser WASM for its local speech worker.

## Then begin the production migration

Do not redesign the editor during the first migration milestone. First preserve the current UI, Remotion composition, deterministic storyboard planner, and tests inside the target monorepo described in `LOCAL_SETUP.md`.

Recommended first Codex prompt:

> Read `START_HERE.md`, `AGENTS.md`, `CURRENT_STATE.md`, `PRD.md`, and `LOCAL_SETUP.md`. Inspect the current source and tests. Create a migration plan for Milestone 0 only. Preserve the current visual design and behavior, establish a reproducible monorepo baseline, and do not claim any browser-only capability is production-ready.

## Validation recorded at handoff

- Commit baseline: `812d65c`
- `npm run lint`: passed
- `npm test`: passed
- Production build/artifact validation: passed
- Storyboard tests: 5 passed

