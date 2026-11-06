# Pinned custom Godot API

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

Cargo uses godot-rust's `api-custom-json` feature. The project `.cargo/config.toml`
sets both `GDRUST_GODOT_API_JSON` and `GDRUST_GODOT_INTERFACE_JSON` to these files
with repository-relative paths. Regenerate both together when changing the engine
qualification target, then rebuild and qualify native and Web artifacts.

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

The `stock` engine profile (`docs/tracks/stock-engine.md`) binds to these dumps instead of the custom 4.8 ones above:

- Binary: `/Users/ben/Development/godot-stock/bin/godot.macos.editor.arm64`, run through its wrapper
  `bin/godot-stock`. An unmodified Godot 4.7.2-stable (commit `ed1daf0bf001b61586d9930840f2f1394092c079`) with upstream
  GodotJS and AccessKit 0.22.3; `godot --version` prints `4.7.2.stable.custom_build.ed1daf0bf`.
- Dumped on 6 November 2026 with `--headless --audio-driver Dummy --dump-extension-api --dump-gdextension-interface-json`,
  copied unmodified from `/Users/ben/Development/godot-stock/api/` (which also holds `gdextension_interface.h`, not used here).
- API precision: single. `header.version_full_name`: `Godot Engine v4.7.2.stable.custom_build`.
- `stock-4.7.2/extension_api.json` SHA-256: `9586558a2eeb7781f9aadc6b6085294b0f9b38728fcd4f207a7deabf95a11d50`
- `stock-4.7.2/gdextension_interface.json` SHA-256: `7d8c0a039d9743eb8ebf88681ae0c641d8d3aa5ffca11081745a84da803e09a1`

`.cargo/config.toml` keeps selecting the 4.8 dumps for a hand-run cargo; `scripts/build-native.mjs` and
`scripts/build-web.mjs` set `GDRUST_GODOT_API_JSON` and `GDRUST_GODOT_INTERFACE_JSON` for the cargo child process under every profile
(cargo's `[env]` entries do not replace a variable already in the environment, so a shell exporting the other profile's pair
would otherwise bind a build to the wrong engine), and each profile uses its own target directories. The two dumps differ: the 4.8 dump has 35 classes the stock engine lacks (for example
`GodotJSObjectDBSnapshot`, `Line3D`, `Trail3D`), which this library does not use; it compiles unchanged against both.
The lean 3D Web templates, the lazy-table ABI and `lazy-function-tables` are 4.8-profile concerns: the feature stays
enabled in both profiles (it is harmless against a full engine and keeps one dependency set; the library still checks each
method on first use).

Regenerate the stock dumps from the stock tree with the command above (replace the binary), then update the hashes.

## Dumps and the freshness guard

The profile's dump pair is an input of every build of that profile: `build:native` and `build:web` hash it with `native/` (except `native/api` itself, Markdown and `.DS_Store`), `Cargo.toml`, `Cargo.lock`,
and `build.rs`, `rust-toolchain.toml` and `.cargo/config.toml` where present, plus the cargo features, and a run refuses an installed library, side module or Web export that was built from other bytes
(`docs/tracks/freshness.md`). The other profile's dumps are not inputs, so replacing the stock dump marks only stock builds stale.
After replacing a dump, rebuild with `pnpm build:native --engine=<name>` (and `build:web`), which cleans this crate; godot-rust's own
bindings regenerate from the dump through cargo's usual dependency tracking.
