# Fabric renderer and interaction plan

Status: plan v2.1, 6 November 2026. Done: Phase 0 (`9f4a02c`), Phase 1 (`0d11607`), Phase F0
(`4f7dd0d`). Next: Phase F1.

v1 of this plan (`7f0a96c`) was rejected because it built every interaction feature on the
prototype's commit path, which re-walks and re-sends the whole tree on every change. v2 replaces
that path with React Native Fabric's architecture end to end (persistent reconciler, immutable shadow
tree with structural sharing, diffing proportional to change, an incremental native mounting layer,
native style resolution) and then builds the interaction features on it: Godot-cooperative input,
touch, focus and keyboard, positioning and overlays, scrolling, text selection, text input with IME
and on-screen keyboards, an input component kit, HTML-style drag and drop, accessibility, and
world-space UI.

## Decision log

Decisions are made from evidence by whoever reaches them (the coordinator or the implementer) and
recorded here and in `docs/INTERACTION_PROGRESS.md`. A measured gate that fails is a decision point,
not a reason to wait.

- **D1 (v2, `7f312d8`)**: adopt Fabric's architecture end to end; no JSI-style binding work until
  measurements show the GDExtension call boundary is the bottleneck.
- **D2 (after F0, v2.1)**: the persistent shadow tree lives in **JS**, not behind native handles.
  Evidence: F0 (`docs/INTERACTION_PROGRESS.md`, Phase F0) measured native `RefCounted` handles at
  4 µs (native) and 5 µs (Web) per create, but GC reclaims them only under JS allocation pressure:
  on native, 100,000 dropped handles stayed live through 30 idle seconds, and in a 300 × 2,000-node
  commit run up to 67 commits' worth of old trees stayed alive and 70,000 handles were never
  reclaimed after commits stopped. GodotJS has no V8 external-memory accounting (no
  `AdjustAmountOfExternalAllocatedMemory` anywhere in `modules/GodotJS`; only a manual full-GC
  request, `bridge/jsb_environment.cpp:3433-3450`), so wrapping native nodes in any Godot type keeps
  native memory invisible to V8. A JS shadow tree is ordinary GC-managed JS memory with no native
  memory attached, needs no native call during render, and keeps every Fabric property that matters:
  immutable instances, structural sharing, identity-skipping diff, one synchronous native commit
  carrying only changed nodes, native mounting, layout, style resolution and state.

The plan is written so an implementer can execute it phase by phase without re-deciding the
architecture. Where it says **must**, it is a contract. Where it says *suggested*, use judgement and
record what you chose.

---

## 0. Read this first

### 0.1 How to execute this plan

1. Read sections 0–4 in full before touching code. Section 5 holds the phases; do them **in order**.
2. Before each phase, read every file listed under that phase's **Files** in full in the current
   session. The Files list is the expected set; if a task genuinely needs another file (a build
   entry point, a shared test helper), touch it and record why in the progress log.
3. Work one task at a time. After each task, run that task's tests. After each phase, run the phase
   **Gate**. Do not start the next phase until the gate passes.
4. Record every phase gate in `docs/INTERACTION_PROGRESS.md`: commands run, pass/fail counts,
   artifact paths you inspected, measurements, anything you chose that this plan left open.
5. Commit at the end of each phase (optionally after each passing task) in the `godot-react-ui`
   repository. Never push.

### 0.2 Stop-and-report conditions

**Decide, document, continue.** When this plan is wrong, incomplete or contradicted by evidence (an
API that differs from what is written, a measured gate that fails, a semantic choice the plan does not
make), gather the evidence, choose the option the evidence supports that stays within section 3's
invariants, record it in the decision log at the top of this file and in
`docs/INTERACTION_PROGRESS.md` (what you found, what you chose, why), fix the plan text it affects, and
keep going. Do not wait for approval.

Stop and report only when:

- every option you can see would break a section 3 invariant or an AGENTS.md hard rule (push, deploy,
  production data, sandbox-protected files);
- a gate still fails after two root-cause fixes and you have no further evidence-backed hypothesis;
- a change would require editing generated output (`dist/`, `target/`, `demo/.godot/`, `artifacts/`).

### 0.3 Rules that apply to every task

These come from `../AGENTS.md` (the breaka-platform root). Read that file once; the rules most
relevant here are:

- **Root cause first.** Reproduce, gather evidence (logs, PNGs, snapshots, debugger), then change
  behaviour. No speculative fixes, no guards that hide bugs, no swallowed errors.
- **Type safety.** No `as any`, no `as unknown as T`, no unproven `as T`, no non-null `!` in
  TypeScript. In Rust, never `unwrap()` data that came from JS or Godot; return an error the way the
  API in section 4 says. `expect("…")` is only for invariants this code itself established, with a
  message that states the invariant.
- **Exhaustiveness.** Rust `match` on protocol enums must not use `_ =>` arms. TypeScript switches
  over unions must be exhaustive through the function's return type. (`@breaka/core` is not a
  dependency of this repository; do not add it.)
- **No magic numbers.** Every tuning value gets a named `const` next to its use with a comment saying
  where the value came from. Appendix A lists the constants this plan introduces.
- **Godot launches** always use `GODOT=/Applications/Godot48.app/Contents/MacOS/Godot` and pass
  `--audio-driver Dummy`. Visual Godot runs started from a sandboxed shell can abort in AppKit with
  exit 134; rerun with host permissions, it is not a project bug.
- **Generated files.** After adding or changing any `#[func]`, `#[signal]` or class, rebuild native
  and regenerate typings, and commit the regenerated `demo/typings/*.d.ts` and `demo/gen/**` with
  `.uid` files. `pnpm gen:types` runs `pnpm build` (which typechecks) first, so it cannot pass while
  TypeScript already uses the new API. In that case run the Godot step directly after
  `pnpm build:native`: `$GODOT --headless --audio-driver Dummy --editor --generate-types --path demo`.
- **Do not rewrite working code** that this plan does not ask you to change. The motion behaviour
  (transitions, intrinsic `0 ↔ auto` sizing) must keep passing `pnpm verify:motion` and
  `pnpm verify:motion:web` with unchanged assertions, even though Phase F3 moves the code that drives it.
- **Inspect the PNGs** a verifier writes when a phase changes anything visual. Assertions alone are not
  acceptance. Compare settled captures, not mid-transition ones: mid-transition captures differ
  between two runs of the same binary.
- **Processes.** Never stop a process you did not start. Before verifiers, check memory pressure
  (`memory_pressure | tail -1`, `sysctl vm.swapusage`); a starved host makes verifiers time out.
- **Commits:** plain subject and body, no AI attribution or co-author trailers. Stage specific files;
  check `git diff --cached --name-only` before every commit. Never commit `artifacts/`.

### 0.4 Commands

Run from `godot-react-ui/`:

```sh
export GODOT=/Applications/Godot48.app/Contents/MacOS/Godot
export PATH="$HOME/.cargo/bin:$PATH"  # rustup first: Homebrew's rustc on PATH aborts in dyld
pnpm test:types                      # TypeScript typecheck
pnpm test                            # TypeScript unit tests (tsx --test)
cargo test --locked                  # Rust unit tests
cargo clippy --locked --all-targets  # baseline: 0 warnings
pnpm build:native                    # release extension into demo/addons/godot-react-ui/bin (atomic replace)
pnpm gen:types                       # regenerate GodotJS typings (see 0.3 for the chicken-and-egg case)
pnpm build                           # typecheck + bundle (verify scripts also run this)
pnpm verify                          # native baseline workflow, 2 viewports
pnpm verify:motion                   # native motion workflow, 2 viewports
pnpm verify:interaction              # native interaction workflow (Phase 1 onwards)
```

Web (see `docs/WEB.md` for toolchain requirements). Serve on a port you have checked is free and
point every Web verifier at it; the verifiers will happily test a stale server:

```sh
pnpm build:web
lsof -nP -iTCP:8097 -sTCP:LISTEN                            # must print nothing
PORT=8097 pnpm demo:web                                     # in the background
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:web   # same variable for every Web verifier
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:motion:web
GODOT_REACT_WEB_URL=http://127.0.0.1:8097 pnpm verify:interaction:web
```

Stop your server when the Web gate is done. Bound every wait and check the process and its log if
something stalls. `artifacts/web-verification/failure.png` is never cleared by the verifier; judge a
run by its report and log.

Baselines: at `7f0a96c`, `cargo test` 19, `pnpm test` 13, Clippy 0 warnings, `verify:web` 249
assertions, `verify:motion:web` 433 assertions (`docs/INTERACTION_PROGRESS.md`).

---

## 1. Where the code is today

One Godot `Control`, `ReactUiRoot`, owns the whole React tree; React elements are not Godot nodes.

**Commit path (what v2 replaces).** `src/renderer.ts` is a mutation-mode `react-reconciler` host.
On every commit its `flush()` walks the **entire** JS host tree, re-resolves every node's class names,
`JSON.stringify`s every node's style to diff it against a `committed` map, and sends one JSON batch
(`create`, `style` with the full resolved style, `text`, `children` with full child lists, `remove`)
through `applyBatch`. `flush()` also runs after every frame that delivered input events, because
`hover:`/`active:`/`focus:` variants and inheritance are resolved in JS. Native `apply_batch`
(`native/lib.rs`) clones the whole `Model` to validate the batch, then `sync_model` loops over every
node rebuilding Taffy styles to compare them, re-syncs the whole Stylo document, and `draw()`
re-records every element's canvas items on any redraw.

Measured (existing Web benchmark, DPR 1, 2,000 boxes, every cell updated, median per update):

| Stage | Time |
| --- | --- |
| JS style diff (full tree walk) | 1.2 ms |
| JSON encode | 0.2 ms |
| Native JSON parse | 3.9 ms |
| Native model clone + validate | 1.0 ms |
| Native sync (paint resources, Taffy styles, Stylo pass) | 17 ms |
| Native draw (re-records every element; 244 of 2,003 visible) | 17 ms |
| React reconcile total | 45 ms |

JSON is not the main cost; whole-tree work on both sides is. At 50 nodes the flush is about 1.2 ms.
A one-node change in a large tree still pays the full-tree walks on both sides (by code inspection;
Phase F0 measures it).

**Input.** Phase 1 (uncommitted) adds synchronous event dispatch: native queues events and emits an
`events_ready` signal from inside `gui_input`; JS drains, dispatches capture/bubble with
`preventDefault`, and resolves cancelable events before the signal returns. Measured JS time per
synchronous dispatch is about 1–3 ms p95 on native macOS (up to 3.04 ms for a handler that sets
state; Phase 1 gate run).

The README's "Current limits" section lists the remaining feature gaps (scrolling, text input,
selection, drag and drop, accessibility, positioning).

---

## 2. Scope

### 2.1 Goals — part A: Fabric core

1. **Commit cost proportional to what changed.** No JS or native step walks the whole tree on a
   commit. React clones only changed host nodes; native diffs only changed subtrees (shared subtrees
   are skipped by pointer identity); the mounting layer updates only touched nodes.
2. **No React work for visual state.** Hover, active, focus, focus-visible, focus-within, disabled
   variants and responsive breakpoints are resolved natively. Moving the mouse over 2,000 nodes or
   resizing across a breakpoint causes zero React commits and zero JS→native prop calls.
3. **Incremental paint.** Each element owns retained canvas items in a hierarchy that mirrors the
   view tree. A move updates a transform; only elements whose own visuals or size changed re-record
   commands. Scrolling updates one transform.
4. **One GDExtension call per commit carrying only what changed.** Render makes no native calls. At
   commit, `commit(layer, payload)` (exposed to JS automatically by GodotJS) receives the created
   nodes, the per-node prop diffs and the changed child lists, and nothing else (decision D2).
5. **No regressions.** Every existing verifier passes with unchanged assertions.

### 2.2 Goals — part B: interaction

1. **Godot-cooperative events.** Empty or `pointer-events: none` UI regions let pointer events
   through to Godot `Control`s underneath and to `_unhandled_input`. Keyboard input belongs to the
   game unless a React element has focus. Unconsumed wheel events reach the game.
2. **HTML-like event semantics.** Capture and bubble, `stopPropagation()`, `preventDefault()` that
   cancels native default actions and tells Godot the event was handled; pointer ids, types, buttons,
   modifiers; DOM `key`/`code`.
3. **Touch** as first-class pointers without double handling from Godot's touch-to-mouse emulation.
4. **Focus**: `tabIndex`, `autoFocus`, `focus()`/`blur()`, `:focus-visible`, focus traps in JS.
5. **Positioning and overlays**: `position` (`relative|absolute|fixed`), insets, `zIndex`, an
   overlay layer for popovers and dialogs.
6. **Scroll containers**: per-axis `overflow: scroll|auto`, wheel/trackpad/touch/keyboard scrolling,
   chaining, overlay scrollbars, `onScroll`, programmatic scrolling, scroll-into-view.
7. **Text selection** with `user-select: text`, opt-in.
8. **Text input**: `<TextInput>` single and multi-line, owned natively, with caret, selection, IME,
   Web/mobile virtual keyboard, clipboard, undo/redo, React Native's controlled-input protocol.
9. **Component kit** from primitives: Checkbox, Switch, RadioGroup, Slider, Select, TextField,
   ScrollView.
10. **HTML-style drag and drop** inside a root, with a usable result when a drag ends outside the UI.
11. **Accessibility** through Godot's `AccessibilityServer` sub-elements.
12. **World-space UI**: a verified recipe for a root inside a `SubViewport` on a 3D quad.

### 2.3 Non-goals

Write these into the README limits when the plan is complete; do not half-implement them:

- A JSI-style binding that bypasses GodotJS's ordinary method marshalling. Revisit only if Phase F4
  measurements show the GDExtension call boundary is the bottleneck.
- Child Godot `Control`s per element, including `LineEdit`/`TextEdit` (see 3.2).
- A custom engine module. If a Web engine bug is proven, fix it in `~/Development/godot/platform/web`,
  not with an export-time patch, and only after reporting it.
