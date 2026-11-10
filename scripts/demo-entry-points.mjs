// The demo's TypeScript entry points, bundled into `demo/.godot/GodotJS/src` by `scripts/build.mjs` and kept up to date by the
// watcher in `scripts/dev.mjs`: one list, so the watcher builds what the build does.
//
// The Web export needs a compiled module for every demo `.ts` file ("failed to include module:
// res://.godot/GodotJS/src/verifier-input.js"), so every `demo/src/*.ts` is an entry point, including the ones that are also bundled
// into the owners that import them (`verifier-input.ts`, `verify-text-input.ts`, `verify-combobox.ts`, `world-geometry.ts`, `glass-data.ts`). `app.tsx`
// is the demo's React page; the other `.tsx` files are bundled into it and the labs.
export const DEMO_ENTRY_POINTS = [
  // The demo owner and the verifiers that run in it.
  'demo/src/main.ts', 'demo/src/verify.ts', 'demo/src/verify-motion.ts', 'demo/src/verify-interaction.ts', 'demo/src/verify-hidpi.ts',
  'demo/src/verify-filters.ts', 'demo/src/verify-glass.ts', 'demo/src/glass-data.ts', 'demo/src/probe.ts', 'demo/src/app.tsx',
  // The layout utilities lab's data, its verifier and the Chrome numbers it compares with.
  'demo/src/layout-utilities-data.ts', 'demo/src/layout-utilities-reference.ts', 'demo/src/verify-layout-utilities.ts',
  // The paint lab's data and verifier.
  'demo/src/paint-data.ts', 'demo/src/verify-paint.ts',
  // The image lab's pictures, the owner's textures made from them and its verifier.
  'demo/src/image-data.ts', 'demo/src/demo-images.ts', 'demo/src/verify-images.ts',
  // The world-space scene (docs/WORLD_SPACE.md) has its own owner, and the scene launcher starts it on the Web.
  'demo/src/world-main.ts', 'demo/src/world-geometry.ts', 'demo/src/verify-world.ts', 'demo/src/scene-launcher.ts',
  'demo/src/verifier-input.ts', 'demo/src/verify-text-input.ts', 'demo/src/verify-combobox.ts',
  // The lab navigator (`demo/src/navigator.tsx`, bundled into main): what a run opens with, the way back from a lab that is a scene, and
  // the globals its router needs where native GodotJS has none (installed once, by whichever bundle loads first).
  'demo/src/launch.ts', 'demo/src/scene-return.ts', 'demo/src/verify-navigator.ts', 'demo/src/native-web-globals.ts',
  // The transforms lab's verifier, its shared data and the numbers Chrome reports for it.
  'demo/src/verify-transforms.ts', 'demo/src/transform-data.ts', 'demo/src/transform-golden.ts',
  // The text layout probe scene has its own owner and verifier.
  'demo/src/text-layout-probe.ts', 'demo/src/verify-text-layout.ts',
  // The accessibility lab: its owner and its verifier.
  'demo/src/a11y-main.ts', 'demo/src/verify-a11y.ts',
  // The text styles lab: its fonts, its samples (which the Chrome reference reads too) and its verifier.
  'demo/src/demo-fonts.ts', 'demo/src/text-styles-data.ts', 'demo/src/text-styles-golden.ts', 'demo/src/text-ink.ts', 'demo/src/verify-text-styles.ts',
  // The text stroke lab's verifier (the lab itself is a .tsx, bundled into the labs).
  'demo/src/verify-text-stroke.ts',
  // The rich text lab: its samples (which the Chrome reference reads too), Chrome's numbers and its verifier.
  'demo/src/rich-text-data.ts', 'demo/src/rich-text-golden.ts', 'demo/src/verify-rich-text.ts',
  // The live code editor over the godot-tsc package's checker and transpiler: the project it opens, the module registry, the swap that keeps state,
  // and their verifiers, with the reported sequence with the code panel open.
  'demo/src/live-compile-project.ts', 'demo/src/live-compile-checker.ts', 'demo/src/live-compile-modules.ts', 'demo/src/live-compile-refresh.ts',
  'demo/src/live-compile-session.ts', 'demo/src/live-compile-open.ts', 'demo/src/verify-live-compile.ts', 'demo/src/verify-live-compile-sequence.ts',
  // The dropdown lists' touch verifier.
  'demo/src/verify-dropdown-touch.ts',
  // The touch text selection verifier.
  'demo/src/verify-touch-selection.ts',
  // Which key chords go to the browser: the verifier's native half.
  'demo/src/verify-key-passthrough.ts',
  // The code panel's verifier. The editor itself is `demo/src/editor/`, hidden from Godot (`.gdignore`) and bundled into its importers.
  'demo/src/verify-code-editor.ts',
  // The keystroke cost diagnostic that drives the code panel.
  'demo/src/profile-keystrokes.ts',
  // The font fallback lab: its samples (which the Chrome reference reads too), the loader's store and the owner's host for the loader.
  'demo/src/font-slices-data.ts', 'demo/src/font-slices-store.ts', 'demo/src/font-fallback.ts', 'demo/src/verify-font-fallback.ts',
];

// The scripts the deployed playground starts as Godot scripts: the demo's owner (`main.tscn`), the autoload that starts another scene, and the
// world-space scene's owner (the "World space" lab is a scene). Everything else in the list above is bundled into one of these, or only a
// verifier runs it. The release Web export packs these and the compiled modules behind them, and nothing else (scripts/release-stage.mjs);
// the debug export, which the Web verifiers use, packs every entry point. `tests/release-stage.test.ts` checks that every scene and autoload a
// release script needs is one of these.
export const DEMO_RELEASE_ENTRY_POINTS = ['demo/src/main.ts', 'demo/src/scene-launcher.ts', 'demo/src/world-main.ts'];
