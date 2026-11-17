# godot-react-ui

React for Godot. You write your UI as React components in TypeScript and run them on [GodotJS](https://github.com/godotjs/GodotJS). A Rust
GDExtension lays the UI out with [Taffy](https://github.com/DioxusLabs/taffy) (Flexbox and Grid) and draws it through Godot's `RenderingServer` with
Godot's own text shaping, in native builds and in Web exports.

**Live demo:** [react.breaka.club](https://react.breaka.club/) runs the project's home page and the demo's labs in the browser. It has been
verified in Chrome.

## What it does

- **React 19 with hooks.** The renderer is built on `react-reconciler` in persistent mode, the same model as React Native's Fabric. Each commit is a
  single native call that carries only what changed, and hover, press, focus and breakpoint changes are restyled natively, without a React render.
- **Primitives and a component kit.** `View`, `Text`, `Button`, `Image`, `Portal` and `TextInput`, plus `Checkbox`, `Switch`, `RadioGroup`, `Slider`,
  `Select`, `Combobox`, `TextField` and `ScrollView`, which are built from them.
- **A typed subset of Tailwind v3 classes**, plus inline styles. They cover layout, spacing, colours with opacity, typography, shadows, rings, outlines,
  linear and conic gradients, 2D transforms, rounded clipping, filters, frosted glass (`backdrop-blur`), CSS transitions and keyframe animations (timed by Stylo), with variants such as `sm:`, `md:`, `hover:`
  and `focus-visible:`. An unknown class is an error, not a silent no-op.
- **DOM-style input.** Capture and bubbling, `preventDefault`, focus and Tab order, keyboard events, mouse and multi-touch pointer events with pointer
  capture, wheel and touch scrolling with momentum, text selection and copying, drag and drop, and a native-backed `TextInput` with IME support.
- **Works inside a Godot game.** Input the UI does not handle (clicks on empty space or on `pointer-events: none` regions, and keys and wheel ticks it
  has no use for) passes through to the `Control`s beneath it and then to the game's `_unhandled_input`, so a React HUD can sit over a running game.
- **Rich text** (nested `Text` spans), **accessibility** through Godot's `AccessibilityServer`, sharp rendering on high-DPI displays, and
  [world-space UI](docs/WORLD_SPACE.md): a React root drawn on a mesh in a 3D scene that still takes input.

## Requirements

- **Godot 4.7.2 or newer, with GodotJS.** The native library is built against the Godot 4.7.2 API. It does not depend on which JavaScript runtime
  GodotJS uses: it has run on V8 natively and on the browser's own engine in Web exports. We suggest GodotJS's V8 editor build for development.
  GodotJS's camel-case bindings can be on or off.
- **Platforms.** The release addon includes a universal macOS library, Linux and Windows libraries for x86_64 and arm64, Android libraries for
  arm64 and x86_64, an iOS arm64 library, and Web side modules for stock Godot 4.7.2 exports with and without threads. Apple Silicon macOS and
  the Web with threads (stock Godot 4.7.2 templates, in Chrome) have been verified. CI loads each desktop library in the official Godot editor;
  the other platforms are built but not yet fully verified ([docs/LIMITS.md](docs/LIMITS.md)).
- **React 19.2.0**, required as a peer dependency.

## Install

```sh
pnpm add react@19.2.0 godot-react-ui
pnpm exec godot-react-ui setup --project-dir path/to/your/godot/project
```

Each [GitHub release](https://github.com/BreakaClub/godot-react-ui/releases) also includes the npm tarball and a zip of the addon.

`setup` copies the GDExtension to `res://addons/godot-react-ui/` and writes `node_modules/.gdignore` so that Godot does not import the contents of
`node_modules`. The package's `postinstall` script does the same when it finds a `project.godot` in a directory above the install (pnpm 10 runs it
only if `onlyBuiltDependencies` lists `godot-react-ui`). Afterwards, open the project in the Godot editor once so that it imports the extension.

Like `node_modules`, the installed addon is kept out of your project's git: `setup` writes `addons/godot-react-ui/.gitignore` containing `*`, and
installing on a fresh clone puts the addon back. If your project needs to commit the addon, delete that `.gitignore` after each install.

## Use

```tsx
import { useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <View className="gap-4 rounded-xl bg-white p-6">
      <Text className="text-3xl text-slate-900">Count: {count}</Text>
      <Button
        className="rounded-lg bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700 active:bg-indigo-800"
        onClick={() => setCount(value => value + 1)}
      >
        Add one
      </Button>
    </View>
  );
}
```

Mount it on a `ReactUiRoot`, the `Control` the extension provides, from the GodotJS script that owns it:

```tsx
import { Callable, Control, ReactUiRoot } from 'godot';
import { createRoot, type ReactRoot } from 'godot-react-ui';
import { Counter } from './counter';

export default class Hud extends Control {
  private root: ReactRoot | undefined;

  override _ready(): void {
    const surface = new ReactUiRoot();
    this.addChild(surface);
    surface.size = this.size;
    this.root = createRoot(surface, {
      // A GodotJS Callable holds its function strongly, so unmount() calls the function returned here to let go of it.
      subscribeToEvents: listener => {
        const callable = Callable.create(listener);
        surface.eventsReady.connect(callable);
        return () => surface.eventsReady.disconnect(callable);
      },
    });
    this.root.render(<Counter />);
  }

  override _process(): void {
    this.root?.dispatchEvents();
  }

  override _exitTree(): void {
    this.root?.unmount();
  }
}
```

The owner also keeps the `ReactUiRoot`'s size up to date (when a new width crosses a breakpoint, the native side restyles without a React render),
and calls `grabFocus()` on it when the UI should receive keyboard input first. [The demo's owner script](demo/src/main.ts) is a complete example,
and [docs/AUTHORING.md](docs/AUTHORING.md#mounting) has the details.

The owner above is written for a project with GodotJS's camel-case bindings. The library accepts a `ReactUiRoot` under either naming convention,
so in a project without them only the owner's own calls change: `add_child`, `events_ready`, `grab_focus`.

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/AUTHORING.md](docs/AUTHORING.md) | The primitives, images, focus, events, pointers, scrolling, selection, drag and drop, `TextInput`, the combobox, rich text, accessibility, mounting and display scale |
| [docs/STYLES.md](docs/STYLES.md) | The class subset and the inline styles: layout, text, paint, transforms, filters, motion and variants |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How a commit reaches the screen, and what it costs |
| [docs/MOTION_ARCHITECTURE.md](docs/MOTION_ARCHITECTURE.md) | The motion engine and where new features plug in |
| [native/PROTOCOL.md](native/PROTOCOL.md) | The commit protocol between JavaScript and the extension |
| [docs/WEB.md](docs/WEB.md) | Building and verifying the Web export, and how the demo is hosted |
| [docs/WORLD_SPACE.md](docs/WORLD_SPACE.md) | React roots on quads in a 3D scene |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Building this repository, the demo, engine profiles, and the verifiers |
| [docs/LIMITS.md](docs/LIMITS.md) | What is not built, and what is built but not verified |

## Repository

| Path | What it is |
| --- | --- |
| `src/` | The TypeScript package: the renderer, the style compiler, the kit |
| `native/` | The Rust GDExtension: layout, text, drawing, input, motion, accessibility |
| `demo/` | A Godot project with a navigator of labs, one per feature, which the verifiers drive |
| `demo/src/editor/`, `demo/src/live-compile-*.ts` | The demo's code editor, over [godot-tsc](https://github.com/BreakaClub/godot-tsc) (Bun's TypeScript checker and transpiler as a GDExtension; a demo-only dev dependency) |
| `scripts/`, `tests/` | Builds, native and browser verifiers, and unit tests |
| `deploy/` | The Cloudflare Worker that serves the hosted demo |

To build from source, run the demo and run the verifiers, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## AI disclosure

**Is this project vibe coded slop?**

It's a big ol' custard tart baked in a magnitude 7 earthquake... and it's delicious.

Seriously though, yes. This project makes extensive use of LLM-generated code. If that's a problem for you or your employer, do not use this project.

**Does that raise concerns regarding the quality of this project?**

Perhaps. Realistically, this project is far from novel. The heavy lifting is handled by our Rust dependencies.

Whilst it's true we do have a decent amount of code, I wouldn't call it particularly complicated code. We're quite literally just trying to iteratively align our implementation with established web standards and Tailwind-like visuals. This is precisely the kind of task LLMs excel at.

Now, of course, LLMs can be sneaky little buggers. Hiding their little nasties, only surfacing them when you back them into a corner and grill them on the implementation details. Consequently, this has also taken much good old-fashioned human intervention to get the project to where it is. That's not to say further nasties don't exist. If you find any, let us know.

## License

[MIT](LICENSE). The demo's fonts (`demo/fonts/`) are under the SIL Open Font License 1.1.
