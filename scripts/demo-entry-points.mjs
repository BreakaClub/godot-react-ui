// The demo's TypeScript entry points, bundled into `demo/.godot/GodotJS/src` by `scripts/build.mjs` and kept up to date by the
// watcher in `scripts/dev.mjs`: one list, so the watcher builds what the build does.
//
// The Web export needs a compiled module for every demo `.ts` file ("failed to include module:
// res://.godot/GodotJS/src/verifier-input.js"), so every `demo/src/*.ts` is an entry point, including the ones that are also bundled
// into the owners that import them (`verifier-input.ts`, `verify-text-input.ts`, `world-geometry.ts`, `glass-data.ts`). `app.tsx`
// is the demo's React page; the other `.tsx` files are bundled into it and the labs.
export const DEMO_ENTRY_POINTS = [
  // The demo owner and the verifiers that run in it.
  'demo/src/main.ts', 'demo/src/verify.ts', 'demo/src/verify-motion.ts', 'demo/src/verify-interaction.ts', 'demo/src/verify-hidpi.ts',
  'demo/src/verify-filters.ts', 'demo/src/verify-glass.ts', 'demo/src/glass-data.ts', 'demo/src/probe.ts', 'demo/src/app.tsx',
  // The world-space scene (docs/WORLD_SPACE.md) has its own owner, and the scene launcher starts it on the Web.
  'demo/src/world-main.ts', 'demo/src/world-geometry.ts', 'demo/src/verify-world.ts', 'demo/src/scene-launcher.ts',
  'demo/src/verifier-input.ts', 'demo/src/verify-text-input.ts',
  // The lab navigator (`demo/src/navigator.tsx`, bundled into main): what a run opens with, and the way back from a lab that is a scene.
  'demo/src/launch.ts', 'demo/src/scene-return.ts',
  // The text layout probe scene (docs/tracks/text-layout.md) has its own owner and verifier.
  'demo/src/text-layout-probe.ts', 'demo/src/verify-text-layout.ts',
  // The accessibility lab (docs/tracks/accessibility.md): its owner and its verifier.
  'demo/src/a11y-main.ts', 'demo/src/verify-a11y.ts',
];
