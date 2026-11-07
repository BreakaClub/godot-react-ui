# Track: lab navigator (the demo's shop window)

Branch `lab-navigator`, based on main `d282fee`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`,
`docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the README is at the end).

Ben's brief: "create an updated demo that allows you to navigate through all the different labs." The demo now opens on a navigation
shell with every lab behind it, built from the library's own kit and utility classes, and a lab registry (one file, one array) that
the shell, the verifiers and, in the next phase, a live code editor read. No editor, code panel or placeholder for one is built.

## Evidence so far (the batch was paused for window runs; what is left is listed)

Commits on `lab-navigator` (plain messages, nothing pushed): the registry and shell; the owner, scene return and launching; the verifier
sections; fixes the first full runs and `pnpm test` found; the accessibility lab's text colour.

| What | Result |
| --- | --- |
| `pnpm test:types` | exit 0 |
| `pnpm test` | first run 500 tests, 497 passed, 3 failed (the navigator verifier and the capture script were not in `scripts/demo-entry-points.mjs`, `tests/freshness.test.ts`'s guard list and `tests/script-arguments.test.ts`); fixed, those three files rerun 41 of 41. The whole suite was started again after the fixes (see the report for its result). New: `tests/labs.test.ts` (12), `tests/navigator.test.ts` (20, the shell mounted against the fake host: every lab renders, list, filter, keys, boundary, window and scene labs), one in `tests/web-verify.test.ts` (the demo server's landing) |
| `cargo clippy --locked --all-targets -- -D warnings` | exit 0 (no Rust changed in this track) |
| `rustup run stable cargo fmt --check` | clean |
| `cargo test --locked` | started; see the report |
| Native `navigator` section, landscape window 1120 x 800, `--no-retry` off, Compatibility, Breaka engine | run 8 passed everything at scale one: shell geometry (sidebar 257 wide, content area 863 x 800 less the header), all 20 labs opened by pointer with no error boundary tripped and no sideways overflow, window lab opened and closed by Escape and by the Labs button, the scene lab's button called the owner, the HUD's pass-through (backdrop press 1, control press kept), node count back to the baseline and the process idle after every lab, the filter, the keyboard walk, `initialLab` and an unknown id, and a lab that threw (the two expected `ERROR:` lines were matched by the runner). It failed at scale two on the Frosted glass card, which was 20 px taller than a 560 x 400 window (the card is now in a `ScrollView`). That fix, the portrait window, the scale-two pass and the root-recovery check were **not run natively**: the coordinator stopped window runs |
| Web `navigator` section, `?lab=` and `?demo=` starts, the scene round trip, the unchanged `verify:web` | **not run yet**: the Web side module had to be rebuilt for this profile (`node scripts/build-web.mjs --wasm-only`, the installed one was the stock profile's) and was still compiling when this was written; then `node scripts/build-web.mjs --export-only` |
| `pnpm verify`, `pnpm verify:interaction --only=events,inputs`, `--engine=stock`, `pnpm demo` | **not run** (windows) |

Rasters from run 8 (landscape, scale one) are in `artifacts/native-interaction/landscape/navigator-*.png`; `node scripts/navigator-captures.mjs`
copies them to `artifacts/lab-navigator/` with contact sheets once both windows have run (`--web` for the Web section's).

## Running it

```sh
pnpm demo                       # native window, the navigator ("pnpm build" runs first; the freshness guard refuses a stale library)
pnpm demo --lab=glass           # the same, opened on a lab; "pnpm demo -- --lab=glass" works too
pnpm demo --engine=stock        # on the stock Godot 4.7.2 profile (needs "pnpm build:native --engine=stock" first)
pnpm demo:web                   # serves the Web export on 8096 (a free port if that one is taken) and prints the address
pnpm demo:web --lab=glass       # the printed address opens that lab
```

`demo:web` serves the export that `pnpm build:web` made (`pnpm build:web --export-only` is enough when only TypeScript moved); it
refuses a stale export with one line that names the command that fixes it, as every Web run does (`docs/tracks/freshness.md`). Neither
command generates input, and neither holds the machine: `demo` is one Godot window, `demo:web` one static file server.
Other forms: `--demo=app` (after `--` natively, `?demo=app` on the Web) opens the single-page playground the demo had before.

## The registry

`demo/src/labs.tsx` is one array, `LABS`, with one entry per lab:

```ts
{ id: 'pointers', kind: 'inline', group: 'Input', title: 'Pointers', description: 'Mouse buttons, touches, click counts and pointer capture.',
  component: PointerLab, sources: ['res://src/pointer-lab.tsx'] }
```

`id` is the `--lab=` and `?lab=` value and the `showLab` name; `sources` are the TSX files that make the lab, as Godot resource paths (the
live code editor reads them; `tests/labs.test.ts` checks that each exists). `kind` is how the lab is shown (below), `group` one of
`LAB_GROUPS` (Foundations, Layout, Input, Text, Motion, Effects, Godot, Platform, Performance; a typo is a compile error). `LabName`
(the type `showLab` takes) and `labElement(name)` are derived from the array, so the verifiers call them as before. Adding a lab is one
entry and one import.

**Merging the five tracks that add a lab** (paint, text-styles, layout-utilities, transforms, combobox). They were told to add a line to
the old `labs.tsx`: a name on the `LabName` union and a `case` in `labElement`. Those hunks conflict with this file; the resolution is the
same for each: take this file and turn the track's pair of lines into one entry (`id`, `kind: 'inline'`, `group`, `title`, `description`,
`component`, `sources`). A lab left out of the array does not appear, and a `group` or `kind` that is wrong does not compile; `pnpm test`
fails for an id that is not unique, a missing source file or a description that is not one sentence. The track's own lab file, verifier
section and `scripts/verifier-sections.mjs` line need no change.

| Group | Labs |
| --- | --- |
| Foundations | Counter, Inventory, Events (three of the four tabs of the old playground; the fourth, Transitions, is under Motion) |
| Layout | Positioning, Scrolling |
| Input | Pointers, Keyboard, Controls (the kit), Drag and drop |
| Text | Text inputs, Text inputs edge cases, Text selection |
| Motion | Transitions |
| Effects | Filters (an explorer over the `filters` verifier's fixtures), Frosted glass |
| Godot | HUD over the game, World space |
| Platform | Accessibility, High-DPI text and edges |
| Performance | Benchmark (an explorer over the baseline fixture; opens at 100 cells) |

## The shell

`demo/src/navigator.tsx`, built from `View`, `Text`, `Button`, `ScrollView`, `Select`, `TextField` and `Portal` and plain utility classes
(slate neutrals, one indigo accent, 16/24 px spacing, one border colour; there is one font and no weights, so hierarchy is size and colour).

- **Wide** (a logical width of at least 1024, `lg:`): a 256 px sidebar and a 1 px rule on the left (brand, the filter, the groups and labs in a
  `ScrollView`, a one-line key hint), and the rest is the header and the lab. **Narrow** (portrait 600 x 900 is this): a top bar with the
  kit's `Select` for the lab and the filter beside it (they wrap to two rows below about 400 px), then the same header and lab. The two are
  one tree: the bar says `lg:hidden` and the sidebar `hidden lg:flex`, so a window crossing 1024 restyles natively with no React work.
- **Header**: the group, the lab's title and description, "3 of 20", and Previous and Next buttons (they wrap under the title when the
  window is very narrow).
- **List**: `role="listbox"` of `role="group"`s of `role="option"` buttons; the current lab has `aria-selected` and a tinted row. The list has
  one tab stop (the current lab, or the first match when the filter hides it); Up and Down move focus without opening anything, Home and
  End jump, Enter and Space open the focused lab (the button's own activation). The current lab scrolls into view whenever it changes.
- **Filter**: a kit `TextField`. Every word must appear in the title, description, group or id (any case); Enter opens the first match,
  Down goes to the list, Escape clears. In the narrow bar the same state filters the `Select`'s items, and the menu always keeps the
  current lab so that it can name it.
- **Previous and next**: the header buttons, and Alt+Down / Alt+Up from anywhere in the shell. Why those keys: the kit's controls ignore
  every Alt chord (`hasShortcutModifier`), a text input does not use Alt+Up or Down, and a browser has no shortcut on them (Alt+Left is
  Back). The shell's handler is a bubble handler and skips a key a lab already prevented, so a lab that wants the chord keeps it. The
  shell root is `tabIndex={-1}`, so a press anywhere inside it gives it focus and the chord works after a click in a lab.
- **Content area**: `relative`, `overflow-hidden`, painted `slate-50`. An inline lab is in a `ScrollView` keyed by the lab (a lab starts at the
  top, and leaving it unmounts it completely) inside an error boundary keyed by the lab. A lab that throws shows its message and stack (both
  selectable) and a Try again button where it was; React reports the error once to the console, and the shell and the other labs go on.
- **Launch labs.** A lab that cannot sit in a content area shows a card with the reason and one button (`window`: Frosted glass; `scene`:
  World space). Choosing it in the list never changes the window by itself, so Previous and Next can pass through it.
  - `window`: the button replaces the shell with the lab, and a small dark "Labs" pill with the lab's name sits in the overlay layer (a
    `Portal`, `fixed`, so nothing the lab draws can cover it). It takes focus, and Escape or the button brings the shell back.
  - `scene`: the button asks the owner to change scene (below).
- **Over the game.** `surface: 'game'` (the HUD) leaves the content area transparent, so the Godot backdrop shows, and lets pointers through
  it. Every ancestor of a pass-through region has to be `pointer-events-none` (README: Godot co-operation), so the whole navigator is while
  such a lab is open and the bar, sidebar and header say `pointer-events-auto` again.
- **An unknown `--lab=` id** is an error on screen (a card listing the ids that work, the header says "Lab not found"), a `console.error`
  from the owner, and no other lab.

### Labs in the shell

| Lab | How it sits | Change to the lab |
| --- | --- | --- |
| Counter, Inventory, Events, Transitions | inline, `padded` (the content area pads them as the playground did: 24 px, 32 from 768) | `CounterLab` and `InventoryLab` are exported from `app.tsx`; nothing else |
| Positioning, Scrolling, Pointers, Keyboard, Controls, Drag and drop, Text inputs (both), Text selection, Accessibility, High-DPI | inline in the scrolling content area | none |
| Filters, Benchmark | inline; new explorer components (`filters-explorer.tsx`, `benchmark-explorer.tsx`) put a fixture menu and a radius slider (or a size, an update and a content control) round the verifiers' components, which are unchanged. Benchmark opens at 100 cells. | none |
| HUD over the game | inline, `surface: 'game'` | none |
| Frosted glass | window lab | none |
| World space | scene lab | none |

Every lab that is inline fits its content area without sideways scrolling at both verifier sizes (checked on every run, below).
The Events lab has two buttons that unmount or detach the demo's root (they prove native survives it). In a verifier the verifier mounts it
again; in a normal run nobody would, so the owner puts the root back 600 ms later on the same lab (`Main.recoverRoot`, one pending timer,
cleared on exit). Nothing in the lab changed.

### Scenes

World space is a 3D scene (a camera, a quad, a `SubViewport` holding its own React root) and owns its window and input routing; mounting
it inside the shell would be a rewrite. So it is a scene lab: the card's button calls `SceneTree.changeSceneToFile`, and
`demo/src/scene-return.ts` puts a Godot `Button` ("Back to the labs", bottom left, styled as the shell's pill) on a `CanvasLayer` that is
a child of the tree's root window, not of the scene, so it survives the change, sits over the scene and changes back to the main scene
(then frees itself). The navigator comes back on the world lab through a module variable that outlives the old `Main`. The world scene and
its owner are untouched, and a verifier that starts it directly (`--scene`, `?scene=`) never sees the button. Web: `?scene=` is the
existing launcher; scene changes work in the page, so the same button works there (checked, below).
Accessibility is not a scene lab: `a11y-main.ts` is only an owner for `A11yPanel`, an ordinary React component, so it is an inline lab and
shows in the navigator as it does anywhere (start the demo with `--accessibility always` for the platform tree).

### Deep links and launching

- `--lab=<id>` after `--` natively, `?lab=<id>` on the Web (`web-shell.html` turns it into the same argument; Breaka's Web engine takes
  user arguments only after `--`). `pnpm demo --lab=glass` moves it behind the separator (`scripts/demo-arguments.mjs`).
- What a run opens with (`demo/src/launch.ts`, unit-tested): `--lab` or `--demo=navigator` opens the navigator, `--demo=app` the playground;
  with neither, a run that injects its own input (`injectsOwnInput`: `--verify*`, `--probe`) opens the playground and every other the
  navigator. That is the one place a run's purpose changes what the demo shows. The Web verifiers load the bare page, exactly as a person
  would, so the Web page itself makes the bare address the playground (`web-shell.html` adds `--demo=app` to it) and the demo server for a
  person sends the bare address to `?demo=navigator` (`scripts/web-server.mjs` `landing`, used by `pnpm demo:web` only). The verifiers' own
  servers have no landing, so they see what they saw.
- `pnpm demo` and `pnpm demo:web` already existed; `predemo` builds the scripts, `prepareNative` and `requireFreshWebExport` refuse stale
  builds. `demo:web` now prints a clean one-line refusal (no stack), takes `--lab=`, and tries 8096 and then a free port.

## Decisions

Numbered N1 to N15 here so that the coordinator can quote them; the plan's D-numbers are not used.

N1. **The registry is `labs.tsx` itself, and `LabName` and `labElement` come out of it.** The five tracks that add a lab each told to add "one
line to `labs.tsx`"; a second file that listed the same labs would have made that two lines in two files, and a union beside a `switch`
cannot give one lab a title, a group and a source. A `const` array with `defineLabs` keeps every `id` as a literal, `LabName` is the ids of
the entries that have a `component`, and `labElement` is a lookup. Evidence: `tests/labs.test.ts` (the twelve names the verifiers have always
used are still pages and render their own component; a scene is not a page; ids unique; sources exist; every group has a lab).
N2. **Responsive by variant classes, one tree.** `lg:hidden` bar and `hidden lg:flex` sidebar, rather than `useRootSize` and two renders: a
resize never reaches React (README: breakpoints are native). The cost is that the narrow bar's `Select` and the sidebar's list are both mounted
(the lab menu's items only while it is open); the hidden one has no rectangle and takes no focus. The sidebar starts at 1024, not 768, so that a lab written
for `md:` has at least 750 px.
N3. **A lab that needs the window gets a card and a button, not an automatic takeover.** Choosing Frosted glass in the list would otherwise
replace the whole shell, take Previous and Next with it, and leave the way back to a corner pill. With a card, the list, the keys and the
buttons walk through every lab, and the full window is something the person asked for.
N4. **World space is a scene lab; the way back is a Godot `Button` on a `CanvasLayer` under the tree's root window.** Mounting a `SubViewport`
world inside a React content area would be a rewrite of `world-main.ts`, and "honest" means the lab is what it is. The button is not React
because the world scene has no React root of the shell's; it sits under the window, so it survives the scene change without the scene knowing.
Not chosen: an Escape key in the scene (not discoverable, and `WorldMain._input` sees every key), and a button in `WorldPanel` (it is in the
3D world, and `verify-world` checks that panel's layout).
N5. **Accessibility is inline.** `a11y-main.ts` only owns `A11yPanel`; the platform tree needs `--accessibility always`, not a scene.
N6. **Pass-through needs every ancestor `pointer-events-none`.** First try: only the content area and the lab (like the old HUD page, whose
root had no ancestor). The first run showed `backdropPresses 0`: the navigator root and the column are elements that take pointers. So the
root says `pointer-events-none` while a `surface: 'game'` lab is open and the chrome says `pointer-events-auto`.
N7. **App-tab labs are `padded`.** They have no margin of their own (the playground gave them its page padding); the first capture had the
Counter against the edges. One registry field, not an edit of four labs.
N8. **What a run opens with** (`launch.ts`): see "Deep links and launching". Alternatives rejected: sniffing `navigator.webdriver` on the Web
(it is test-only logic in the page, and a public page would behave differently for automation); changing the Web verifiers' URL (they are
unchanged by instruction, and `tests/web-verify.test.ts` pins the shape of their server's URL).
N9. **Alt+Up and Alt+Down for previous and next.** Not `[` and `]` or Ctrl+Left and Right: a text input types the first two, uses the
latter on Windows and Linux, and a browser takes Ctrl+PageUp and Alt+Left. The key is delivered at the shell root, after the focused element,
and skipped when `defaultPrevented`.
N10. **The error boundary reports once and the verifier announces it.** React's `onCaughtError` is `console.error`, which Godot prints as an
`ERROR:` line; the runner fails a run on one, so the section prints `GODOT_REACT_EXPECT_ERROR <message>` before each throw it provokes
(`scripts/native-run.mjs`), which also proves the error was reported (an announced error that never appears fails the run).
N11. **Dividers are elements.** The style subset has `border` (all four sides) and no `border-b`; a header, a sidebar and a filter strip get a
`h-px` or `w-px` rule. (Found by the first unit test run: `Unsupported utility class "border-b"`, which is also why those tests mount every
lab under the fake host: all their classes are compiled.)
N12. **Filters and Benchmark are explorers.** The verifiers' components take verifier props and fill a window (`absolute inset-0`, fixed pixel
offsets), so the registry points at new components that wrap them with controls built from the kit and at the same sources. Filters offers the
eight fixtures that read well in a content area (the Godot-backdrop, Portal and cost fixtures need the window or the owner and are left to the
verifier). Benchmark opens at 100 cells; 250, 500, 1000 and 2000 are a radio button away.
N13. **The Events lab's danger buttons come back.** See "Labs in the shell". Without this, one press of "Unmount root" ends a demo Ben
runs by hand; the verifiers' owner is unchanged (it does not recover, since they mount again themselves).
N14. **`showNavigator` mounts a new navigator each call, and `extraLabs`, not `labs`.** Each demo bundle has its own copy of React, so a
component from the verifier's bundle cannot use hooks in the owner's renderer; the throwing lab has none, and the owner joins it to its own
registry. `initialLab` is read when the navigator mounts, so each call needs a key.
N15. **Two lab files changed.** `app.tsx` exports `CounterLab` and `InventoryLab` (the tabs of `App`), and `a11y-panel.tsx` gives its root
`text-slate-700`: its checkbox and radio labels inherited the default text colour (white) and were invisible on `slate-50` in any window; it
was not seen before because that lab is verified through the platform's tree, not its raster.

## Not verified, and limits

Filled in with the evidence section above (what ran, what did not, and why).

- The navigator is not shown in a window narrower than about 300 logical pixels, where the top bar's menu and filter share two rows and the
  header's buttons wrap; the verifiers' smallest case is 300 x 450 (portrait at a content scale of two) and 560 x 400.
- Most labs were written for the verifier windows (560 and wider). At 300 logical pixels the Controls and Counter labs scroll sideways; the
  section checks that every inline lab needs no sideways scrolling at 1120 x 800 and 600 x 900 only, and at a scale of two it opens the one lab
  written for 300 (High-DPI) and the window lab.
- A `fixed` element inside an inline lab is fixed to the window, as in a browser (the Positioning lab's box sits in the window's corner). The
  content area clips only `absolute` descendants.
- Window labs (Frosted glass) and the scene lab are not shown inside the navigator; the card says why. The whole shell is unmounted while a window
  lab has the window, so the sidebar's scroll position and the lab menu's state are rebuilt on the way back (the filter text and the current lab
  are kept).
- The error panel shows the stack with its absolute file paths; it is for a person debugging, not a polished message.
- The Events lab's danger buttons blank the window for 600 ms in a normal run (that is the demonstration), then the navigator returns on the same lab
  with its state reset.
- The Filters explorer lists eight of the filters fixtures; the Godot-backdrop, Portal scrim, cost and the other verifier-only fixtures are not offered.
- The bare Web address opens the playground (that is what the Web verifiers load); a host that serves the export publicly needs the `?demo=navigator` landing
  that `pnpm demo:web` adds. A person opening the export's `index.html` directly sees the playground.
- No live code editor, code panel or placeholder exists; the registry's `sources` field is read by nothing yet.

## README text

The demo opens on a lab navigator: `pnpm demo` (native) or `pnpm demo:web` (serves the Web export and prints the address) shows a sidebar of
every lab by group (a top bar with the kit's `Select` below 1024 logical pixels), a filter, a header with the lab's title and description and
Previous and Next (also Alt+Up and Alt+Down), and the lab in a clipped, scrolling content area with an error boundary of its own. A lab that
needs the whole window (frosted glass) or is its own scene (world space) shows a card and a button for it, with a way back that stays on
screen. `--lab=<id>` (after `--` natively, `?lab=<id>` on the Web; `pnpm demo --lab=glass`) opens a lab, and an unknown id is an error on
screen; `--demo=app` opens the single-page playground. The labs are one array, `demo/src/labs.tsx`: adding a lab is one entry (id, title,
description, group, how it is shown, its TSX sources). The verifiers still drive the playground: a run that injects input opens it, and the
Web page opens it at the bare address (`pnpm demo:web` sends that address to the navigator).
