import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import { tsxLanguage } from '@codemirror/lang-javascript';
import { Button, Text, View } from 'godot-react-ui';
import { PLAIN_TEXT_COLOR, SYNTAX_COLORS, colorSpans, type HexColor } from './editor/highlight';

/**
 * The project's own pages in the navigator, ahead of the labs: what the project is (`home`), how to install it (`install`), and what the
 * labs are (`labs`). They are written for someone who has just arrived at the site, so they say what the library does and how to use it in
 * plain terms, with the README as their source of truth. A page reaches the navigator (another page, a lab, an address outside the
 * site) through `PageActions`, which the navigator provides.
 */

export const PROJECT_REPOSITORY_URL = 'https://github.com/BreakaClub/godot-react-ui';
export const GODOT_TSC_REPOSITORY_URL = 'https://github.com/BreakaClub/godot-tsc';
const AUTHORING_URL = `${PROJECT_REPOSITORY_URL}/blob/main/docs/AUTHORING.md`;
const OWNER_EXAMPLE_URL = `${PROJECT_REPOSITORY_URL}/blob/main/demo/src/main.ts`;
const LIMITS_URL = `${PROJECT_REPOSITORY_URL}/blob/main/docs/LIMITS.md`;
const RELEASES_URL = `${PROJECT_REPOSITORY_URL}/releases`;

/** What a page can ask of the navigator it is in. */
export interface PageActions {
  openPage(id: ProjectPageId): void;
  /** Open the first lab in the sidebar's order. */
  openFirstLab(): void;
  /** Open an address outside the site, in the browser (or the system's browser, natively); `undefined` where the host cannot. */
  readonly openLink: ((url: string) => void) | undefined;
}

const PageActionsContext = createContext<PageActions | null>(null);

export function PageActionsProvider({ value, children }: { value: PageActions; children: ReactNode }) {
  return <PageActionsContext.Provider value={value}>{children}</PageActionsContext.Provider>;
}

function usePageActions(): PageActions {
  const actions = useContext(PageActionsContext);
  if (actions === null) throw new Error('A project page needs the navigator\'s PageActionsProvider');
  return actions;
}

// ---- The parts the pages are made of -------------------------------------------------------------------------------------------------------

/** The page's column: one readable width, centred in the stage, padded like a lab. */
function PageColumn({ testID, children }: { testID: string; children: ReactNode }) {
  return (
    <View testID={testID} className="w-full items-center p-6 md:p-8">
      <View className="w-full max-w-3xl gap-8">{children}</View>
    </View>
  );
}

function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-xs text-slate-500">{eyebrow}</Text>
      <Text className="text-3xl text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="text-lg text-slate-900">{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children, testID }: { children: string; testID?: string }) {
  return <Text testID={testID} className="select-text text-sm leading-6 text-slate-700">{children}</Text>;
}

/** A term and what it means, one under the other: the list the pages use for features and requirements. */
function Definitions({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <View className="gap-4">
      {items.map(([term, text]) => (
        <View key={term} className="gap-1">
          <Text className="text-sm text-slate-900">{term}</Text>
          <Text className="select-text text-sm leading-6 text-slate-600">{text}</Text>
        </View>
      ))}
    </View>
  );
}

/** A stretch of a code block in one colour. */
interface CodeSegment {
  readonly text: string;
  readonly color: HexColor;
}

/**
 * `code` cut into coloured stretches as the code editor colours it: the same Lezer TSX parser and the same palette
 * (`editor/highlight.ts`). Text no token colours is the editor's plain colour.
 */
export function highlightTsx(code: string): readonly CodeSegment[] {
  const segments: CodeSegment[] = [];
  let at = 0;
  const plainUntil = (end: number) => {
    if (end > at) segments.push({ text: code.slice(at, end), color: PLAIN_TEXT_COLOR });
  };
  for (const span of colorSpans(tsxLanguage.parser.parse(code), 0, code.length)) {
    plainUntil(span.from);
    segments.push({ text: code.slice(span.from, span.to), color: span.color });
    at = span.to;
  }
  plainUntil(code.length);
  return segments;
}

/**
 * Shell commands, one a line, coloured with the editor's palette: the program as a function, an option (`--project-dir`) as an
 * attribute, and the rest plain. There is no shell parser here; the pages' commands are simple words.
 */