- Godot drag-and-drop interop with other `Control`s (3.19 explains why).
- Raw text outside `<Text>` (React Native's rule), rich/nested text runs, `contenteditable`.
- CSS stacking contexts: `zIndex` orders siblings, as in React Native (3.15).
- Touch text-selection handles, long-press menus, native context menus, spellcheck.
- Animated programmatic scrolling, overscroll bounce, `position: sticky`, transforms, rounded clip
  masks, native list virtualization.
- Pen-specific pointer data (pen input is reported as `mouse`).

---

## 3. Architecture

### 3.1 Fabric mapping

| React Native Fabric | godot-react-ui v2 |
| --- | --- |
| Reconciler in persistent mode | `react-reconciler` 0.33 with `supportsPersistence: true`, `supportsMutation: false` |
| JSI host object owning a `ShadowNode::Shared` | a frozen JS `Instance` object (decision D2). Instances are immutable once React completes them and share unchanged children by reference; JS GC reclaims them with no native memory attached |
| `UIManager.createNode` / `cloneNodeWithNewProps` / `cloneNodeWithNewChildren(AndProps)` / `appendChild` during render | pure JS in the host config: no native call during render, so abandoned concurrent renders cost nothing natively |
| `createChildSet` / `appendChildToSet` / `completeRoot(rootTag, childSet)` | a JS array of instances, then one `commit(layer, payload_json)` call |
| `RawProps` (a JSI object) parsed into typed C++ `Props` | a JSON object of changed props per node inside the commit payload, merged natively over the node's previous typed `PropsSpec`. GodotJS cannot pass a plain JS object as a `Dictionary` (it only accepts an existing Godot Dictionary wrapper, `modules/GodotJS/bridge/jsb_type_convert.cpp:284-305`), and arrays of objects cost 0.7–1.9 µs per element to marshal (F0), so the payload crosses as one string |
| `ShadowTree` commit with revisions | the JS committed tree (`committedByTag`) plus the native mounted tree; `commit` validates the whole payload before changing anything |
| Differ → `ShadowViewMutation` list | split in two: the JS commit walk finds changed nodes by identity (`===`) in time proportional to the changed paths; native diffs each changed child list against the mounted children and produces a `MountingTransaction` (`Create`, `Delete`, `Insert`, `Remove`, `Update`) |
| Mounting layer creating platform views | mounting layer keyed by tag: Taffy node, computed style, Stylo node, paint resources, canvas items, interaction state |
| Yoga layout on the shadow tree | Taffy on the mounting layer's retained layout tree (deviation: layout runs after the diff, keyed by tag; Taffy caches clean subtrees) |
| Native `State` (scroll offset, text input content) | per-tag interaction state in the mounting layer that survives clones |
| `EventEmitter` → JS dispatch | the Phase 1 synchronous `events_ready` dispatch; events carry their native propagation path |
| View commands (`setTextAndSelection`, `scrollTo`) | `#[func]` commands addressed by tag |
| `StyleSheet.flatten` in JS | JS compiles `className` + `style` once per distinct input into ordered rule layers; native resolves conditions and inheritance |

### 3.2 Invariants (binding)

1. **One `Control` per root.** No per-element `Node`, `Control`, `LineEdit` or `TextEdit`. Every
   primitive `LineEdit` uses is exposed to GDExtension (section 7.3); a child `Control` would escape
   the draw order and clipping of the canvas-item hierarchy and would take Godot key focus.
2. **Native owns** the shadow trees, the mounting layer, layout, computed styles, hit testing, focus,
   pointer state, scroll offsets, text buffers, selections, drag sessions and accessibility elements.
   **JS owns** React state, handlers, and the decision to `preventDefault()`.
3. **JS instances are immutable once React completes them.** `appendInitialChild` only runs on an
   instance React is still building; nothing mutates a completed instance (freeze them in development
   builds of the renderer so a violation throws).
4. **Every JS→native call validates its input** and reports errors without changing committed state.
   A rejected `commit` leaves the previous tree mounted. Internal invariants of native data the native
   code produced itself (the child-list differ's output) are `expect`ed, not validated.
5. **Tags** are JS-allocated `u32`s, unique per root for the root's lifetime; a tag is the identity
   of a node across all its clones.
6. **No whole-tree work on commit.** Any loop over all mounted nodes in a commit path is a bug,
   except where this plan names it (Tab order, accessibility updates, snapshots, and the intrinsic-size
   probe noted in section 8).
7. **Main thread only.** No threads, no deferred calls for correctness.

### 3.3 The pipeline

```
React render (JS)            createInstance / cloneInstance / appendInitialChild
  │                          → new frozen JS instances for changed nodes only; no native calls
React commit (JS)            replaceContainerChildren(container, childSet)
  │                          → commit walk: skip instances === committed; collect created nodes,
  │                            prop diffs, changed child lists
  │                          → commit(layer, payload_json)                 (one call per layer per commit)
Native commit                validate the whole payload; diff each changed child list against the
  │                          mounted children → MountingTransaction
Mount                        apply Remove, Delete, Create, Update, Insert to the mounting layer;
  │                          mark style/layout/paint dirt per node
Style resolution             recompute computed styles for dirty nodes (and descendants whose
  │                          inherited inputs changed); feed Stylo; mark layout/paint dirt
Layout                       Taffy compute_layout if the root is dirty
Geometry                     walk only regions whose layout may have changed (3.7); update transforms,
  │                          clips, rects
Paint                        re-record only canvas items whose own visuals or size changed
Events                       hover re-hit-test if geometry under the mouse changed; queue events
```

Everything above runs synchronously inside `commit`, so `useLayoutEffect` and ref measurements after
a commit see the new layout (as in Fabric's synchronous commits).

Outside commits, native-only changes (hover/focus state, viewport resize, scroll, transitions, text
editing) enter the same pipeline at **Style resolution** or **Geometry** without any JS involvement.

### 3.4 Shadow tree and commit payload (decision D2)

The persistent shadow tree is the tree of JS `Instance` objects (3.9). Native holds no shadow nodes;
it holds the mounted tree (3.7). The commit payload is the only thing that crosses:

```ts
// src/native.ts — serialized with JSON.stringify, one string per commit per layer
interface CommitPayload {
  created: { tag: number; kind: NativeKind; props: NativeProps }[];  // full native props of new tags
  updated: { tag: number; props: NativePropsDiff }[];                // changed keys only; null resets
  children: { tag: number; children: number[] }[];                   // every node whose child list
                                                                     // changed, and every created node
                                                                     // with children; tag 0 = layer root
}
```

```rust
// native/commit.rs (Godot-free)
pub struct CommitPayload { pub created: Vec<CreatedNode>, pub updated: Vec<UpdatedNode>, pub children: Vec<ChildList> }
pub fn validate(payload: &CommitPayload, mounted: &impl MountedTree) -> Result<ValidatedCommit, CommitError>;
pub fn plan(validated: &ValidatedCommit, mounted: &impl MountedTree) -> MountingTransaction;
```

- **Validation before any change** (O(payload) plus O(depth) per moved child): created tags must be
  new for this root's lifetime and unique; updated tags must be mounted (or created in this payload)
  and may not change kind; every child tag must be mounted or created; after applying, each tag has at
  most one parent and no node is its own ancestor (walk the new parent chain); `Text` and `TextInput`
  have no children; every created node must end up attached or the commit is rejected; props diffs
  merge into valid `PropsSpec`s. Any failure returns an error and leaves the mounted tree unchanged.
- **Planning** turns each changed child list into `Remove`/`Insert` against the mounted children (3.7);
  a removed tag that is not re-inserted anywhere in the same payload is `Delete`d with the mounted
  descendants still under it.
- Kinds and rules: `Text` carries its string in the `text` prop and has no children (React Native's
  rule: raw strings must be inside `<Text>`; the renderer's `createTextInstance` throws). `TextInput`
  has no children. `Button` renders its label through a child `Text`.

### 3.5 Props: authored values, diffs, transport

- **Native props** are the subset of React props that native needs: `style` (compiled rule layers,
  3.6), `text`, `disabled`, `hidden` (Suspense), `testID`, and the feature props each phase adds
  (`tabIndex`, `autoFocus`, `draggable`, text input props, `role` and `aria*`). Event handlers and
  everything else stay in JS. `src/props.ts` holds the table of native props; anything not in it is
  JS-only.
- **Diff.** The commit walk compares each changed instance's native props with the committed
  instance of the same tag, key by key (compiled style objects compare by identity because the
  compiler interns them). A diff is an object of changed keys; `null` resets a key to its default.
  Native merges it over the node's previous `PropsSpec` and validates the result (unknown keys and
  invalid values are errors). A handler-only change produces no diff and no payload entry.
- **Transport.** One JSON string per commit per layer containing only changed nodes, parsed by
  `serde_json`. F0 measured a 3-key diff at 0.84 µs (native) and 3.1 µs (Web) to cross and parse, and a
  40-property style at 5.3 µs and 20 µs. This is the `RawProps` analog; there is no whole-state
  message. If the string boundary is ever the bottleneck (F4 measures it), that is the trigger for the
  deferred binding work in 2.3.

### 3.6 Native style resolution

- **Compilation (JS, cached).** `compileStyle(className, style)` turns a class string and inline
  style (object or nested arrays) into `CompiledStyle { layers: StyleLayer[] }`, where
  `StyleLayer = { minWidth?: number; states?: PseudoState[]; style: Style }`. Shorthands
  (`padding`, `margin`, `gap`, `overflow`, `inset`) are expanded to longhands at compile time so
  native merging is a plain ordered overwrite, matching today's `mergeStyle` (`src/styles.ts`).
  Unknown classes still throw at compile time. Results are interned by a canonical key so equal inputs
  return the identical object. `PseudoState = 'hover' | 'active' | 'focus' | 'focusVisible' |
  'focusWithin' | 'disabled'`.
- **Resolution (native).** A node's computed style = its parent's computed inherited properties, then
  each layer in order whose conditions hold (`viewport width >= minWidth` and every listed state is
  set). Inherited properties: `color`, `fontSize`, `textAlign`, `pointerEvents`, `cursor`,
  `userSelect`, `selectionColor`, `caretColor`, `placeholderColor`, `scrollbarColor`,
  `interpolateSize` (today resolved by walking ancestors, `effective_interpolate_size`).
- **State semantics** (CSS): `hover` and `active` apply to the target and all its ancestors (mouse
  hover only; 3.12); `focus` and `focusVisible` apply to the focused element only; `focusWithin`
  applies to the focused element and its ancestors; `disabled` is the node's own `disabled` prop.
  Today's JS sets `focus` on every ancestor of the focused element; v2 moves that behaviour to the new
  `focus-within:` variant. Record any existing demo or verifier that relied on the old behaviour and
  switch it to `focus-within:`.
- **Dirty propagation.** A node's computed style is recomputed when its props change, a state it
  conditions on changes, the viewport crosses a `minWidth` it uses, or its parent's computed inherited
  values change. Recursion into children stops where a child's inherited inputs are unchanged. Keep an
  index from breakpoint thresholds to the nodes that use them so a resize touches only those nodes.
- **Consumers.** A computed-style change updates, as needed: the Taffy style (layout properties), the
  paint resources (paint properties), and the Stylo node (transition targets). `StyleEngine`
  (`native/style_engine.rs`) becomes incremental (`insert`, `update`, `remove`, `move` by tag) with
  the same Stylo semantics; `verify:motion` is the regression net.

### 3.7 Mounting layer

```rust
// native/mount.rs (Godot-dependent glue around Godot-free data)
pub struct MountedNode {
    pub tag: u32,
    pub kind: Kind,
    pub props: Rc<PropsSpec>,
    pub parent: Option<u32>,            // None for a layer's top-level nodes
    pub children: Vec<u32>,
    pub computed: ComputedStyle,
    pub layout: taffy::NodeId,
    pub visual: Visual,                 // StyleBoxFlat, TextParagraph, colours (existing type)
    pub render: RenderNode,             // canvas items, 3.8
    pub geometry: NodeGeometry,         // size, location relative to paint parent, clip, absolute rect cache
    pub state: InteractionState,        // scroll offset, edit buffer, ... (per tag, survives clones)
}
```

- `MountingTransaction` application order: `Remove` (detach from parents), `Delete` (free Taffy,
  Stylo, canvas items, accessibility element; clear focus/hover/capture/selection references),
  `Create`, `Update` (props → style dirt), `Insert` (attach at index). This replaces `Model`,
  `apply_batch`, `sync_model`, and the flat `rects`/`clips`/`paint_order` maps.
- **Validation** of the whole payload happens before any change (3.4).
- **Child list diff** (per entry in `payload.children`, against the mounted children of that tag):
  common prefix and suffix by tag are stable. For the middle, children present in both lists that keep
  relative order (longest increasing subsequence of old indices) stay; others are `Remove`d and
  `Insert`ed. Tags created in this payload are `Create`d and `Insert`ed; old children not present are
  `Remove`d, and `Delete`d with their remaining mounted descendants if no other entry re-inserts them.
- **Incremental geometry.** After `compute_layout`, walk from each layer root; for each node compare
  the new Taffy layout with the stored geometry; descend into children only if the node is an
  ancestor of a node marked layout-dirty in this pass, or its size changed. A clean subtree with an
  unchanged size has an unchanged internal layout (identical Taffy inputs), and a location change is
  absorbed by that node's transform.
- **Hit testing** descends the hierarchy from the top layer: children in reverse paint order, point
  transformed into child coordinates (subtracting location, adding scroll offset), rejecting outside a
  clipping ancestor's clip. `pointerEvents: none` skips the node itself but still descends into its
  children (CSS semantics). The cost is proportional to depth × siblings examined, not to tree size.
- **Absolute rects** (snapshots, `getRect`, accessibility bounds) are computed by walking up the paint
  parents, cached per node, and invalidated with geometry.
- Interaction state keyed by tag persists across clones and is dropped on `Delete`.

### 3.8 Render tree (canvas-item hierarchy)

Each mounted element owns retained `RenderingServer` canvas items arranged like a view hierarchy:

```
box        transform = location relative to paint parent; modulate alpha = opacity;
           custom rect = own bounds (culling); draws background and border
└─ content clip = padding box when overflowX/Y != visible (TextInput: always); draws text,
           │      selection, IME underline and caret, in that order
           └─ scroll   (scroll containers only) transform = −scroll offset; children attach here
           └─ child box items (non-scrollers)
└─ overlay (scroll containers only) draws scrollbar thumbs after the subtree
```

- **Paint parent**: the parent's `content` (or `scroll`) item, except `position: absolute` attaches to
  its containing block's item (nearest positioned ancestor, else the layer root) and
  `position: fixed` attaches to the layer root. An absolute element whose containing block is outside
  an `overflow-hidden` ancestor therefore escapes that clip and that scroller, which is CSS's rule.
- **Sibling order**: draw index = rank by (`zIndex` default 0, document order). `zIndex` orders
  siblings under the same paint parent only, as in React Native.
- **Layers**: layer 0 is the main tree, layer 1 the overlay tree used by `<Portal>`. Each layer has a
  root canvas item parented to `ReactUiRoot`'s canvas item; the overlay root draws last and is
  hit-tested first. The focus ring and the drag ghost use a top-most item above both.
- **Re-recording**: `box` when size or box paint changes; `content` when text, text paint, content
  width (wrapping), selection or caret changes. Moves change transforms only; opacity changes modulate
  only. Godot redraws changed items without `queue_redraw()` on the `Control`.
- `canvas_item_set_clip` clips an item's own drawing and its children, which is how `Control`'s
  `clip_contents` clips child controls; the `content` item's clip rect is in its own coordinates.
- `Control::draw()` no longer paints elements (it may stay empty or be removed).

### 3.9 JS renderer (persistent host config)

`src/renderer.ts` is rewritten as a persistent host. Verified against
`node_modules/.pnpm/react-reconciler@0.33.0_react@19.2.0/node_modules/react-reconciler/cjs/react-reconciler.development.js`:
`updateHostComponent` calls `cloneInstance(currentInstance, type, oldProps, newProps, keepChildren,
null)` and, when children changed, appends them again with `appendInitialChild` (lines 9940-9970);
`updateHostContainer` builds a child set with `createContainerChildSet`/`appendChildToContainerChildSet`
and calls `finalizeContainerChildren` (lines 9930-9939); the commit calls `replaceContainerChildren`
for the root and for portals (lines 11370-11380, 12350-12365); a changed host text gets a brand-new
text instance (lines 10282-10300), which is why text travels as a prop instead.

```ts
interface Instance {               // one per clone; never mutated after React completes it
  readonly tag: number;
  readonly kind: NativeKind;
  readonly props: UIProps;         // full React props (handlers included)
  readonly native: NativeProps;    // the native subset (compiled style interned), for diffing
  readonly children: Instance[];   // filled by appendInitialChild while building; shared by reference
}
```

No host config method calls native during render.

| Host config | Behaviour |
| --- | --- |
| `createInstance(type, props, root)` | allocate tag; build `native` from props; new public handle for the tag |
| `createTextInstance` | throw `Text strings must be rendered within a <Text> component` |
| `shouldSetTextContent(type, props)` | `type === 'text'` and children are scalar |
| `appendInitialChild(parent, child)` | push to `parent.children` (parent is still being built) |
| `finalizeInitialChildren` | `false` (autoFocus is native) |
| `cloneInstance(inst, type, oldProps, newProps, keepChildren)` | new `Instance` with the same tag, new `props`/`native`, and `children` = `inst.children` when `keepChildren`, else a fresh array that React fills with `appendInitialChild` |
| `cloneHiddenInstance` / unhide | clone with `hidden: true` / `false` in `native` |
| `cloneHiddenTextInstance` | unreachable (no text instances); throw |
| `createContainerChildSet` / `appendChildToContainerChildSet` | a plain array of instances |
| `finalizeContainerChildren` | nothing |
| `replaceContainerChildren(container, set)` | run the commit walk, call `commit(container.layer, JSON.stringify(payload))`, throw its error if any, then apply the walk's map updates and native deletions |
| `getPublicInstance` | the per-tag public handle (stable across clones) |
| `cloneMutableInstance`, `cloneMutableTextInstance` | read where 0.33 calls them (`react-reconciler.development.js:16979-16984`); implement if reachable with our configuration, else record why not |

**Commit walk** (pure function, `src/commit.ts`): `buildCommit(committedByTag, previousRootTags,
newRootChildren) -> { payload, updates }`. Visit the new root children recursively; an instance
identical (`===`) to `committedByTag.get(tag)` is skipped with its whole subtree. Otherwise: a tag not
yet committed goes into `created` (full native props), a committed tag whose native props differ goes
into `updated` (the diff), and if its child tag list differs from the committed instance's (or it is
new and has children) it goes into `children`; then visit its children. The layer root's child tag list
is compared with `previousRootTags` (entry tag 0). Persistent mode clones every ancestor of a changed
node, so the walk visits only changed paths. `updates` (new `committedByTag` entries) is applied only
after `commit` succeeds; `take_commit_deletions()` then gives the tags to drop from `committedByTag` and
the public-handle map. Event dispatch and public handles read `committedByTag`; nothing reads React
fibers. A rejected commit throws at the React commit boundary (the existing `container.failure` path).

**Removed.** `flush()`, the `committed` style-key map, the `Container`/`Instance` parent links,
`applyBatch`, `refreshStyles` (breakpoints are native), and JS pseudo-state flags. `findByTestID`
becomes a native query.

### 3.10 Events

The Phase 1 design stays: input-originated events are dispatched to JS synchronously through the
`events_ready` signal from inside `gui_input`, JS calls `resolveEvent` for cancelable events before
the signal returns, and native runs default actions only if not prevented. Evidence: godot-rust 0.5.5
re-entrancy through `base_mut()` (`godot-core-0.5.5/src/obj/traits.rs:456-524`), verified at runtime
in Phase 1 including a handler that unmounted the root, detached it from the tree, and removed its own
target.

Rules (all **must**):

1. Only input-origin entry points emit `events_ready`: `gui_input`, `OS_IME_UPDATE`, `_set_text`,
   accessibility action callbacks. Calls from JS (`commit`, commands) and lifecycle
   notifications queue events for the next emit or for the owner's per-frame `dispatchEvents()`.
2. `dispatch_depth` guards nesting: input arriving while JS is inside a dispatch is queued with
   `cancelable: false`.
3. After the emit, everything computed before it is stale: look nodes up again and skip the default
   action if its target is gone. Lookups return `Option`; nothing indexes a map with a possibly removed
   tag (Phase 1 found `model.nodes[&id]` panics in `enabled_button_ancestor` and `disabled`).
4. If the root left the tree during the emit, stop.
5. `resolve_event` is valid only for the awaited seq; anything else is an error.
6. A throwing handler does not break the drain loop; errors are rethrown after it.
7. The drain loop is bounded (`MAX_EVENT_DRAIN_ROUNDS`).
8. **Propagation path from native.** Each event carries `path`: the tags from the target up to its
   layer's top-level node. JS resolves each tag through `committedByTag` and dispatches capture
   (outermost first), then bubble (target first), then root listeners. Pseudo-states are native, so
   JS no longer tracks hover/active/focus flags.
9. Events stay JSON strings from `drain_events()` (small, already validated by `src/native.ts`;
   measured above).

### 3.11 Godot co-operation contract

| Godot input | Reaches `ReactUiRoot` when | Consumed (the game does not see it) when |
| --- | --- | --- |
| Mouse button/motion, `ScreenTouch`, `ScreenDrag`, gestures | `_has_point(p)` is true: the native hit test finds an element at `p` whose computed `pointerEvents` is `auto`. During a press Godot keeps routing to the pressed control (`gui.mouse_focus`, `gui.touch_focus`). | Always, once it reaches the root: `MOUSE_FILTER_STOP` marks pointer events handled (`viewport.cpp:1764`). Pass-through is decided only by `_has_point`. |
| Wheel, `InputEventPanGesture` | same as pointer | Only if JS prevented `wheel` or a scroll container scrolled. The root sets `force_pass_scroll_events = true` and calls `accept_event()` itself. |
| Keys | the root has Godot key focus (`viewport.cpp:2313`). The root takes key focus only when a React element is focused, a text selection starts, or the owner calls `grabFocus()`. | Only if JS prevented `keydown`/`keyup`, or a native default action ran (focus moved, button pressed or activated, text edited, scrolled, copied, drag cancelled). |

- **No focus stealing**: `ready()` does not call `grab_focus()`; owners that want keyboard-first
  behaviour (the demo) call `surface.grabFocus()` after mounting.
- Pressing a non-focusable element (and not starting a selection) clears element focus and releases
  Godot focus if the root had it.
- Transparent elements still catch pointers, as in HTML. Full-screen HUD containers use
  `pointer-events-none`; interactive children use `pointer-events-auto`.

### 3.12 Pointer model

- **Ids**: mouse `1`; touch `TOUCH_POINTER_ID_BASE + touch index`; `0` for synthetic keyboard
  activation (`click` from Enter/Space has `pointerType: ""`, `pointerId: 0`, `detail: 0`).
- **Emulation rule**: ignore every input event whose `device == InputEvent.DEVICE_ID_EMULATION` (`-1`)
  (`core/input/input.cpp:926`); handle real `InputEventScreenTouch`/`ScreenDrag` as touch pointers.
  The Web platform `preventDefault()`s touch events (`library_godot_input.js:596`), so browsers add no
  compatibility mouse events either.
- **Buttons**: DOM `button` 0 left, 1 middle, 2 right, 3 back, 4 forward, −1 for moves; DOM `buttons`
  1, 2, 4, 8, 16 mapped explicitly from Godot's `MouseButtonMask` bits 1, 2, 4, 128, 256
  (`native/pointer.rs`, Phase 1).
- **Clicks**: `click` for the primary button and touch, `auxclick`, `contextmenu` on right press,
  `dblclick` after the second `click`; `detail` counted natively (Appendix A). The shared-button rule
  (padding and label of one enabled button activate it) stays.
- **Hover**: only the mouse sets the `hover` state; touch dispatches enter/leave on down/up but never
  sets `hover` (no sticky hover).
- **Enter/leave**: one native `pointerleave` (target old, `relatedTarget` new) and one `pointerenter`
  (target new, `relatedTarget` old); JS dispatches to each element leaving or entering the chain below
  the common ancestor, non-bubbling (Phase 1).
- **Capture**: `handle.setPointerCapture(pointerId)` while the pointer is down retargets its
  move/up/cancel; touch pointers are implicitly captured to their `pointerdown` target.
- **Cancel**: `pointercancel` when a touch pan becomes a scroll, a drag starts, the OS cancels the touch,
  or the root leaves the tree; no `click` follows.
- **Gesture arbitration** after an un-prevented primary `pointerdown`: (1) JS took capture → none;
  (2) mouse on a scrollbar thumb → thumb drag; (3) inside a `draggable` element: mouse beyond
  `Viewport.get_drag_threshold()` or touch held `TOUCH_DRAG_HOLD_MS` within `TOUCH_SLOP_PX` → drag and
  drop; (4) touch beyond `TOUCH_SLOP_PX` where the computed `touchAction` allows panning that axis and
  a scroll container can scroll that way → pan (`pointercancel` to JS); (5) mouse on selectable text →
  selection drag; (6) plain pointer events.

### 3.13 Focus

- Focusable: `Button`, `TextInput`, and any element with `tabIndex` (`0` or `-1` only; other values are
  validation errors). Tabbable: focusable, `tabIndex` 0, not disabled (self or ancestor), visible.
- Tab order is document order (pre-order of the mounted tree), never paint order. Tab and Shift-Tab
  wrap, as today; Tab is accepted only when focus moved.
- An un-prevented primary `pointerdown` focuses the nearest focusable ancestor-or-self, else 3.11.
- Native tracks input modality; focus from Tab, or from `focus()` while the modality is keyboard, is
  focus-visible. The native focus ring is drawn only for focus-visible focus.
- `handle.focus({focusVisible?})`, `handle.blur()`; focusing a non-focusable element is an error and
  `focus()` grabs Godot key focus. `autoFocus` focuses the first newly mounted `autoFocus` element in
  document order of a commit.
- Focus traps and roving focus are JS components (`onKeyDown` + `preventDefault()` + `focus()`).
- Godot `FOCUS_EXIT` blurs the focused element.

### 3.14 Keyboard

- `keydown` and `keyup` go to the focused element, or to root listeners when the root has Godot focus
  and no element is focused (target `0`, empty path).
- Echo events arrive as `keydown` with `repeat: true`. Button activation ignores repeats.
- `key`/`code` follow the DOM (Appendix B); modifiers `shiftKey`, `ctrlKey`, `altKey`, `metaKey`.
- Default actions run only if not prevented. Text editing uses Godot's `ui_text_*`, `ui_copy`,
  `ui_cut`, `ui_paste`, `ui_undo`, `ui_redo` InputMap actions exactly as `LineEdit`/`TextEdit` do
  (Appendix C).
- Button activation: press on Enter/Space `keydown`, `click` on the matching `keyup`. No fabricated
  pointer events; the `active` state is native.

### 3.15 Positioning, z-order and overlays

- `position: static|relative|absolute|fixed` and `top/right/bottom/left` (number, `%`, `auto`) map to
  Taffy, which implements containing blocks at the pinned revision
  (`~/.cargo/git/checkouts/taffy-bd4586f5551dc460/fca167c/src/style/mod.rs:354-385`).
- Clipping and scrolling of out-of-flow boxes follow from the paint-parent rule in 3.8.
- `zIndex` orders siblings under one paint parent (React Native semantics). Popovers, menus, dialogs
  and toasts render through `<Portal>` into the overlay layer, which always covers the main layer.
- `get_node_rect(tag)` gives root-local rects for anchoring overlays.

### 3.16 Scroll containers

- Wire longhands `overflowX`, `overflowY`: `visible|hidden|scroll|auto` (the authoring shorthand
  `overflow` is expanded by the compiler). Taffy gets `Overflow::Scroll` for `scroll|auto` with
  `scrollbar_width = 0.0` (overlay scrollbars; zero width behaves like `Hidden` for layout,
  `…/src/style/mod.rs:467-470`).
- Range from Taffy: `Layout::scroll_width()` / `scroll_height()` (`…/src/tree/layout.rs:799,814`);
  reversed axes (`scrollable_overflow_rect.is_reversed()`) use `-range..=0`. Offsets are per-tag
  native state, re-clamped after layout; changing one updates the `scroll` item's transform and the
  hit-test offset, nothing else.
- Wheel scrolls `client size / SCROLL_PAGE_DIVISOR × factor`; pan gestures `client size × delta /
  SCROLL_PAGE_DIVISOR`, mirroring `ScrollContainer` (`scene/gui/scroll_container.cpp:190-226,311-318`,
  `ScrollBar::PAGE_DIVISOR = 8`, `scene/gui/scroll_bar.h:116`). Shift+wheel scrolls horizontally.
- Chaining to the next scrollable ancestor unless `overscrollBehavior: 'contain'`; unconsumed and
  unprevented wheel is not accepted.
- Touch pan per 3.12 rule 4 with momentum mirroring `ScrollContainer`'s `drag_touching_deaccel`
  (`scroll_container.cpp:569-610`).
- Keyboard scrolling of the focused element's nearest scroll container (arrows, Page, Home/End,
  Space) as the `keydown` default action, except inside text inputs (`scroll_container.cpp:450-480`).
- Overlay scrollbar thumbs in the `overlay` item, `scrollbarWidth: auto|none`, `scrollbarColor`,
  mouse thumb dragging.
- `scroll` events (non-bubbling, coalesced per container per frame), `scrollTo`, `scrollBy`,
  `scrollIntoView` commands, and minimal scroll-into-view on keyboard or programmatic focus.

### 3.17 Text model and selection

- Godot `String` and `TextServer` positions are code point indices; edit buffers are `Vec<char>`.
  **Every offset crossing to JS is a UTF-16 code unit index**; `text_offsets.rs` owns the conversions.
- `TextLayout` (`text_layout.rs`) answers hit test (`TextParagraph.hit_test`), caret rectangles
  (`TextServer.shaped_text_get_carets` on `get_line_rid`), selection rectangles
  (`shaped_text_get_selection` per line), word bounds (`shaped_text_get_word_breaks`), grapheme steps.
  Line origins replicate `TextParagraph::draw` (`scene/resources/text_paragraph.cpp:841-940`).
- `userSelect: none|text`, inherited, default `none`. Selection starts only on `Text` nodes outside
  `Button`s. Model: anchor and focus `(tag, offset)` in document order. Mouse: click collapses, double
  click selects a word, triple click the node's text, drag extends, Shift+click extends. Starting a
  selection grabs Godot focus for the root. `ui_copy` copies (nodes joined by `\n`),
  `ui_text_select_all` selects all selectable text. A text change in the range clears the selection.
  `selectionchange` to root listeners; `root.getSelection()` queries native. `selectionColor`.

### 3.18 Text input

`<TextInput>` (kind `textinput`, `multiline` prop for multi-line). Text lives in a native per-tag
`EditBuffer`, not in props.

- **Rendering** in the `content` item (always clipped): value, bullets for `secure`, or placeholder;
  selection; IME preedit; caret blinking at `CARET_BLINK_INTERVAL_MS` (`LineEdit` default,
  `scene/gui/line_edit.h:200`). Single-line scrolls horizontally to keep the caret visible;
  multi-line wraps and scrolls vertically with wheel chaining.
- **Intrinsic size never depends on the value**: width `TEXT_INPUT_DEFAULT_COLUMNS` × the advance of
  `"0"` at the computed font size; height one line or `rows` lines (`TEXT_AREA_DEFAULT_ROWS`).
- **Editing pipeline** for an un-prevented `keydown`: resolve an `EditCommand` from InputMap actions
  (Appendix C) or, with no Ctrl/Alt/Meta and `unicode >= 32`, `InsertText` (the `LineEdit` rule,
  `scene/gui/line_edit.cpp:1053-1073`); dispatch `beforeinput` (cancelable); if not prevented, apply
  (respecting `readOnly`, `maxLength` in UTF-16 units), push undo, increment the input's
  `eventCount`; queue `input {value, inputType, data, selectionStart, selectionEnd, eventCount}` and
  `selectionchange`.
- **Controlled values: React Native's protocol.** `defaultValue` is a prop applied when the node is
  created. The `TextInput` component tracks the last native text and event count from `input` events;
  in `useLayoutEffect`, if `props.value` is defined and differs from the last native text, it calls
  `handle.setTextAndSelection(eventCount, value, start?, end?)` (RN's `setTextAndSelection` view
  command). Native applies it only if `eventCount` equals its current count; a stale command (the user
  typed again first) is ignored, and the next `input` event lets JS reconcile again. Applying replaces
  the buffer, puts the caret at the end unless a selection is given, clears composition and undo
  history.
- **IME**: on focus `window_set_ime_active(true)` and `window_set_ime_position(screen caret)` as
  `LineEdit::_update_ime_window_position` (`line_edit.cpp:134-147`); off on blur
  (`line_edit.cpp:124-131`). `OS_IME_UPDATE` reaches every node (`scene/main/scene_tree.cpp:922-932`);
  read `ime_get_text()`/`ime_get_selection()` as `line_edit.cpp:1694-1713`, render preedit, queue
  `compositionstart/update/end`. Committed text arrives as key events.
- **Virtual keyboard**: on focus, if `has_feature(FEATURE_VIRTUAL_KEYBOARD)`,
  `virtual_keyboard_show(text, global rect, type, maxLength, selStart, selEnd)`; hide on blur. On Web
  the hidden DOM input reports the whole text through `Viewport::_push_text_input`, which calls a
  method named `_set_text(text, emit_signal)` on the key-focus `Control`
  (`scene/main/viewport.cpp:2856-2868`), then synthetic RIGHT presses place the caret
  (`platform/web/display_server_web.cpp:801-823`). `ReactUiRoot` implements `_set_text` as an
  `insertReplacementText` edit with the caret at 0, like `LineEdit::_set_text`
  (`line_edit.cpp:2126-2142`). On Web, IME and virtual keyboard are mutually exclusive and depend on
  `html/experimental_virtual_keyboard` and touch support (`display_server_web.cpp:1227-1231`,
  `library_godot_display.js:39-41`).
- **Clipboard** through `DisplayServer`; copy/cut disabled for `secure`. Web `clipboard_get` returns a
  cached value refreshed asynchronously (`display_server_web.cpp:1037-1039`); Phase I7 investigates.
- **Undo/redo**: per-input snapshots, `UNDO_LIMIT`, coalesced consecutive `insertText`.

### 3.19 Drag and drop

HTML semantics inside one root: `draggable` prop; `dragstart` (cancelable) → `pointercancel`;
on every move and scroll change, hit test (ignoring `pointerEvents: none`), `drag` on the source,
`dragleave`/`dragenter` on target change, `dragover` (cancelable; prevented ⇒ drop allowed with the
outcome's `dropEffect`); release → `drop` (cancelable) if allowed, then `dragend` with `dropEffect`,
root-local and viewport coordinates and `endedOutsideRoot`. Escape or root exit cancels. `DataTransfer`
in JS with HTML protection modes. Cursor shapes while dragging. Ghost: `dragPreview: 'native' | 'none'`;
the native ghost re-records the source's box/content commands into the top-most item, translucent,
following the pointer. Edge auto-scroll.

Godot `Control` interop is a non-goal: Godot calls `_can_drop_data` on `&self` synchronously during
routing, where a JS decision cannot be made without a mutable re-entrant borrow. `endedOutsideRoot`
plus viewport coordinates is enough for game-world drops.

### 3.20 Cursor

`cursor` (inherited, computed natively). `get_cursor_shape(at)` maps the hit element's computed cursor
(Appendix A). Defaults: text inputs and selectable text `text`, otherwise `default`; drag overrides.

### 3.21 Accessibility

Follow `ItemList` (`scene/gui/item_list.cpp:1315-1365`, `get_focused_accessibility_element` at
`item_list.cpp:1236`): on `NOTIFICATION_ACCESSIBILITY_UPDATE`, ensure one sub-element per exposed node
under the nearest exposed ancestor's element; set role, name, bounds, flags, values, actions bound to
the node's tag. Exposed: `Button`, `TextInput`, `Text` with text, scroll containers, explicit `role`.
`ariaHidden` removes a subtree. Free on `Delete`; forget all on `ACCESSIBILITY_INVALIDATE`;
`queue_accessibility_update()` after commits, focus and geometry changes. The update is a whole-tree
walk by design (Godot asks for it).

### 3.22 Coordinates and world space

Root-local logical pixels, origin top-left, `+y` down, identical to Godot `Control`. Events also carry
`viewportX/viewportY`. 3D surfaces: root in a `SubViewport`, viewport texture on a quad, input
forwarded by analytic ray–plane intersection (Breaka's Web engine has no 3D physics) and
`subViewport.pushInput(event, true)`. Anchored 2D UI: `Camera3D.unprojectPosition()` → an absolute
element.

### 3.23 Component kit

Built only from `View`, `Text`, `Button`, `TextInput`, events, focus, capture, `Portal` and
transitions. No transforms, images or icon fonts: checkmarks are filled inner boxes; switch thumbs move
by transitioning a spacer's `width`.

### 3.24 Module layout (target)

Rust (`native/`). Inherent `impl ReactUiRoot` blocks may live in any module. Child-module items used
elsewhere need `pub(crate)` (never `pub`). All `#[func]`/`#[signal]` declarations stay in the primary
`#[godot_api]` block in `lib.rs` and delegate.

| Module | Contents | Godot-free? |
| --- | --- | --- |
| `lib.rs` | `ReactUiRoot`, `IControl` impl, `#[func]`/`#[signal]` surface | no |
| `props.rs` | `Kind`, `PropsSpec`, `StyleLayers`, `StyleSpec` longhands, diff merge, validation, Taffy mapping (from today's `protocol.rs`) | yes |
| `commit.rs` | `CommitPayload`, validation, planning (3.4) | yes |
| `diff.rs` | `MountingTransaction`, child-list diff (LIS) | yes |
| `computed_style.rs` | layer resolution, inheritance, dirty propagation, breakpoint index | yes |
| `mount.rs` | `MountedNode`, transaction application, incremental geometry, hit test | mixed |
| `render_tree.rs` | canvas-item hierarchy (replaces `render_items.rs`) | no |
| `events.rs`, `pointer.rs` | Phase 1 event queue, wire types, pointer helpers | yes |
| `focus.rs`, `keymap.rs`, `scroll.rs`, `text_offsets.rs`, `selection.rs`, `text_input.rs`, `drag.rs` | interaction logic | yes |
| `text_layout.rs`, `text_input_godot.rs`, `accessibility.rs` | Godot glue | no |
| `motion.rs`, `style_engine.rs`, `layout.rs`, `paint.rs`, `geometry.rs`, `profile.rs` | existing, adapted to tags | mixed |

TypeScript (`src/`): `native.ts` (host interface, payload types, validating parsers), `renderer.ts`
(persistent host config, drain loop), `commit.ts` (commit walk and payload), `events.ts` (Phase 1 dispatch, rebased on paths),
`props.ts` (native prop table and diff), `styles.ts` (compiler to layers), `types.ts`,
`components.tsx` (`View`, `Text`, `Button`, `TextInput`, `Portal`), `kit/*.tsx`.

---

## 4. Native API (GDExtension surface)

GodotJS exposes every `#[func]` in camelCase (`camel_case_bindings_enabled=true`). Check the exact
names in `demo/typings` after regenerating.

### 4.1 Commit API

| Method | Returns | Notes |
| --- | --- | --- |
| `commit(layer: i64, payload_json: GString)` | `GString` error or empty | validate the whole payload, plan, mount, style, layout, geometry, paint, queue events (3.3, 3.4) |
| `take_commit_deletions()` | `PackedInt64Array` | tags deleted by the last successful commit |

`kind` strings: `view`, `text`, `button`, `textinput`.

### 4.2 Props and style payloads

`PropsSpec` (Rust, `#[serde(rename_all = "camelCase", deny_unknown_fields)]`, every field optional).
A diff is the same shape with any field optionally `null` (reset).

| Field | Type | Phase |
| --- | --- | --- |
| `style` | `StyleLayers` (below) | F1 |
| `text` | string (`Text` only) | F1 |
| `disabled` | boolean | F1 |
| `hidden` | boolean (Suspense) | F1 |
| `testID` | string | F1 |
| `tabIndex` | `0` or `-1` | I3 |
| `autoFocus` | boolean | I3 |
| `defaultValue`, `placeholder` | string (`TextInput`) | I7 |
| `multiline`, `readOnly`, `secure`, `selectOnFocus` | boolean (`TextInput`) | I7 |
| `rows`, `maxLength` | positive / nonnegative integer (`TextInput`; `maxLength` in UTF-16 units) | I7 |
| `keyboardType` | `default\|multiline\|number\|decimal\|phone\|email\|url\|password` (1:1 with `DisplayServer.VirtualKeyboardType`) | I7 |
| `draggable` | boolean | I9 |
| `dragPreview` | `native\|none` | I9 |
| `role`, `ariaLabel`, `ariaDescription`, `ariaValueText`, `ariaPlaceholder` | string | I10 |
| `ariaHidden`, `ariaDisabled`, `ariaExpanded`, `ariaSelected`, `ariaReadOnly`, `ariaRequired`, `ariaModal` | boolean | I10 |
| `ariaChecked` | `true\|false\|"mixed"` | I10 |
| `ariaValueMin`, `ariaValueMax`, `ariaValueNow` | finite number | I10 |
| `ariaLive` | `off\|polite\|assertive` | I10 |

`StyleLayers = { layers: [{ minWidth?: number, states?: ("hover"|"active"|"focus"|"focusVisible"|"focusWithin"|"disabled")[], style: StyleSpec }] }`.
`StyleSpec` is today's style property set (`native/protocol.rs`) in longhand form, minus `disabled`
(now a prop) and minus `overflow` (replaced by `overflowX`/`overflowY`), plus these additions:

| Property | Values | Inherited | Phase | Utilities |
| --- | --- | --- | --- | --- |
| `pointerEvents` | `auto\|none` | yes | I1 | `pointer-events-auto`, `pointer-events-none` |
| `cursor` | `default\|pointer\|text\|move\|grab\|grabbing\|not-allowed\|crosshair\|wait\|progress\|help\|ew-resize\|ns-resize\|nesw-resize\|nwse-resize` | yes | I1 | `cursor-*` |
| `position` | `static\|relative\|absolute\|fixed` | no | I4 | `static`, `relative`, `absolute`, `fixed` |
| `top`, `right`, `bottom`, `left` | number, `%`, `auto` | no | I4 | `top-4`, `inset-0`, `inset-x-0`, `left-1/2`, `-top-2` |
| `zIndex` | integer | no | I4 | `z-0` … `z-50`, `z-[n]`, `-z-10` |
| `overflowX`, `overflowY` | `visible\|hidden\|scroll\|auto` | no | F1 (`visible\|hidden`), I5 (`scroll\|auto`) | `overflow-*`, `overflow-x-*`, `overflow-y-*` |
| `overscrollBehavior` | `auto\|contain` | no | I5 | `overscroll-auto`, `overscroll-contain` |
| `scrollbarWidth` | `auto\|none` | no | I5 | `scrollbar-auto`, `scrollbar-none` |
| `scrollbarColor` | hex | yes | I5 | `scrollbar-[#hex]` |
| `touchAction` | `auto\|none\|pan-x\|pan-y` | no (intersected along the path natively) | I5 | `touch-auto`, `touch-none`, `touch-pan-x`, `touch-pan-y` |
| `userSelect` | `none\|text` | yes | I6 | `select-none`, `select-text` |
| `selectionColor` | hex | yes | I6 | `selection-[#hex]` |
| `caretColor`, `placeholderColor` | hex | yes | I7 | `caret-*`, `placeholder-*` |

Variants in `styles.ts`: `sm: md: lg: xl: 2xl:` (unchanged thresholds), `hover:`, `active:`, `focus:`,
`focus-visible:`, `focus-within:`, `disabled:`, and combinations.

### 4.3 Events

Phase 1's `native/events.rs` types, plus `path: Vec<u32>` on every event (target to top-level
ancestor; empty for target `0`). Event table:

| `type` | Payload (P = `PointerData`) | Bubbles (JS) | Cancelable | Handler props | Native default action | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| `pointerdown` | P | yes | **yes** | `onPointerDown(Capture)` | focus/blur, Godot focus grab/release, selection start, gesture arbitration | 1 |
| `pointermove`, `pointerup` | P | yes | no | `onPointerMove(Capture)`, `onPointerUp(Capture)` | — | 1 |
| `pointercancel` | P | yes | no | `onPointerCancel(Capture)` | — | I2 |
| `pointerenter`, `pointerleave` | P (`relatedTarget`) | no (chain) | no | `onPointerEnter`, `onPointerLeave` | — | 1 |
| `click`, `dblclick`, `auxclick`, `contextmenu` | P | yes | no | `onClick(Capture)`, `onDoubleClick`, `onAuxClick`, `onContextMenu` | — | 1, I2 |
| `wheel` | P + `deltaX`, `deltaY` | yes | **yes** | `onWheel(Capture)` | scroll chaining | I1, I5 |
| `keydown`, `keyup` | `key`, `code`, `repeat`, `isComposing`, modifiers | yes | **yes** | `onKeyDown(Capture)`, `onKeyUp(Capture)` | 3.14, Appendix C | I3 |
| `focus`, `blur` | `relatedTarget`, `focusVisible` | yes (React semantics) | no | `onFocus`, `onBlur` | — | 1, I3 |
| `scroll` | `scrollLeft/Top/Width/Height`, `clientWidth/Height` | no | no | `onScroll` | — | I5 |
| `selectionchange` | `selectionStart`, `selectionEnd` (inputs) | no | no | `onSelectionChange` | — | I6, I7 |
| `beforeinput` | `inputType`, `data` | yes | **yes** | `onBeforeInput` | apply edit | I7 |
| `input` | `inputType`, `data`, `value`, `selectionStart`, `selectionEnd`, `eventCount` | yes | no | `onInput`, `onChange` | — | I7 |
| `compositionstart/update/end` | `data` | yes | no | `onCompositionStart/Update/End` | — | I7 |
| `dragstart` | P + `sessionId` | yes | **yes** | `onDragStart` | begin session | I9 |
| `drag`, `dragend` | P + `sessionId`, `dropEffect`, `endedOutsideRoot` | yes | no | `onDrag`, `onDragEnd` | — | I9 |
| `dragenter`, `dragleave` | P + `sessionId` | yes | no | `onDragEnter`, `onDragLeave` | — | I9 |
| `dragover`, `drop` | P + `sessionId` | yes | **yes** | `onDragOver`, `onDrop` | prevented ⇒ accept/complete | I9 |

`inputType`: `insertText`, `insertLineBreak`, `insertFromPaste`, `insertReplacementText`,
`insertCompositionText`, `deleteContentBackward`, `deleteContentForward`, `deleteWordBackward`,
`deleteWordForward`, `deleteSoftLineBackward`, `deleteSoftLineForward`, `deleteByCut`, `historyUndo`,
`historyRedo`.

Event methods (Phase 1): `#[signal] events_ready()`, `drain_events() -> GString` (JSON array),
`resolve_event(seq, default_prevented, drop_effect) -> GString`.

### 4.4 Commands and queries (by tag)

| Method | Phase |
| --- | --- |
| `get_node_rect(tag) -> GString` (JSON rect or `null`) | F3 |
| `find_by_test_id(test_id) -> i64` (tag or −1) | F3 |
| `get_snapshot() -> GString` (diagnostics; whole-tree by design) | F3 |
| `set_pointer_capture(tag, pointer_id)`, `release_pointer_capture(tag, pointer_id)` | I2 |
| `focus_node(tag, focus_visible: i32 /* -1 modality, 0, 1 */)`, `blur_node(tag)` | I3 |
| `scroll_to(tag, left, top)`, `scroll_by(tag, dx, dy)`, `scroll_into_view(tag)`, `get_scroll_state(tag)` | I5 |
| `get_selection()`, `clear_selection()` | I6 |
| `set_text_and_selection(tag, event_count, value, start, end)` (`start`/`end` −1 = caret at end), `get_text_input_state(tag)` | I7 |
| `_set_text(text, emit_signal)` (Godot VK hook) | I7 |
| `_on_accessibility_action(data, tag, action)` (callback target) | I10 |

`IControl` overrides: `has_point` (I1), `get_cursor_shape` (I1), `get_focused_accessibility_element`
(I10).

### 4.5 Snapshot

`get_snapshot` keeps every field the existing verifiers read (per-node `id` (= tag), `kind`, `text`,
`parent`, `children`, `rect`, `clipRect`, `presentation`, `style`; `stats`, `width`, `height`,
`hovered`, `focused`, `pressed`, `clockMs`, `transitions`), where `style` is now the node's
**computed** style, and adds `props`, `layer`, `paintIndex`, `documentIndex`, `pointers`,
`focusVisible`, per-node `scroll`, `selection`, per-input `textInput`, `drag`, and commit counters
(`commits`, `nodesCreated`, `nodesCloned`, `mutations`, `boxRecords`, `contentRecords`). If an existing
verifier reads a field whose meaning must change, update the verifier only to read the equivalent
field and record why.

---

## 5. Phases

Every phase lists **Files** (expected), **Tasks**, and a **Gate**. "Native gate" = every command in 0.4
except the Web block; "Web gate" adds the Web block. Every gate also requires: Clippy 0 warnings,
README "Current limits" and `native/PROTOCOL.md` updated for what landed, `docs/INTERACTION_PROGRESS.md`
updated, a commit.

### Phase 0 — Baseline and module split — done (`9f4a02c`)

### Phase 1 — Event pipeline (finish and land)

The implementation is in the working tree (uncommitted). Its native parts (`native/events.rs`,
`native/pointer.rs` additions, the signal and re-entrancy handling in `native/lib.rs`) and its JS
dispatch (`src/events.ts`, tests) carry over to v2 unchanged in behaviour; Phase F3 rebases the JS
side on native paths.

**Files**: the Phase 1 working-tree files (`native/events.rs`, `native/pointer.rs`, `native/lib.rs`,
`src/native.ts`, `src/events.ts`, `src/renderer.ts`, `src/components.tsx`, `src/index.ts`,
`tests/recording-host.ts`, `tests/renderer.test.ts`, `tests/events.test.ts`, `demo/src/main.ts`,
`demo/src/app.tsx`, `demo/src/interaction-lab.tsx`, `demo/src/verify-interaction.ts` and `.uid`,
`demo/gen/**`, `demo/typings/**`, `scripts/build.mjs`, `scripts/verify.mjs`, `package.json`) plus new
`scripts/verify-interaction-web.mjs`.

1. Write `scripts/verify-interaction-web.mjs` modelled on `scripts/verify-web.mjs` (real Chrome input,
   DPR 1 and 2, landscape and portrait, a touch page) covering the same assertions as
   `verify-interaction.ts`.
2. Run `pnpm verify:motion`, and inspect the `artifacts/native-interaction/` PNGs.
3. Update `native/PROTOCOL.md` (events), README, and the progress log, including the dispatch-time
   table already measured.

**Gate**: native gate (including `verify:interaction`) and Web gate (including
`verify:interaction:web`).

### Phase F0 — Evidence for the Fabric core — done (`4f7dd0d`), decision D2

Results are in `docs/INTERACTION_PROGRESS.md`. Handle creation passed; reclamation failed, which led
to decision D2 (JS shadow tree). The probe stays in the tree behind the `probe` feature (`--probe` on
the build scripts) for re-measurement; its Files list also included `native/lib.rs` (`mod probe;`),
`demo/src/main.ts`, `scripts/build.mjs`, `scripts/probe-web.mjs` and the generated `probe.ts.uid` and
`.gen.ts`. GodotJS cannot pass a JS array to a typed `Array<Gd<T>>` parameter (godot-rust rejects the
untyped array, `godot-core-0.5.5/src/private.rs:539`); only untyped `VarArray` parameters work.
The original tasks are kept below as the record of what was measured.

**Files**: `native/probe.rs` (new, compiled only with cargo feature `probe`), `Cargo.toml` (feature),
`scripts/build-native.mjs` and `scripts/build-web.mjs` (pass `--features probe` when asked),
`demo/src/probe.ts` (new, run with `--probe`), `demo/src/benchmark.tsx`,
`scripts/verify-motion-web.mjs` (benchmark scenarios), `docs/INTERACTION_PROGRESS.md`.

1. **Handle cost and reclamation**, native and Web, with a probe class exposing
   `make_handle(tag) -> Gd<ProbeHandle>` (a `RefCounted` holding an `Rc<Vec<u8>>` of
   `PROBE_PAYLOAD_BYTES`) and `live_handles() -> i64` (a Rust counter incremented in construction and
   decremented in `Drop`). From JS: create `PROBE_HANDLE_COUNT` handles in a loop and record the time
   per call; drop all references; keep rendering frames and record `live_handles()` and
   `Performance.get_monitor(OBJECT_COUNT)` each second for `PROBE_RECLAIM_TIMEOUT_S`.
   **Pass**: the median create call is at most `MAX_HANDLE_CALL_US_NATIVE` / `MAX_HANDLE_CALL_US_WEB`,
   and `live_handles()` returns to its starting value within the timeout on both platforms.
2. **Props string boundary**: time `probe_parse(props_json)` for a 3-key diff and for a 40-property
   compiled style, native and Web (JS string → `GString` → `String` → `serde_json` into the real
   `PropsSpec` type once Phase F1 has it; for F0 use the current `StyleSpec`).
3. **Array of handles**: time passing a JS array of 1, 50 and 500 handles as an `Array` argument.
4. **Baseline benchmarks of the current renderer** on Web DPR 1 (extend the existing benchmark
   fixture and runner): at 50 and 2,000 cells, (a) one cell's colour changes, (b) every cell changes
   (existing), (c) the mouse sweeps across 200 cells with `hover:` styles, (d) the viewport resizes
   across the `md` breakpoint. Record JS reconcile time, commit time, native batch time, draw CPU time,
   and React commit count.
5. **Decision**: if 1 passes, proceed with native shadow nodes; otherwise use a JS-side persistent
   shadow tree whose commit sends only changed nodes to the mounting layer. Outcome: D2.

**Gate**: progress log contains every measurement with the platform, build mode and host memory
state; `cargo test` and `pnpm test` unchanged; the probe is off in default builds (check the
default `.dylib` and `.wasm` sizes are unchanged).

### Phase F1 — Props, commit validation and differ (Godot-free)

**Files**: `native/props.rs` (from `native/protocol.rs`), `native/commit.rs`, `native/diff.rs`,
`native/computed_style.rs`, `native/lib.rs` (module declarations only), Rust tests.

1. `props.rs`: `Kind`, `PropsSpec`, `StyleLayers`, `StyleSpec` longhands (`overflowX`/`overflowY`
   replace `overflow`; `disabled` moves to `PropsSpec`), `merge_diff(previous, diff_json) ->
   Result<PropsSpec, String>` with `null` resets, validation (today's `StyleSpec::validate` rules,
   kind-specific props, `deny_unknown_fields`), and `taffy_style` for a computed style. Port every
   existing `protocol.rs` test.
2. `commit.rs` per 3.4: `CommitPayload` serde types (`deny_unknown_fields`), `validate` and `plan`
   against a `MountedTree` trait (implemented by a plain test structure here and by the mounting layer in
   F3). Tests for every validation rule in 3.4 (new/duplicate/reused tags, kind change, unknown child,
   two parents, cycle, children of `Text`/`TextInput`, unattached created node, invalid prop diff),
   each asserting the mounted structure is unchanged after rejection.
3. `diff.rs` per 3.7: child-list diff producing `Remove`/`Insert` with LIS for moves; `Delete` for
   removed subtrees not re-inserted (including a subtree moved to another parent in the same payload,
   which must not be deleted). Tests: unchanged list → nothing; insert/remove/move minimal; a property
   test that applying `plan` to the old structure yields the new structure for random tree edits
   (`PROPERTY_TEST_CASES` cases, fixed seed, generator written in the test, no new crate).
4. `computed_style.rs` per 3.6: `resolve(layers, inherited, conditions) -> ComputedStyle`, inherited
   subset extraction, dirty rules, breakpoint index. Tests: layer order and overrides, state and
   breakpoint conditions, inheritance and overriding, `focus` vs `focusWithin`, propagation stops when
   inherited inputs are unchanged.

**Gate**: `cargo test`, Clippy. (No runtime change yet; `protocol.rs` may remain until F3 deletes it.)

### Phase F2 — JS style compiler, native-prop table and commit walk

**Files**: `src/styles.ts`, `src/types.ts`, `src/props.ts` (new), `src/commit.ts` (new),
`tests/styles.test.ts`, `tests/props.test.ts` (new), `tests/commit.test.ts` (new).

1. `compileStyle(className, style) -> CompiledStyle` per 3.6 (layers, longhands, interning, unknown
   classes throw, `focus-visible:` and `focus-within:` variants). Keep `resolveStyles` working until F3
   switches over, then delete it.
2. `src/props.ts`: native prop table (4.2), `nativeProps(kind, props)`, `diffNativeProps(old, new) ->
   NativePropsDiff | null` (changed keys with `null` resets; `null` when unchanged).
3. `src/commit.ts`: `buildCommit` per 3.9, pure and independent of React.
4. Tests: compile output for every utility family, variant combinations, interning identity, diff
   output and stability; `buildCommit` on hand-built instance trees: unchanged tree → empty payload
   and zero visits below the root; one changed leaf in a 2,000-node tree → one `updated` entry and a
   visit count equal to its depth; handler-only change → no entry; moves and reparenting → only the
   affected `children` entries; new subtree → `created` for each node.

**Gate**: `pnpm test:types`, `pnpm test`.

### Phase F3 — Commit API, mounting layer, render tree, persistent renderer

The cut-over. Old and new paths do not coexist; the phase ends with the old path deleted and every
existing verifier green.

**Files**: `native/lib.rs`, `native/mount.rs`, `native/render_tree.rs` (replaces
`native/render_items.rs`), `native/style_engine.rs`, `native/motion.rs`, `native/geometry.rs`,
`native/layout.rs`, `native/paint.rs`, `native/events.rs` (path), `native/protocol.rs` (deleted),
`src/renderer.ts`, `src/native.ts`, `src/events.ts`, `src/components.tsx`, `src/index.ts`, tests
(`tests/recording-host.ts` becomes a fake host that applies commit payloads to a JS structure and
records them), `demo/**` (raw strings
moved into `<Text>`, `refreshStyles` calls removed, `focus:` → `focus-within:` where needed),
verifiers, typings.

1. **Native commit API** (4.1) using `commit.rs` and `diff.rs` against the mounting layer. Regenerate
   typings.
2. **Mounting layer** (3.7): transaction application, per-tag maps replacing `Model`, `handles`,
   `visuals`, `rects`, `clips`, `content_clips`, `paint_order`, `opacities`, `items`.
3. **Style resolution wiring**: pseudo-state changes from hover/press/focus mark nodes dirty;
   viewport size changes go through the breakpoint index; `StyleEngine` incremental API by tag.
4. **Motion port**: `motion.rs` keyed by tag on mounted nodes (transitions, intrinsic tracks,
   overrides, `parent_basis`). `measure_endpoint` keeps its whole-tree probe (section 8). Run
   `verify:motion` early and often.
5. **Incremental layout and geometry** (3.7), hit testing by hierarchy, absolute-rect cache.
6. **Render tree** (3.8): box/content/scroll/overlay items, transforms, modulate, clips, draw index
   ranking, layers, selective re-recording, focus ring item. Delete the per-frame re-record in
   `draw()`.
7. **Events**: `path` on every event; hover/active/focus as native state feeding style resolution.
8. **Persistent renderer** (3.9) including the commit walk, deletions, public handles, `Portal` (layer
   1), `Text`-only strings, `Button` label as a child `Text`, `findByTestID` and `getRect` via native
   queries. Rebase `src/events.ts` on paths and `committedByTag`; keep its tests passing (update only
   how the fake host supplies paths).
9. **Delete** `apply_batch`, `Model`, `sync_model`, `protocol.rs`, `flush()`, the `committed` map,
   `resolveStyles`, `refreshStyles`.
10. **Docs**: rewrite `native/PROTOCOL.md` as the v2 native API; update `docs/MOTION_ARCHITECTURE.md`
    data-flow steps and README architecture section.

**Gate**: native gate and Web gate with unchanged assertions in `verify`, `verify:motion`,
`verify:web`, `verify:motion:web`, `verify:interaction`, `verify:interaction:web` (field-name updates
only, each recorded). Settled PNGs inspected against the Phase 1 captures.

### Phase F4 — Performance acceptance

**Files**: benchmark fixture and runner, `docs/INTERACTION_PROGRESS.md`, README performance paragraph.

Rerun every F0 benchmark scenario on the new renderer (same host, same build mode) and also record the
snapshot commit counters. **Pass** requires all of:

1. One cell changes at 2,000 cells: JS commit time (render + commit walk) and native `commit` time
   are each at most `MAX_SCALE_RATIO` × the same scenario at 50 cells; the payload size and
   `mutations` are the same at both sizes.
2. Hover sweep across 200 cells: zero React commits, zero `commit` calls, `contentRecords` and
   `boxRecords` only for nodes whose paint changed.
3. Resize across `md`: zero React commits; restyled nodes equal the nodes that use `md:` classes.
4. Every cell changes at 2,000 cells: total time per update lower than the F0 baseline.
5. An idle frame after a commit records zero canvas-item commands (`boxRecords`/`contentRecords`
   unchanged).

If a criterion fails, profile before changing anything (AGENTS.md root cause first) and report if the
fix is not local.

**Gate**: all criteria met and recorded; native and Web gates still green.

### Phase I1 — Godot co-operation

**Files**: `native/lib.rs`, `native/mount.rs`, `native/props.rs`, `native/computed_style.rs`,
`native/events.rs`, `src/types.ts`, `src/styles.ts`, `src/events.ts`, `src/native.ts`, tests,
`demo/src/main.ts`, `demo/src/interaction-lab.tsx`, verifiers.

1. `pointerEvents` and `cursor` (computed, inherited). Hit test skips `pointerEvents: none` nodes but
   descends into children. `IControl::has_point` returns whether the hit test finds a node; it must be
   side-effect free.
2. Remove `grab_focus()` from `ready()`; `pointerdown` default action grabs or releases Godot focus
   (3.11). The demo owner calls `surface.grabFocus()` after mounting.
3. Accept Tab only when focus moved; Enter/Space only when a button was pressed/activated.
4. `set_force_pass_scroll_events(true)`; dispatch `wheel` (cancelable) for `WHEEL_*` and
   `InputEventPanGesture`; accept only when prevented (I5 adds scrolling).
5. `get_cursor_shape(at)` (Appendix A map); `viewportX/viewportY` via
   `get_global_transform_with_canvas()`.
6. **Demo**: a full-window `ColorRect` before the surface counting `_gui_input` presses, counters in
   `Main._unhandledInput` for presses and keys, exposed as `passthrough()` on the demo API; a
   `pointer-events-none` region with one `pointer-events-auto` button.
7. **Verify** (native and Web): presses in the pass-through region reach the counters and no React
   handler; the button press does not; with no React focus `W` reaches `_unhandled_input`; after
   focusing a React button `W` still does but Tab does not; wheel over the region reaches
   `_unhandled_input`; `cursor-pointer` reports `CURSOR_POINTING_HAND` via `surface.getCursorShape`.

**Gate**: native gate and Web gate.

### Phase I2 — Pointer model, touch, capture

**Files**: `native/lib.rs`, `native/pointer.rs`, `native/mount.rs`, `native/events.rs`, `src/*`
(events, native, handle), tests, demo, verifiers.

1. Per-pointer records keyed by pointer id; click counting (Appendix A); pure unit tests.
2. Ignore `DEVICE_ID_EMULATION` events (comment citing `core/input/input.cpp:926`).
3. `InputEventScreenTouch` (pressed/released/`is_canceled()`) and `InputEventScreenDrag` as touch
   pointers with implicit capture, enter/leave on down/up, shared-button click rule, multi-touch.
4. All mouse buttons, `contextmenu`, `auxclick`, `dblclick`, `detail`.
5. `set_pointer_capture`/`release_pointer_capture` with validation; handle methods
   `setPointerCapture`, `releasePointerCapture`, `hasPointerCapture`; auto-release on up/cancel.
6. `EXIT_TREE` queues `pointercancel` for active pointers.
7. **Demo**: pointer pad showing the last 6 events; a capture-driven knob.
8. **Verify**: right click ⇒ `contextmenu`, no `click`; triple click ⇒ `detail` 1, 2, 3 and one
   `dblclick`; the knob keeps moving outside itself and the root; synthetic `ScreenTouch` (device 0) ⇒
   exactly one `pointerdown` of type touch with emulation on; Web touch tap ⇒ exactly one down/up/click
   and no `hover` state left on the element (snapshot computed style); CDP two-finger touch ⇒ two ids.

**Gate**: native gate and Web gate.

### Phase I3 — Focus and keyboard

**Files**: `native/props.rs`, `native/lib.rs`, `native/focus.rs`, `native/keymap.rs`,
`native/events.rs`, `native/computed_style.rs`, `src/props.ts`, `src/events.ts`, `src/components.tsx`,
`src/styles.ts`, tests, demo, verifiers.

1. `tabIndex`, `autoFocus` props.
2. `focus.rs`: focusable/tabbable, document order, wrap; tests (disabled ancestors, `-1`, hidden).
3. Click focus on nearest focusable ancestor-or-self; modality; focus-visible state and ring.
4. `focus_node`/`blur_node`, handle `focus()`/`blur()`, `autoFocus` at commit.
5. `keymap.rs` (Appendix B) with tests including `get_location()` codes.
6. `keydown` (cancelable, repeats) → default actions (Tab, button press) → accept rule; `keyup` →
   button click; keyboard `click` with `pointerId 0`, `pointerType ""`, `detail 0`; target 0 when no
   element is focused.
7. **Demo**: a dialog with a JS focus trap, a `tabIndex={0}` card, a key log.
8. **Verify**: Tab order is document order; the trap holds; focus ring only after keyboard focus
   (PNGs); held key ⇒ `repeat: true`; Enter on a button ⇒ one `click`, no `pointerdown`; `active:`
   style while Space is held; existing keyboard assertions still pass.

**Gate**: native gate and Web gate.

### Phase I4 — Positioning, z-order, overlays

**Files**: `native/props.rs`, `native/mount.rs`, `native/render_tree.rs`, `src/types.ts`,
`src/styles.ts`, `src/components.tsx`, tests, demo, verifiers.

1. **Evidence first**: a Rust test recording whether Taffy's `Layout.location` for an absolute
   grandchild is relative to its parent or its containing block; build the paint-parent transform on
   the observed rule and record it.
2. `position`, insets, `zIndex` → Taffy and the render tree (3.8, 3.15).
3. Unit tests: absolute escapes an `overflow-hidden` parent whose containing block is outside it;
   absolute inside a `relative` + `overflow-hidden` parent is clipped; fixed is never clipped by
   ancestors; sibling order by `zIndex` then document order; overlay layer above main.
4. **Demo**: a card with `overflow-hidden` and a menu button opening a popover in a `Portal`, anchored
   with `getRect()`, with a backdrop that closes it.
5. **Verify**: the popover covers later content and receives clicks above it; it is not clipped
   (pixel check); Tab order unchanged.

**Gate**: native gate and Web gate.

### Phase I5 — Scroll containers

**Files**: `native/scroll.rs`, `native/mount.rs`, `native/render_tree.rs`, `native/props.rs`,
`native/lib.rs`, `native/events.rs`, `src/*`, `src/kit/ScrollView.tsx`, tests, demo, verifiers.

1. `overflowX/Y: scroll|auto`, `overscrollBehavior`, `scrollbarWidth`, `scrollbarColor`,
   `touchAction`.
2. `scroll.rs` (pure): range/clamp incl. reversed axes, wheel/pan conversion, chaining with
   `contain`, momentum step, thumb geometry and thumb drag; tests.
3. Offsets as per-tag state → `scroll` item transform and hit-test offset; re-clamp after layout;
   coalesced `scroll` events. Scrolling must not touch Taffy, computed styles or React.
4. Wheel default action and accept rule; keyboard scrolling; touch pan with `pointercancel` and
   momentum through one `process()` activity decision that also covers motion (replacing scattered
   `set_process` calls).
5. Overlay scrollbars with mouse dragging.
6. `scroll_to`, `scroll_by`, `scroll_into_view`, `get_scroll_state`; focus scroll-into-view.
7. `ScrollView` kit component.
8. **Demo**: the interaction tab body becomes a vertical `ScrollView`; a horizontal carousel; a nested
   list (chaining); an `overscroll-contain` list.
9. **Verify**: inner list scrolls then chains; `contain` stops chaining; wheel over non-scrollable UI
   reaches `_unhandled_input`; PageDown scrolls; Tab to an offscreen button scrolls it into view; thumb
   drag; clicks hit scrolled content; clipping pixel check; snapshot counters show no React commit and
   no re-record of scrolled content during a scroll; Web touch swipe scrolls with momentum and cancels
   the pressed item's click; `touch-none` element gets `pointermove` instead.

**Gate**: native gate and Web gate.

### Phase I6 — Text layout and selection

**Files**: `native/text_offsets.rs`, `native/text_layout.rs`, `native/selection.rs`, `native/lib.rs`,
`native/render_tree.rs`, `native/props.rs`, `src/*`, tests, demo, verifiers.

1. `text_offsets.rs` with tests (ASCII, accents, astral emoji, ZWJ sequences, out of range).
2. `text_layout.rs` (3.17); the verifier checks `hit_test(caret_rect(i).center) == i` for every
   grapheme boundary at left/center/right alignment and wrapped lines.
3. `selection.rs` (pure) model and ranges; tests.
4. `userSelect`, `selectionColor`, gestures, copy/select-all, clearing, `selectionchange`,
   `get_selection`/`clear_selection`, `root.getSelection()` with handles and UTF-16 offsets.
5. Selection painting in `content` items.
6. **Demo**: a `select-text` article with a `select-none` sentence and a selected-text readout.
7. **Verify**: drag across two paragraphs; double and triple click; `select-none` skipped; Cmd/Ctrl+C
   to clipboard (native `DisplayServer.clipboardGet()`; Web with clipboard permissions); PNGs.

**Gate**: native gate and Web gate.

### Phase I7 — TextInput

Four commits (I7A–I7D), each with its own native gate; the Web gate after I7D (and after I7B if it
changed Web-relevant code).

**Files**: `native/props.rs`, `native/text_input.rs`, `native/text_input_godot.rs`,
`native/text_layout.rs`, `native/layout.rs`, `native/mount.rs`, `native/render_tree.rs`,
`native/lib.rs`, `native/events.rs`, `src/components.tsx`, `src/props.ts`, `src/events.ts`,
`src/native.ts`, tests, demo (`export_presets.cfg` in I7B), verifiers.

**I7A — single-line core.** Kind `textinput` and its props; `EditBuffer` (pure: `Vec<char>`,
anchor/focus, `apply(EditCommand)`, `maxLength` in UTF-16 units, read-only, undo/redo with coalescing,
injected grapheme boundaries in tests); measurement per 3.18 in both measure paths and the motion probe;
rendering (value/placeholder/bullets, selection, blinking caret, horizontal scroll, `caretColor`,
`placeholderColor`); pointer caret placement and selection gestures; editing pipeline (`keydown` →
`beforeinput` → apply → `input`/`selectionchange`); `set_text_and_selection` with the event-count rule;
the `TextInput` component (`value`, `defaultValue`, `onChange`, `onBeforeInput`, `onSelectionChange`,
`onSubmit` on Enter when not composing, `placeholder`, `readOnly`, `secure`, `maxLength`,
`selectTextOnFocus`; handle `select()`, `setSelectionRange()`, `selectionStart`, `selectionEnd`,
`value`). JS tests: accepted, rejected (reverts through the command), transformed (uppercase),
uncontrolled, stale command ignored, `onSubmit`.

**I7B — IME and virtual keyboard.** Per 3.18, mirroring the cited `LineEdit` code; `_set_text`; enable
`html/experimental_virtual_keyboard` in `demo/export_presets.cfg` and record that desktop Chrome keeps
the IME path. **Verify (Web)**: CDP `Input.imeSetComposition` shows the preedit and `Input.insertText`
commits it with `compositionstart/update/end` and one `input`; on the touch page, tapping the input
focuses Godot's hidden DOM input and `page.keyboard.type('abc')` yields value `abc` with the caret at
3 and a matching React value. **Native IME** cannot be injected: record a manual check with a macOS
Japanese or Pinyin input source (screenshots), or report that it could not be done.

**I7C — clipboard and undo.** `ui_copy`, `ui_cut`, `ui_paste`, `ui_undo`, `ui_redo`; `secure` blocks
copy/cut. **Investigation (Web paste)**: reproduce whether the first paste after changing the system
clipboard is stale; record the order of the browser `paste` event, the Godot key event and the
clipboard callback; propose a fix only with a platform-causal argument (AGENTS.md "Web Fix
Validation"). The engine checkout `~/Development/godot` is shared by all of Breaka: prefer a fix in
this repository when the causal argument allows it; if the cause is in the engine, fix it there in
its own commit, rebuild the Web template per `docs/WEB.md`, and record both in the decision log.

**I7D — multi-line.** `multiline`, `rows`, wrapping, `insertLineBreak`, vertical caret movement with
desired x, line/document/page movement, internal vertical scroll with chaining, `keyboardType:
'multiline'`.

**Demo**: a form with name, password, `maxLength`, an uppercase-transforming controlled field, a
read-only field, a notes field, and a live JSON readout.

**Verify** (native; Web as above): typing, Shift+arrows and mouse selection, word navigation via the
InputMap, Backspace/Delete over an emoji ZWJ sequence, maxLength, transform, read-only, bullets and
blocked copy, undo/redo, caret visible in PNGs, horizontal scroll follows the caret, multi-line wraps
and scrolls.

**Gate**: native gate and Web gate after I7D.

### Phase I8 — Component kit

**Files**: `src/kit/*.tsx`, `src/index.ts`, `tests/kit.test.ts`, demo, verifiers. No native changes; if
a component turns out to need one, add it in the relevant native module and record why in the
decision log.

| Component | Built from | Keyboard |
| --- | --- | --- |
| `Checkbox` (`checked`, `indeterminate`, `onChange`) | `Button` `role="checkbox"`, box + filled inner box | Space toggles |
| `Switch` | `Button` `role="switch"`, track + spacer `width` transition + thumb | Space/Enter |
| `RadioGroup` / `Radio` | context, roving `tabIndex` | arrows move and select, wrap |
| `Slider` (`min`, `max`, `step`, `value`) | track + thumb, pointer capture | arrows ±step, Page ±10 steps, Home/End |
| `Select` (`options`, `value`) | `Button` + `Portal` listbox + backdrop | ArrowUp/Down, Enter, Escape |
| `TextField` | label `Text` + `TextInput` + helper/error `Text` | — |
| `ScrollView` | Phase I5 | — |

Each with `disabled`, controlled and uncontrolled forms, `aria-*` passthrough, WAI-ARIA keyboard
behaviour. Tests with the fake host; an "Inputs" demo section bound to one state object; verify each
by mouse, keyboard and (Web) touch.

**Gate**: native gate and Web gate.

### Phase I9 — Drag and drop

**Files**: `native/drag.rs`, `native/lib.rs`, `native/pointer.rs`, `native/scroll.rs`,
`native/render_tree.rs`, `native/events.rs`, `native/props.rs`, `src/events.ts` (`DataTransfer`),
`src/native.ts`, `src/components.tsx`, tests, demo, verifiers.

1. `drag.rs` (pure) state machine `Idle → Pending → Dragging → Ended` with tests for every transition
   (touch hold vs slop, cancel paths).
2. `draggable`, `dragPreview`; arbitration (3.12 rule 3) with `pointercancel`.
3. Event sequence and outcomes (3.19); `dropEffect` via `resolve_event`; `endedOutsideRoot` and
   viewport coordinates.
4. Cursor shapes; Escape cancels (accepted).
5. Native ghost in the top-most item; `none` draws nothing.
6. Edge auto-scroll through the `process()` activity decision.
7. JS `DataTransfer` with protection modes and `effectAllowed`/`dropEffect` negotiation.
8. **Demo**: a two-column board (reorder within and across), a trash target accepting only `move`, a
   long list that auto-scrolls, a "dropped outside" readout.
9. **Verify**: reorder, cross-column move, rejected drop, Escape, auto-scroll, outside drop
   coordinates, ghost in a mid-drag PNG, no `click` after a drag; Web touch: hold then move drags,
   quick swipe scrolls.

**Gate**: native gate and Web gate.

### Phase I10 — Accessibility

**Files**: `native/accessibility.rs`, `native/props.rs`, `native/lib.rs`, `src/props.ts`,
`src/components.tsx`, `src/kit/*`, `scripts/ax-dump.swift`, demo, docs.

1. `role` and `aria-*` JSX props → `PropsSpec` fields; kit components set roles and states.
2. `accessibility.rs` per 3.21 (Appendix D roles). First read `item_list.cpp` around the cited lines
   and `Control`'s accessibility handling to confirm the parent element, bounds coordinate space and
   action-callback argument order; record what you found.
3. Text inputs: `TEXT_FIELD`/`MULTILINE_TEXT_FIELD`, value, placeholder, read-only, text selection via
   `create_sub_text_edit_elements` like `LineEdit` (read its accessibility update first).
4. **Verify (macOS native)**: `scripts/ax-dump.swift` walks the Godot window's AX tree
   (`AXUIElementCreateApplication(pid)`) printing role, title/description, value and frame; a Node
   wrapper asserts the buttons, checkbox (checked), slider (value), text field (value) and scroll view
   appear with frames inside the window. The terminal needs macOS Accessibility permission once; if it
   is missing, stop and ask Ben. Record a short VoiceOver check or report that it could not be done.
   Record `DisplayServer.hasFeature(FEATURE_ACCESSIBILITY_SCREEN_READER)` on Web for the README.

**Gate**: native gate (including the AX dump) and Web gate (regression).

### Phase I11 — World-space UI recipe

**Files**: `demo/src/world-panel.ts` (+ `.uid`), `demo/src/main.ts`, `demo/src/verify-world.ts`,
`scripts/verify.mjs`, `package.json` (`verify:world`), `docs/WORLD_SPACE.md`. No native changes.

1. `Camera3D`, a quad with an unshaded material showing a `SubViewport`'s texture; the `SubViewport`
   (transparent background) holds its own `ReactUiRoot` with a button and a `TextInput`.
2. Input forwarding from the owner's `_unhandledInput` by analytic ray–plane intersection to
   `SubViewport` pixels and `pushInput(event, true)`; keys go to the `SubViewport` while its root has
   focus.
3. A label anchored above a moving 3D node with `unprojectPosition` into an absolute element.
4. **Verify**: clicking the quad's projected button increments a counter; typing into the world
   `TextInput` works; the anchored label tracks the node; PNGs. Web: same if the Web template renders
   3D, else record the evidence and limit the claim to native.

**Gate**: native gate (including `verify:world`) and Web gate.

### Final acceptance

All gates pass from a clean build; README limits list exactly 2.3 plus anything recorded as not done;
`native/PROTOCOL.md` documents the v2 native API; `docs/MOTION_ARCHITECTURE.md` matches the new data
flow; the progress log has every gate's evidence and the F0/F4 measurements side by side.

---

## 6. Verification reference

- **Unit tests** carry the logic: Rust `props`, `shadow`, `diff`, `computed_style`, `events`,
  `pointer`, `focus`, `keymap`, `scroll`, `text_offsets`, `selection`, `text_input`, `drag`; TypeScript
  renderer, events, styles, props and kit tests against a fake host that implements the 4.1 API in JS
  and records calls (so tests can assert that a hover or an unrelated commit makes no native calls).
- **Native runtime**: real Godot input via `Input.parseInputEvent` (it buffers until the next
  iteration; settle frames before asserting). Touch: `InputEventScreenTouch`/`ScreenDrag` with
  `device = 0`.
- **Web runtime**: real Chrome input through Puppeteer and CDP (`Input.dispatchTouchEvent`,
  `Input.imeSetComposition`, `Input.insertText`) at DPR 1 and 2, landscape and portrait, plus a touch
  page.
- **Counters**: commit and paint counters in the snapshot (4.5) are how phases prove work is
  proportional to change.
- **Pixels**: clipping, z-order, selection, caret, scrollbars and ghost need pixel checks or inspected
  PNGs.
- **Known non-blocking teardown crash**: post-suite GodotJS/native shutdown crashes are expected; the
  success marker is authoritative.

---

## 7. Platform facts this design depends on

Engine source: `~/Development/godot` (`version.py` says 4.7.2 on branch `breaka-4.7.2`; the runtime
reports `4.8.beta.custom_build` in `native/api/extension_api.json`). Find code by symbol if line numbers
drift.

### 7.1 Input routing

- `_gui_call_input` marks pointer events handled at the first `MOUSE_FILTER_STOP` control unless it is
  a scroll event with `force_pass_scroll_events` (`scene/main/viewport.cpp:1740-1779`).
- Control lookup calls `has_point` (`viewport.cpp:1844-1876`); touch presses pin to
  `gui.touch_focus[index]` (`viewport.cpp:2212-2240`); screen drags go to the pinned control
  (`viewport.cpp:2262-2287`).
- Godot's drag-and-drop starts from `get_drag_data` (`viewport.cpp:2047-2093`); `ReactUiRoot` does not
  implement it.
- Keys go to `gui.key_focus` and, if unhandled, on to focus navigation and unhandled input
  (`viewport.cpp:2309-2330`).
- Touch-to-mouse emulation sets `device = DEVICE_ID_EMULATION (-1)` (`core/input/input.cpp:908-944`,
  `core/input/input_event.h:64`); Web `preventDefault()`s touch events
  (`platform/web/js/libs/library_godot_input.js:577-603`).

### 7.2 GDExtension and GodotJS

- `Control` virtuals in `extension_api.json`: `_has_point`, `_get_cursor_shape`, `_get_drag_data`,
  `_can_drop_data`, `_drop_data`, `_gui_input`; godot-rust 0.5.5 `IControl` has `has_point(&self)`,
  `get_cursor_shape(&self) -> i32`.
- `Node`: `queue_accessibility_update`, `get_accessibility_element`, virtual
  `_get_focused_accessibility_element`; notifications `ACCESSIBILITY_UPDATE (3000)`,
  `ACCESSIBILITY_INVALIDATE (3001)`, `OS_IME_UPDATE (2013)` — all variants of `ControlNotification`.
- godot-rust signals: `#[signal] fn events_ready();` in the primary `#[godot_api]` block, emitted with
  `self.signals().events_ready().emit()` through `base_mut()` re-borrowing
  (`godot-core-0.5.5/src/signal/signal_object.rs:33`, `obj/traits.rs:456-524`).
- GodotJS argument conversion: a `Dictionary` parameter accepts only an existing Godot Dictionary
  wrapper (`modules/GodotJS/bridge/jsb_type_convert.cpp:284-305`); untyped object values convert only
  if they are Godot variant/object wrappers (`jsb_type_convert.cpp:549-582`); JS arrays convert to
  `Array` and packed arrays (`jsb_type_convert.cpp:256-266`); strings to `String`/`StringName`.
- GodotJS RefCounted lifetime: binding takes one native reference; RefCounted wrappers start weak and
  are promoted to strong only while native code also holds references; the GC callback releases the
  reference (`modules/GodotJS/bridge/jsb_environment.cpp:1166-1180, 1229-1237, 1355-1425`). GodotJS
  does not report native memory to V8 (no `AdjustAmountOfExternalAllocatedMemory` in
  `modules/GodotJS`; only a manual full-GC request, `jsb_environment.cpp:3433-3450`), so native
  memory behind wrappers does not drive collection (F0, decision D2).
- A typed `Array<Gd<T>>` parameter rejects arrays from GodotJS (`godot-core-0.5.5/src/private.rs:539`);
  use untyped `VarArray` if an array parameter is ever needed.
- The JS name of `events_ready` is `eventsReady`; `Signal.connect(Callable.create(fn))` /
  `disconnect` (Phase 1).

### 7.3 Text, IME, keyboard, clipboard

- `DisplayServer`: `window_set_ime_active`, `window_set_ime_position`, `ime_get_text`,
  `ime_get_selection`, `virtual_keyboard_show(existing_text, position: Rect2, type, max_length,
  cursor_start, cursor_end)`, `virtual_keyboard_hide`, `clipboard_get/set/has`, `cursor_set_shape`,
  `has_feature` (`FEATURE_IME`, `FEATURE_VIRTUAL_KEYBOARD`, `FEATURE_CLIPBOARD`, …).
- `TextServer`: `shaped_text_hit_test_position`, `shaped_text_get_carets`, `shaped_text_get_selection`,
  `shaped_text_next/prev_grapheme_pos`, `shaped_text_get_word_breaks`, `string_get_word_breaks`.
- `TextParagraph`: `hit_test`, `get_line_rid`, `get_rid`, `get_line_range`, `get_line_size`,
  `get_line_ascent/descent`, `get_line_width`, `get_line_count`, `get_line_spacing`, `duplicate`.
- Web IME (`platform/web/display_server_web.cpp:892-935`), Web virtual keyboard
  (`library_godot_display.js:31-170`, `viewport.cpp:2856-2868`, `display_server_web.cpp:801-823`),
  Web clipboard (`display_server_web.cpp:1037-1039`), feature flags
  (`display_server_web.cpp:1227-1231`).
- `LineEdit` references: unicode rule (`scene/gui/line_edit.cpp:1053-1073`), IME window (`124-147`),
  IME update (`1694-1713`), virtual keyboard (`2255-2262`), `_set_text` (`2126-2142`), caret blink
  (`scene/gui/line_edit.h:200`).

### 7.4 React reconciler and layout

- Persistent mode in `react-reconciler` 0.33: `updateHostComponent` (`cjs/react-reconciler.development.js:9940-9970`),
  `updateHostContainer` (`9930-9939`), host text recreation (`10282-10300`), `replaceContainerChildren`
  for root and portals (`11370-11380`, `12350-12365`), config names (`17062-17068`), mutable-clone
  hooks (`16979-16984`).
- Taffy: scroll range (`…/fca167c/src/tree/layout.rs:696-830`), positioning (`…/src/style/mod.rs:354-385`),
  `Overflow::Scroll` with zero scrollbar width (`…/src/style/mod.rs:467-470`).
- Godot `ScrollContainer` behaviour to mirror: `scene/gui/scroll_container.cpp:190-226, 311-318,
  450-480, 569-610`; `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`).
- `RenderingServer` canvas items: `canvas_item_set_parent`, `canvas_item_set_transform`,
  `canvas_item_set_modulate`, `canvas_item_set_clip`, `canvas_item_set_custom_rect`,
  `canvas_item_set_draw_index`, `canvas_item_clear`, `free_rid` (today's use:
  `native/render_items.rs`). A clipping item becomes the clip owner for its whole subtree: its final
  clip rect is its global rect intersected with the parent clip, and children inherit it
  (`servers/rendering/renderer_canvas_cull.cpp:413-429`); `Control::clip_contents` is exactly
  `canvas_item_set_clip` (`scene/gui/control.cpp:4627`). Draw index sorts siblings ascending
  (`renderer_canvas_cull.cpp:1958-1966`, `ItemIndexSort` in `renderer_canvas_cull.h:111`).

---

## 8. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Native handle reclaim tied to JS GC | Measured in F0; resolved by D2 (no native shadow nodes) |
| Commit walk or payload parse grows with change size for large updates | F4 criterion 4 compares every-cell updates with the F0 baseline |
| The F3 cut-over breaks motion | `motion.rs` is ported to tags early in F3 and `verify:motion` runs throughout |
| Re-entrant JS during `gui_input` | Phase 1 rules (3.10), with runtime tests for unmount, detach and target removal |
| `focus:` semantics change (ancestors → `focus-within:`) | F3 records every affected demo/verifier usage |
| Intrinsic-size transitions clone the whole Taffy tree per endpoint measurement (`motion.rs` `measure_endpoint`) | Out of scope; recorded as the one remaining whole-tree commit-path cost; revisit with evidence |
| Canvas-item child clipping or draw-index ordering behaves differently than 3.8 assumes | 7.4 requires checking before building on it |
| Web paste is stale | I7C investigation, no fix without causal evidence |
| Native IME and VoiceOver cannot be automated | manual evidence or an explicit "not verified" |
| Taffy absolute `location` semantics | I4 task 1 measures first |

Open questions (defaults in brackets): Tab at the last element leaves the root instead of wrapping?
[wrap]. Default `userSelect` at the root? [`none`]. `Button` defaults to `cursor: pointer`? [no].

---

## Appendix A — Constants

| Constant | Value | Source / rationale |
| --- | --- | --- |
| `MAX_EVENT_DRAIN_ROUNDS` (JS) | 64 | Event-storm guard (Phase 1) |
| `MOUSE_POINTER_ID` / `KEYBOARD_POINTER_ID` / `TOUCH_POINTER_ID_BASE` | 1 / 0 / 2 | Chrome uses 1 for the mouse |
| `CLICK_COUNT_INTERVAL_MS` | 500 | Common OS double-click default; Godot exposes no interval API |
| `CLICK_COUNT_SLOP_PX` | 4 | Logical px between clicks of one sequence |
| `TOUCH_SLOP_PX` | 8 | Android touch slop (8 dp); Godot's default scroll deadzone is 0 |
| `TOUCH_DRAG_HOLD_MS` | 500 | Mobile long-press-to-drag; tune with evidence |
| `SCROLL_PAGE_DIVISOR` | 8 | `ScrollBar::PAGE_DIVISOR` (`scene/gui/scroll_bar.h:116`) |
| `MOMENTUM_*` | mirror | `ScrollContainer` `drag_touching_deaccel` (`scroll_container.cpp:569-610`) |
| `SCROLLBAR_THICKNESS_PX` / `SCROLLBAR_MARGIN_PX` / `SCROLLBAR_MIN_THUMB_PX` | 6 / 2 / 24 | Overlay thumb |
| `DEFAULT_SCROLLBAR_COLOR` | `#64748b99` | slate-500 at 60 % |
| `AUTOSCROLL_EDGE_PX` / `AUTOSCROLL_SPEED_PX_PER_SECOND` | 32 / 600 | Drag auto-scroll; tune with evidence |
| `DEFAULT_SELECTION_COLOR` | `#3b82f659` | blue-500 at 35 % |
| `DEFAULT_PLACEHOLDER_ALPHA` | 0.5 | Placeholder = text colour at half alpha |
| `CARET_WIDTH_PX` | 1 | Godot default `caret_width`; confirm in the default theme |
| `CARET_BLINK_INTERVAL_MS` | 650 | `LineEdit::caret_blink_interval = 0.65` (`line_edit.h:200`) |
| `TEXT_INPUT_DEFAULT_COLUMNS` / `TEXT_AREA_DEFAULT_ROWS` | 20 / 2 | HTML `size` / `rows` defaults |
| `UNDO_LIMIT` | 100 | Per input |
| `SECURE_TEXT_BULLET` | `'\u{2022}'` | Password mask |
| `DRAG_GHOST_OPACITY` | 0.6 | Browser-like ghost |
| `PROBE_HANDLE_COUNT` / `PROBE_PAYLOAD_BYTES` / `PROBE_RECLAIM_TIMEOUT_S` | 100000 / 64 / 30 | F0 probe |
| `MAX_HANDLE_CALL_US_NATIVE` / `MAX_HANDLE_CALL_US_WEB` | 10 / 30 | F0 decision gate: a 2,000-node full clone stays within one 60 Hz frame on Web |
| `PROPERTY_TEST_CASES` | 500 | F1 differ property test |
| `MAX_SCALE_RATIO` | 2 | F4: cost at 2,000 nodes vs 50 nodes for a one-node change |

`cursor` → `Control.CursorShape`: default→ARROW, pointer→POINTING_HAND, text→IBEAM, move→MOVE,
grab→DRAG, grabbing→DRAG, not-allowed→FORBIDDEN, crosshair→CROSS, wait→WAIT, progress→BUSY,
help→HELP, ew-resize→HSIZE, ns-resize→VSIZE, nesw-resize→BDIAGSIZE, nwse-resize→FDIAGSIZE. While
dragging: allowed→CAN_DROP, not allowed→FORBIDDEN.

## Appendix B — DOM `key` and `code`

`key`: (1) if `get_unicode() >= 32`, that character; (2) else the named key; (3) else
`get_key_label()` if printable (lowercase unless Shift), so Ctrl+C gives `'c'`; (4) else
`'Unidentified'`. Named: Enter (also KP_Enter), Tab, Escape, Backspace, Delete, Insert, Home, End,
PageUp, PageDown, ArrowLeft/Right/Up/Down, Shift, Control, Alt, Meta, CapsLock, F1–F12, ContextMenu,
Pause, PrintScreen, ScrollLock, NumLock.

`code` (from `get_physical_keycode()` and `get_location()`): KeyA–KeyZ, Digit0–Digit9, F1–F12,
Numpad0–Numpad9, NumpadAdd, NumpadSubtract, NumpadMultiply, NumpadDivide, NumpadDecimal, NumpadEnter,
Enter, Tab, Space, Escape, Backspace, Delete, Insert, Home, End, PageUp, PageDown, ArrowLeft/Right/Up/
Down, ShiftLeft/Right, ControlLeft/Right, AltLeft/Right, MetaLeft/Right, CapsLock, Minus, Equal,
BracketLeft, BracketRight, Backslash, Semicolon, Quote, Backquote, Comma, Period, Slash, ContextMenu;
otherwise `'Unidentified'`.

## Appendix C — Edit commands

Match with `event.is_action(name, true)` in this order, like `LineEdit::gui_input`. M = multi-line only.
Record the actions present at runtime (`InputMap.hasAction`) in I7A.

| InputMap action | `EditCommand` | `inputType` |
| --- | --- | --- |
| `ui_text_submit` (single-line) | none natively; JS `onSubmit` | — |
| `ui_text_newline` (M) | `InsertLineBreak` | `insertLineBreak` |
| `ui_copy` / `ui_cut` / `ui_paste` | `Copy` / `Cut` / `Paste` (copy/cut not for `secure`) | — / `deleteByCut` / `insertFromPaste` |
| `ui_undo` / `ui_redo` | `Undo` / `Redo` | `historyUndo` / `historyRedo` |
| `ui_text_select_all` | `SelectAll` | — |
| `ui_text_backspace_all_to_left` / `ui_text_backspace_word` / `ui_text_backspace` | delete to line start / word / grapheme backward | `deleteSoftLineBackward` / `deleteWordBackward` / `deleteContentBackward` |
| `ui_text_delete_all_to_right` / `ui_text_delete_word` / `ui_text_delete` | delete to line end / word / grapheme forward | `deleteSoftLineForward` / `deleteWordForward` / `deleteContentForward` |
| `ui_text_caret_word_left/right` | `MoveWord(dir, extend = Shift)` | — |
| `ui_text_caret_left/right` | `MoveGrapheme(dir, extend)`; with a selection and no Shift, collapse to that side | — |
| `ui_text_caret_line_start/end` | `MoveLineEdge(dir, extend)` | — |
| `ui_text_caret_up/down` (M) | `MoveLine(dir, extend)` keeping desired x | — |
| `ui_text_caret_page_up/down` (M) | `MovePage(dir, extend)` | — |
| `ui_text_caret_document_start/end` (M) | `MoveDocumentEdge(dir, extend)` | — |
| no action, no Ctrl/Alt/Meta, `unicode >= 32` | `InsertText(char)` | `insertText` |

## Appendix D — Roles

| `role` | `AccessibilityServer.AccessibilityRole` |
| --- | --- |
| implicit `Button` / `button` | BUTTON |
| `checkbox` / `switch` / `radio` | CHECK_BOX / CHECK_BUTTON / RADIO_BUTTON |
| `radiogroup`, `group` | CONTAINER (name from `ariaLabel`) |
| `slider` / `progressbar` | SLIDER / PROGRESS_INDICATOR |
| implicit `TextInput` / `textbox` | TEXT_FIELD, or MULTILINE_TEXT_FIELD |
| implicit `Text` / `text` | STATIC_TEXT |
| `link` | LINK |
| `list` / `listitem` / `listbox` / `option` | LIST / LIST_ITEM / LIST_BOX / LIST_BOX_OPTION |
| `combobox` | BUTTON with a popup type (copy what Godot's `OptionButton` does; record it) |
| `menu` / `menuitem` / `menuitemcheckbox` / `menuitemradio` | MENU / MENU_ITEM / MENU_ITEM_CHECK_BOX / MENU_ITEM_RADIO |
| `tablist` / `tab` / `tabpanel` | TAB_BAR / TAB / TAB_PANEL |
| `dialog` | DIALOG (`FLAG_MODAL` when `ariaModal`) |
| `img` / `region` / `tooltip` | IMAGE / REGION / TOOLTIP |
| implicit scroll container | SCROLL_VIEW |
| `none` / `presentation` | not exposed; children attach to the nearest exposed ancestor |

Flags: `disabled`/`ariaDisabled` → FLAG_DISABLED, `ariaHidden` → not exposed, `ariaReadOnly` →
FLAG_READONLY, `ariaRequired` → FLAG_REQUIRED, `ariaModal` → FLAG_MODAL, clipping → FLAG_CLIPS_CHILDREN.
