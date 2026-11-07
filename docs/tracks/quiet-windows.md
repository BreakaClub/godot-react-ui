# Track: test windows that cannot take focus

Ben, 2026-11-07, with nine tracks running: "these bloody tests try steal focus _way_ too often". The earlier rule allowed "a brief tiny focus interruption"
per run, but a brief interruption per run is constant interruption at nine tracks. `VerifierInputIsolation` already kept real input out of a run; nothing
kept the run out of the person's way.

## Why the engine cannot be asked

- `show_window` always activates the application for the main window (`platform/macos/display_server_macos.mm:1719`, `GodotApplication.activateApplication`).
- An unbundled application does it in three steps 20 ms apart, the first of which gives focus to SystemUIServer (`godot_application.mm`, `forceUnbundledWindowActivationHackStep1`).
- `WINDOW_FLAG_NO_FOCUS` only sets a flag that `canBecomeKeyWindow` reads later, after the window already has the focus (`docs/tracks/verifier-integrity.md`).
- `--headless` has no renderer, and the verifiers read pixels back.
- Neither engine may be patched for a test.

## What it does

`scripts/quiet-window/quiet_window.m`, a small library loaded through `DYLD_INSERT_LIBRARIES` into automated runs only. `scripts/native-run.mjs` uses it for
every verifier; `node scripts/quiet-window.mjs <godot> [arguments]` is the same for anything else (an experiment's own scene). `scripts/run.mjs`, `scripts/dev.mjs`
and `pnpm demo` do not load it: a person's own window behaves as normal.

- The application's activation policy is forced to accessory (no Dock icon), and `activateIgnoringOtherApps:`, `activate`, `-[GodotApplication activateApplication]`,
  `-[NSRunningApplication activateWithOptions:]` and its macOS 14 twin do nothing.
- The window cannot become key or main, and `makeKeyAndOrderFront:` is a plain `orderFrontRegardless`.
- The window is fully transparent and click-through, so nothing shows and it takes no click. Its level is above a full-screen application and it joins every Space, so it can never be covered.
- `occlusionState` always says visible: the engine stops drawing a window it thinks is covered (`window_can_draw` is `wd.is_visible`, `godot_window_delegate.mm:377`).

**Launcher scripts.** The system strips `DYLD_INSERT_LIBRARIES` on the way into `/bin/sh`, so a launcher script cannot pass it on. The stock profile's
`bin/godot-stock` is such a script, so `directLaunch` in `scripts/engine.mjs` names its binary and what the script sets (`HOME`), and `quietLaunch` starts that.

**It fails closed.** The library prints `QUIET_WINDOW_LOADED`; a verifier run whose log lacks it, or that logs `QUIET_WINDOW_ACTIVATED` or `QUIET_WINDOW_MISSING`,
fails (`quietWindowProblem`). A launcher that dropped the library therefore shows up at once. It can steal focus that one time, not repeatedly.

**Scope.** macOS. Other platforms start the command unchanged.

## Evidence

A scene that draws a known colour for 120 frames and reads it back from the viewport texture, started with `scripts/quiet-window.mjs`, sampling `lsappinfo front`:

| Engine, renderer | Pixel read back (drew `0ac81e`) | `has_focus` | `window_is_focused` | `window_can_draw` | ms per frame |
| --- | --- | --- | --- | --- | --- |
| Breaka 4.8, Compatibility | `0ac81e` | false | false | true | 9.7 |
| Breaka 4.8, Mobile | `0ac81e` | false | false | true | 10.1 |
| Breaka 4.8, Forward+ | `0ac81e` | false | false | true | 8.8 |
| Stock 4.7.2, Compatibility | `0ac81e` | false | false | true | 11.0 |

Godot and SystemUIServer never appeared as the frontmost application, sampled every 100 ms in the two runs that used the sampler. The person kept switching applications during
the runs (Spotify, OrbStack, Discord, Mail), and those are what the samples show.

The rule that the window must render is what the table checks. Not covered by this table: that every verifier section passes without ever having had OS focus. Sections that used to see
focus for a moment after launch now never do. Any that depended on it will fail, and that is a bug in the section (the plan's rule: `Viewport::push_input` does not look at window focus).

## Starvation

Ten tracks in parallel took the load average to 122 on 10 cores and a `grep` over a minute. Heavy commands in a batch of parallel tracks go through a gate, at most three at once, which blocks
in `flock` with no polling: `/Users/ben/Development/breaka/godot-react-ui-worktrees/.gate/gate <command>` (outside the repository, for the length of a batch).