export function highlightShell(code: string): readonly CodeSegment[] {
  const segments: CodeSegment[] = [];
  for (const [lineIndex, line] of code.split('\n').entries()) {
    if (lineIndex > 0) segments.push({ text: '\n', color: PLAIN_TEXT_COLOR });
    for (const [wordIndex, part] of line.split(/(\s+)/u).entries()) {
      if (part === '') continue;
      const color = /^\s+$/u.test(part) ? PLAIN_TEXT_COLOR
        : wordIndex === 0 ? SYNTAX_COLORS.function
          : part.startsWith('-') ? SYNTAX_COLORS.attribute
            : PLAIN_TEXT_COLOR;
      segments.push({ text: part, color });
    }
  }
  return segments;
}

/** Code to read or copy: monospaced, selectable, on a dark panel, coloured as the code editor colours it. Lines wrap at the panel's width. */
function CodeBlock({ code, language, testID }: { code: string; language: 'tsx' | 'shell'; testID?: string }) {
  const segments = useMemo(() => (language === 'tsx' ? highlightTsx(code) : highlightShell(code)), [code, language]);
  return (
    <View className="rounded-lg bg-slate-900 px-4 py-3">
      <Text testID={testID} className="select-text font-mono text-xs leading-5" style={{ color: PLAIN_TEXT_COLOR }}>
        {segments.map((segment, index) => (
          segment.color === PLAIN_TEXT_COLOR ? segment.text : <Text key={index} style={{ color: segment.color }}>{segment.text}</Text>
        ))}
      </Text>
    </View>
  );
}

const ACTION_CLASS = 'rounded-lg border px-3 py-1.5 text-sm';
const PRIMARY_ACTION = `${ACTION_CLASS} border-transparent bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-300`;
const SECONDARY_ACTION = `${ACTION_CLASS} border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:border-indigo-500`;

/** A button that opens an address outside the site. It says where it goes, so nobody is surprised by a new tab. */
function ExternalLink({ url, label, testID, primary = false }: { url: string; label: string; testID: string; primary?: boolean }) {
  const actions = usePageActions();
  return (
    <Button
      testID={testID}
      role="link"
      aria-label={`${label} (${url})`}
      disabled={actions.openLink === undefined}
      className={`${primary ? PRIMARY_ACTION : SECONDARY_ACTION} disabled:opacity-50`}
      onClick={() => actions.openLink?.(url)}
    >
      {label}
    </Button>
  );
}

