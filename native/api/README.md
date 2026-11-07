# Pinned Godot APIs

Two dump pairs are kept, and which one binds what changed with docs/tracks/single-build.md:

| Dump pair | Godot | Binds |
| --- | --- | --- |
| `stock-4.7.2/` | stock 4.7.2 | **the native UI library and the native live-compile extension, for both engine profiles** (`NATIVE_BINDING_API`, `scripts/native-binding.mjs`; `.cargo/config.toml` names the same files for a hand-run cargo), and the `stock` profile's Web build |
| this directory (`extension_api.json`, `gdextension_interface.json`) | Breaka's custom 4.8 | the `breaka` profile's **Web** build only (`scripts/build-web.mjs`, `scripts/build-live-compile-web.mjs`) |

A GDExtension loads in the Godot it was bound to or a newer one, so the native builds are bound to the oldest engine either profile runs and Breaka's 4.8 loads them too.
The Web keeps its own pair because a Web side module is linked with the Emscripten of the engine that loads it. The sections below record where each pair came from.

## Breaka's custom 4.8 (this directory)

These unmodified API dumps were generated from the exact installed V8 engine:

- Binary: `/Applications/Godot48.app/Contents/MacOS/Godot`
- Version: `4.8.beta.custom_build.1225394ce`
- Source commit: `1225394ce`
- API precision: single
- `extension_api.json` SHA-256: `731edf3f688fd8515bdc0e84a5038e8d912f74cc1a8eb4b78e9f93c26ea68a0d`
- `gdextension_interface.json` SHA-256: `24bf12720a6fdef3f9d270c792c5abe9ef5f645d67335615383d7e42d77143f3`

From this directory:

```sh
GODOT=/Applications/Godot48.app/Contents/MacOS/Godot \
  /Applications/Godot48.app/Contents/MacOS/Godot \
  --headless --audio-driver Dummy \
  --dump-extension-api --dump-gdextension-interface-json
```

Cargo uses godot-rust's `api-custom-json` feature. `scripts/build-web.mjs` sets both `GDRUST_GODOT_API_JSON` and `GDRUST_GODOT_INTERFACE_JSON` to these files for the
`breaka` profile's Web build. (The project `.cargo/config.toml` used to name them for every native build; it now names the 4.7.2 pair below.) Regenerate both together
when changing the engine qualification target, then rebuild and qualify the Web artifacts.

The stock godot-rust API 4.7 table was incompatible with this custom engine: its
`GDScriptTextDocument::foldingRange` binding (hash `3877611628`) does not exist in
the installed binary's ClassDB. At engine commit `1225394ce`,
`modules/gdscript/language_server/gdscript_text_document.cpp::_bind_methods`
confirms its absence. `gdextension_classdb_get_method_bind` returns null for that
missing method, and godot-rust's eager table initialization correctly panics.
These exact dumps establish the correct method names and hashes rather than
suppressing a mismatched API check.

The library uses godot-rust's supported `lazy-function-tables` feature on both
native and Web. The lean Web template is built with `disable_physics_3d=yes`;
`servers/register_server_types.cpp` excludes `PhysicsDirectBodyState3D` under
`PHYSICS_3D_DISABLED`. Eagerly loading every Godot API therefore introduced an
unused 3D dependency into a 2D UI extension. Lazy tables resolve only actually
used methods, still validating their exact class, method, and hash through
`load_class_method` and panicking if any required binding is absent. All native
extension calls are main-thread-only; `experimental-threads` is not enabled.
Godot-rust 0.5.5's crate documentation recommends these tables for Web exports.
The supported UI API surface is exercised by the native and browser verifiers.

## Stock Godot 4.7.2 (`stock-4.7.2/`)

The native builds (both profiles) and the `stock` profile's Web build bind to these dumps instead of the custom 4.8 ones above (`docs/tracks/stock-engine.md`, `docs/tracks/single-build.md`):

- Binary: `/Users/ben/Development/godot-stock/bin/godot.macos.editor.arm64`, run through its wrapper
  `bin/godot-stock`. An unmodified Godot 4.7.2-stable (commit `ed1daf0bf001b61586d9930840f2f1394092c079`) with upstream
  GodotJS and AccessKit 0.22.3; `godot --version` prints `4.7.2.stable.custom_build.ed1daf0bf`.
- Dumped on 6 November 2026 with `--headless --audio-driver Dummy --dump-extension-api --dump-gdextension-interface-json`,
  copied unmodified from `/Users/ben/Development/godot-stock/api/` (which also holds `gdextension_interface.h`, not used here).
- API precision: single. `header.version_full_name`: `Godot Engine v4.7.2.stable.custom_build`.
- `stock-4.7.2/extension_api.json` SHA-256: `9586558a2eeb7781f9aadc6b6085294b0f9b38728fcd4f207a7deabf95a11d50`
- `stock-4.7.2/gdextension_interface.json` SHA-256: `7d8c0a039d9743eb8ebf88681ae0c641d8d3aa5ffca11081745a84da803e09a1`

`.cargo/config.toml` selects this pair for a hand-run cargo (`cargo test`, `cargo clippy`), and `scripts/build-native.mjs`, `scripts/build-live-compile.mjs` and `scripts/build-web.mjs`
set `GDRUST_GODOT_API_JSON` and `GDRUST_GODOT_INTERFACE_JSON` for the cargo child process themselves (cargo's `[env]` entries do not replace a variable already in the
environment, so a shell exporting the other pair would otherwise bind a build to the wrong API; the native pair is `NATIVE_BINDING_API`, a test holds `.cargo/config.toml` to it).
The two dumps differ: the 4.8 dump has 35 classes the stock engine lacks (for example `GodotJSObjectDBSnapshot`, `Line3D`, `Trail3D`), which this library does not use; it compiles
unchanged against both. The lean 3D Web templates, the lazy-table ABI and `lazy-function-tables` are 4.8-profile concerns: the feature stays enabled everywhere (it is harmless
against a full engine and keeps one dependency set; the library still checks each method on first use, which is also why a library bound to 4.7.2 can run in 4.8: only the methods
it calls have to exist there, with the hash it was bound with).

Regenerate the stock dumps from the stock tree with the command above (replace the binary), then update the hashes.

## Dumps and the freshness guard

A build's dump pair is an input of that build (the native builds' is the 4.7.2 pair; a Web build's is its profile's): `build:native`, `build-live-compile` and `build:web` hash it with `native/` (except `native/api` itself, Markdown and `.DS_Store`), `Cargo.toml`, `Cargo.lock`,
and `build.rs`, `rust-toolchain.toml` and `.cargo/config.toml` where present, plus the cargo features, and a run refuses an installed library, side module or Web export that was built from other bytes
(`docs/tracks/freshness.md`). A dump that is not a build's own is not an input of it, so replacing Breaka's 4.8 dump marks only Breaka's Web builds stale. Native stamps also record the
API version and a hash of the pair (`binding`), and `NATIVE_BINDING_API.version` must match the dump's header or every native run fails with a message saying so.
After replacing a dump, rebuild with `pnpm build:native` and `node scripts/build-live-compile.mjs` (or `pnpm build:web --engine=<name>`), which cleans this crate; godot-rust's own
bindings regenerate from the dump through cargo's usual dependency tracking.
