# Blitz transition probe

This isolated Cargo workspace evaluates the actual Blitz/Stylo transition and
layout pipeline without changing the main GDExtension or React renderer.

```sh
PATH=/Users/ben/.cargo/bin:$PATH cargo run --release --locked
node build-web.mjs
# From the artifacts directory:
node harness.js
# From this probe directory:
node verify-browser.mjs
```

`build-web.mjs` uses the same Rust nightly, Emscripten, Binaryen and lazy-table
ABI as the main project's Web build. It compiles a Rust side module, then a small
Emscripten dynamic-loader host using the engine's actual loader implementation.
`--smoke-only` rebuilds only that host against an existing side module.

The browser verifier creates a temporary localhost server with COOP/COEP, runs
the compiled probe in Chrome, writes `artifacts/browser-report.json`, and closes
both browser and server. This is an executable CSS/layout probe; it does not
render into Godot or validate font/paint parity.

The expected output proves numeric height interpolation, sibling reflow,
interrupted reversal and removed-node cleanup. The `autoAtStart: 120` result
deliberately records a missing capability: the pinned engine changes from 40px
to intrinsic 120px immediately, rather than interpolating.

See [the evaluation](../../docs/BLITZ_EVALUATION.md) for decisions and limitations.