function PageLink({ page, label, testID, primary = false }: { page: ProjectPageId; label: string; testID: string; primary?: boolean }) {
  const actions = usePageActions();
  return (
    <Button testID={testID} className={primary ? PRIMARY_ACTION : SECONDARY_ACTION} onClick={() => actions.openPage(page)}>
      {label}
    </Button>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}

// ---- Home ------------------------------------------------------------------------------------------------------------------------------------

const FEATURES: readonly (readonly [string, string])[] = [
  ['A React 19 renderer',
    'react-reconciler in persistent mode, the architecture of React Native\'s Fabric. A commit is one native call carrying only what changed, and '
    + 'hover, press, focus and breakpoint changes restyle natively, without a React render.'],
  ['Primitives and a component kit',
    'View, Text, Button, Image, Portal and TextInput, and Checkbox, Switch, RadioGroup, Slider, Select, Combobox, TextField and ScrollView built from them.'],
  ['Styles',
    'A typed subset of Tailwind v3 classes and inline styles: layout, spacing, colour, typography, borders, shadows, gradients, 2D transforms, filters, '
    + 'backdrop blur and transitions, with variants such as sm:, hover: and focus-visible:. An unknown class is an error, not a silent no-op.'],
  ['Input',
    'DOM-style events with capture and bubbling, focus and Tab order, keyboard, mouse and multi-touch pointer events, scrolling with momentum, text '
    + 'selection and copy, drag and drop, and a TextInput with IME support.'],
  ['Inside a Godot game',
    'Input the UI does not use reaches the Controls underneath and _unhandled_input, so a HUD can sit over a game. A root can also be drawn on a quad in a 3D scene.'],
  ['Text and platform',
    'Rich text from nested Text, accessibility through Godot\'s AccessibilityServer, and high-DPI rendering.'],
];

const LAYERS: readonly (readonly [string, string])[] = [
  ['In JavaScript',
    'React, the reconciler and a style compiler, which turns class strings and inline styles into style layers once and reuses them.'],
  ['In the GDExtension (Rust)',
    'Taffy lays out Flexbox and Grid, Godot\'s TextParagraph shapes and measures text, Stylo times transitions, and one Control draws the whole tree as '
    + 'RenderingServer canvas items: there is no Godot Control per React element.'],
];

export function HomePage() {
  return (
    <PageColumn testID="page-home">
      <PageTitle eyebrow="OPEN SOURCE, MIT LICENCE" title="godot-react-ui">
        <Paragraph testID="page-home-summary">
          {'React for Godot. You write the UI as React components in TypeScript and run them on GodotJS; a Rust GDExtension lays them out and '
            + 'draws them with Godot\'s own text shaping and RenderingServer, natively and in Web exports.'}
        </Paragraph>
        <Actions>
          <ExternalLink testID="page-home-github" url={PROJECT_REPOSITORY_URL} label="Source on GitHub" primary />
          <PageLink testID="page-home-install" page="install" label="Install" />
          <PageLink testID="page-home-labs" page="labs" label="Labs" />
        </Actions>
      </PageTitle>
      <Section title="What it provides">
        <Definitions items={FEATURES} />
      </Section>
      <Section title="How it is built">
        <Definitions items={LAYERS} />
      </Section>
      <Section title="This site">
        <Paragraph>
          {'This site is the project\'s demo exported for the Web with stock Godot 4.7.2 and GodotJS, so everything on it, this page included, is '
            + 'drawn by godot-react-ui. It is verified in Chrome.'}
        </Paragraph>
      </Section>
    </PageColumn>
  );
}

// ---- Install ---------------------------------------------------------------------------------------------------------------------------------

const REQUIREMENTS: readonly (readonly [string, string])[] = [
  ['Godot 4.7.2 or newer, with GodotJS',
    'The native library is bound to the Godot 4.7.2 API. It does not depend on which JavaScript runtime GodotJS uses: it runs on V8 '
    + 'natively and on the browser\'s own engine in Web exports. We suggest GodotJS\'s V8 editor build for development. It works with '
    + 'GodotJS\'s camel-case bindings on or off.'],
  ['React 19.2.0', 'A peer dependency.'],
  ['Platforms',
    'The addon carries libraries for macOS (universal), Linux and Windows (x86_64 and arm64), Android (arm64 and x86_64) and iOS (arm64), and Web side '
    + 'modules for stock Godot 4.7.2 exports with and without threads. Apple Silicon macOS and the Web with threads in Chrome have been verified; the '
    + 'others are built and not yet qualified.'],
];

const INSTALL_COMMANDS = `pnpm add react@19.2.0 godot-react-ui
pnpm exec godot-react-ui setup --project-dir path/to/your/godot/project`;

const COUNTER_EXAMPLE = `import { useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <View className="gap-4 rounded-xl bg-white p-6">
      <Text className="text-3xl text-slate-900">Count: {count}</Text>
      <Button
        className="rounded-lg bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700"
        onClick={() => setCount(value => value + 1)}
      >
        Add one
      </Button>
    </View>
  );
}`;

const MOUNT_EXAMPLE = `import { Callable, Control, ReactUiRoot } from 'godot';
import { createRoot, type ReactRoot } from 'godot-react-ui';
import { Counter } from './counter';

export default class Hud extends Control {
  private root: ReactRoot | undefined;

  override _ready(): void {
    const surface = new ReactUiRoot();
    this.addChild(surface);
    surface.size = this.size;
    this.root = createRoot(surface, {
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
}`;

export function InstallPage() {
  return (
    <PageColumn testID="page-install">
      <PageTitle eyebrow="GETTING STARTED" title="Install" />
      <Section title="Requirements">
        <Definitions items={REQUIREMENTS} />
      </Section>
      <Section title="1. Add the package">
        <CodeBlock testID="page-install-commands" language="shell" code={INSTALL_COMMANDS} />
        <Paragraph>
          {'setup copies the GDExtension to res://addons/godot-react-ui/ and writes node_modules/.gdignore, so Godot does not import npm\'s tree. '
            + 'Open the project in the editor once afterwards, so Godot imports the extension. The installed addon stays out of git, as node_modules '
            + 'does, and an install on a fresh clone puts it back.'}
        </Paragraph>
        <Actions>
          <ExternalLink testID="page-install-releases" url={RELEASES_URL} label="Releases (tarball and addon zip)" />
        </Actions>
      </Section>
      <Section title="2. Write a component">
        <CodeBlock testID="page-install-component" language="tsx" code={COUNTER_EXAMPLE} />
      </Section>
      <Section title="3. Mount it on a ReactUiRoot">
        <Paragraph>
          {'ReactUiRoot is the extension\'s Control. The GodotJS script that owns it creates the root, delivers its events each frame and unmounts '
            + 'it when it leaves the tree. The owner also keeps the surface\'s size up to date and calls grabFocus() on it when the UI should take '
            + 'the keyboard first.'}
        </Paragraph>
        <CodeBlock testID="page-install-mount" language="tsx" code={MOUNT_EXAMPLE} />
      </Section>
      <Section title="More">
        <Paragraph>
          {'The authoring guide covers the primitives, images, focus, events, scrolling, selection, drag and drop, text input, rich text, '
            + 'accessibility and mounting. The demo\'s own owner is a complete example, and the limits page lists what is not built.'}
        </Paragraph>
        <Actions>
          <ExternalLink testID="page-install-authoring" url={AUTHORING_URL} label="Authoring guide" />
          <ExternalLink testID="page-install-owner" url={OWNER_EXAMPLE_URL} label="The demo's owner" />
          <ExternalLink testID="page-install-limits" url={LIMITS_URL} label="Limits" />
        </Actions>
      </Section>
    </PageColumn>
  );
}

// ---- Labs ------------------------------------------------------------------------------------------------------------------------------------

export function LabsIntroPage() {
  const actions = usePageActions();
  return (
    <PageColumn testID="page-labs">
      <PageTitle eyebrow="LABS" title="About the labs">
        <Paragraph testID="page-labs-summary">
          {'The labs are technical examples. Most are demonstrations of one capability, and many are also the fixtures the project\'s automated '
            + 'verifiers drive. They are not a guide to structuring an app, and their code does not recommend any particular practice.'}
        </Paragraph>
        <Actions>
          <Button testID="page-labs-first" className={PRIMARY_ACTION} onClick={actions.openFirstLab}>Open the first lab</Button>
        </Actions>
      </PageTitle>
      <Section title="Live code">
        <Paragraph>
          {'In a window at least 768 pixels wide, the Code button above a lab opens its TSX source in an editor beside it. Edits are compiled as '
            + 'you type and the lab\'s components are hot swapped in, keeping their state where their hooks have not changed. A syntax or type error '
            + 'leaves the last good version on screen. Labs that need the whole window or a scene of their own have no Code button.'}
        </Paragraph>
        <Paragraph>
          {'Type checking, hover types and compilation run in your browser, in godot-tsc: a GDExtension that runs Bun\'s TypeScript checker (a port '
            + 'of typescript-go) and transpiler on a thread of its own inside Godot. The editor itself is built with godot-react-ui.'}
        </Paragraph>
        <Actions>
          <ExternalLink testID="page-labs-godot-tsc" url={GODOT_TSC_REPOSITORY_URL} label="godot-tsc on GitHub" />
        </Actions>
      </Section>
      <Section title="Moving around">
        <Paragraph>
          {'Previous and Next, or Alt+Up and Alt+Down, step through the labs in the sidebar\'s order, and the filter narrows the list. Show '
            + 'Expected adds what each case should do under it.'}
        </Paragraph>
      </Section>
    </PageColumn>
  );
}

// ---- The list --------------------------------------------------------------------------------------------------------------------------------

export type ProjectPageId = 'home' | 'install' | 'labs';

export interface ProjectPage {
  readonly id: ProjectPageId;
  /** What the sidebar and the menu call it. */
  readonly title: string;
  /** The sidebar section it is listed in. */
  readonly section: 'Project' | 'Labs';
  readonly component: ComponentType;
}

/** In the order the navigator lists them. `home` is what the navigator opens when it is not asked for a lab or a page. */
export const PROJECT_PAGES: readonly ProjectPage[] = [
  { id: 'home', title: 'Home', section: 'Project', component: HomePage },
  { id: 'install', title: 'Install', section: 'Project', component: InstallPage },
  { id: 'labs', title: 'About the labs', section: 'Labs', component: LabsIntroPage },
];

export const HOME_PAGE: ProjectPageId = 'home';

export function findProjectPage(id: string): ProjectPage | undefined {
  return PROJECT_PAGES.find(page => page.id === id);
}

export function isProjectPageId(id: string): id is ProjectPageId {
  return findProjectPage(id) !== undefined;
}
