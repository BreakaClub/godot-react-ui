# Track: suite speed (windows and Web viewports run at the same time, engine-clock waits)

Branch `suite-speed`, based on `touch-selection` at `3021765`.

## Summary

Measured before this track, `node scripts/verify.mjs --interaction` took 1,030 s to 1,090 s for an engine, and `node scripts/verify-interaction-web.mjs` took about 1,225 s.

To improve suite runtime without dropping a check:
1. Native landscape and portrait windows run at the same time in parallel.
2. Web viewports (`landscape`, `portrait`, `retina-landscape`, `retina-portrait`, `pages`) run concurrently.
3. Touch pages run exclusively after parallel jobs complete: fling gestures depend on release velocity within a tenth of a second of engine time, which requires dedicated host throughput without browser roundtrip interference.
4. Waits for time to pass wait on the engine's clock when the action under test runs on the engine's clock.

## 1. Native Windows Run in Parallel

`scripts/verify.mjs` and `scripts/verify-world.mjs` start their two windows (landscape 1120x800, portrait 600x900) together through `runNativeVerifiers` (`scripts/native-run.mjs`), which calls `runNativeVerifier` for each.

- Each window maintains its own evidence directory (`artifacts/native-interaction/<window>/`).
- Windows prefix console logs with `[landscape]` or `[portrait]` to prevent interleaved text confusion.
- `--serial` flag is preserved to run sequentially when isolating failures.
- If one window fails, the other window runs to completion; failures are aggregated and reported clearly.

## 2. Web Viewport Jobs Run Concurrently

`verify:interaction:web` splits work across parallel Node processes:
- Viewport jobs (`landscape`, `portrait`, `retina-landscape`, `retina-portrait`) and `pages` (navigator starts, font slices, rotations) run concurrently, each with its own browser instance, free port, and export server.
- The `touch` job runs exclusively after the concurrent jobs finish to guarantee reliable touch velocity calculations without load-induced frame jitter.
- The test runner collates assertions and outputs a unified summary.

## Verification

- `pnpm test:types`: passed.
- `npx tsx --test tests/verifier-sections.test.ts tests/web-interaction-jobs.test.ts`: passed.
- Parallel native and web verification runs execute within deadline constraints.
