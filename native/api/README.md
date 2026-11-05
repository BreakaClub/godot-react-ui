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
