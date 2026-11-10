# godot-react-ui

React for Godot. Write your UI in React and TSX on [GodotJS](https://github.com/godotjs/GodotJS). A Rust GDExtension lays it out with
[Taffy](https://github.com/DioxusLabs/taffy) (Flexbox and Grid) and draws it with Godot's own text shaping and `RenderingServer`, natively and on the Web.

**Status: prototype.** The API can change between releases.

**Live demo:** [react.breaka.club](https://react.breaka.club/?demo=navigator), the demo's labs in the browser (Chrome is the qualified browser).

## What it does

- **React 19 with hooks.** The renderer is `react-reconciler` in persistent mode, the architecture of React Native's Fabric. A commit sends one native call
  with only what changed. Hover, press, focus and breakpoint changes restyle natively, with no React render.
- **Primitives and a kit.** `View`, `Text`, `Button`, `Image`, `Portal` and `TextInput`, plus `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Select`, `Combobox`,
  `TextField` and `ScrollView` built from them.
- **A typed, Tailwind-like class subset** and inline styles: layout, spacing, colours with opacity, typography, shadows, rings, outlines, gradients, 2D
  transforms, filters and frosted glass (`backdrop-blur`), CSS transitions (Stylo's timing), and `sm:`/`md:`/`hover:`/`focus-visible:`… variants. An
  unknown class is an error, not a silent no-op.
- **DOM-style input.** Capture and bubble, `preventDefault`, focus and Tab order, keyboard events, mouse and multi-touch pointer events with capture,
  wheel and touch scrolling with momentum, text selection and copy, drag and drop, and a native-backed `TextInput` with IME support.
- **A good Godot citizen.** Input the UI does not use (empty space, `pointer-events: none`, unclaimed keys and wheel ticks) reaches the `Control`s
  underneath and `_unhandled_input`, so a HUD can sit over a game.
- **Rich text** (nested `Text` spans), **accessibility** through Godot's `AccessibilityServer`, high-DPI rendering, and React roots on quads in 3D
  scenes ([world-space UI](docs/WORLD_SPACE.md)).

## Requirements

- **Godot with GodotJS on V8**, version 4.7.2 or newer: the native library is bound to the Godot 4.7.2 API. The library works in a project with
  GodotJS's camel-case bindings on or off.
- **Platforms.** The release addon carries macOS (arm64 and x86_64), Linux x86_64, Windows x86_64 and Web libraries. Apple Silicon macOS and
  the Web (stock Godot 4.7.2 templates, in Chrome) are the platforms that have been verified; the others are built and not yet qualified.
- **React 19.2.0** as a peer dependency.

## Install

The package is not on npm yet. Each [GitHub release](https://github.com/BreakaClub/godot-react-ui/releases) has an npm tarball and the addon as a zip.

```sh
pnpm add react@19.2.0 ./godot-react-ui-0.9.0.tgz
pnpm exec godot-react-ui setup --project-dir path/to/your/godot/project
```

`setup` copies the GDExtension to `res://addons/godot-react-ui/` and writes `node_modules/.gdignore`, so Godot does not import npm's tree. The
package's `postinstall` does the same when it finds a `project.godot` above where you installed (pnpm 10 runs it only if `onlyBuiltDependencies`
lists `godot-react-ui`). Open the project in the editor once afterwards, so Godot imports the extension.

The installed addon stays out of your project's git, as `node_modules` does: `setup` writes `addons/godot-react-ui/.gitignore` (`*`), and an
install on a fresh clone puts the addon back. If your project must commit the addon, delete that `.gitignore` after each install.

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

Mount it on a `ReactUiRoot`, the extension's `Control`, from the GodotJS script that owns it:

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

The owner also keeps the surface's size up to date (native restyles the breakpoints a new width crosses, with no React render) and calls
`grabFocus()` on it when the UI should take the keyboard first. [The demo's owner](demo/src/main.ts) is a complete example, and
[docs/AUTHORING.md](docs/AUTHORING.md#mounting) has the details.

The owner above is a project with GodotJS's camel-case bindings. The library takes a `ReactUiRoot` under either naming, so only the owner's own
calls differ in a project without them: `add_child`, `events_ready`, `grab_focus`.

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
