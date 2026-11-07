import { createElement, type ComponentType, type ReactElement } from 'react';
import { CounterLab, InventoryLab } from './app';
import { A11yPanel } from './a11y-panel';
import { BenchmarkExplorer } from './benchmark-explorer';
import { ComboboxLab } from './combobox-lab';
import { DragLab } from './drag-lab';
import { FiltersExplorer } from './filters-explorer';
import { FormsExtraLab } from './forms-extra-lab';
import { FormsLab } from './forms-lab';
import { GlassLab } from './glass-lab';
import { HidpiLab } from './hidpi-lab';
import { InputsLab } from './inputs-lab';
import { InteractionLab } from './interaction-lab';
import { KeyboardLab } from './keyboard-lab';
import { MotionLab } from './motion-lab';
import { PassthroughHud } from './passthrough-hud';
import { PointerLab } from './pointer-lab';
import { PositioningLab } from './positioning-lab';
import { ScrollLab } from './scroll-lab';
import { SelectionLab } from './selection-lab';

/**
 * The labs of the demo: one array, one entry per lab. The navigator (`navigator.tsx`) builds its sidebar, its lab menu, its header
 * and its previous/next order from this array, the verifiers render a lab by its id (`godotReactDemo.showLab(id)`), and the live
 * code editor reads `sources`. Adding a lab is one entry here (and its import above); a typo in `group` or `kind` is a compile error.
 *
 * A lab is a React component written as a whole page. Where it appears in the navigator is `kind`:
 *
 * - `inline`: in the navigator's content area, which clips it and scrolls what does not fit. `surface: 'game'` leaves the area
 *   transparent and lets pointers through it, for a lab that is drawn over the Godot scene behind the root (the HUD).
 * - `window`: a lab that lays itself out from the window's own size (`useRootSize`, `fixed`), so it cannot sit in a content area. The
 *   content area shows its description and a button that gives the lab the whole window, with a way back that stays on screen.
 * - `scene`: a lab that is its own Godot scene (a 3D camera, a `SubViewport`). Opening it changes scene; a Godot button comes back.
 */

/** Where a lab's TSX lives, as the Godot resource path of a file in the demo project (`demo/` on disk). */
export type LabSource = `res://src/${string}.tsx`;

/** The sidebar's groups, in the order they are listed. */
export const LAB_GROUPS = ['Foundations', 'Layout', 'Input', 'Text', 'Motion', 'Effects', 'Godot', 'Platform', 'Performance'] as const;
export type LabGroup = (typeof LAB_GROUPS)[number];

interface LabBase {
  /** Lowercase words joined by hyphens: the `--lab=` and `?lab=` value, and the `showLab` name. */
  readonly id: string;
  readonly title: string;
  /** One sentence, shown under the title and searched by the filter. */
  readonly description: string;
  readonly group: LabGroup;
  /** The TSX files that make the lab, the one that exports `component` first. The live code editor opens these. */
  readonly sources: readonly LabSource[];
}

export interface InlineLab extends LabBase {
  readonly kind: 'inline';
  readonly component: ComponentType;
  /** `page` (the default) paints the content area; `game` leaves it transparent and passes pointers through it. */
  readonly surface?: 'page' | 'game';
  /** The lab has no margin of its own, because it is a tab of the playground, which pads the page: the content area pads it the same. */
  readonly padded?: boolean;
}

export interface WindowLab extends LabBase {
  readonly kind: 'window';
  readonly component: ComponentType;
  /** Why the lab needs the whole window, in a sentence. */
  readonly reason: string;
}

export interface SceneLab extends LabBase {
  readonly kind: 'scene';
  /** The Godot scene the lab is. */
  readonly scene: `res://${string}.tscn`;
  readonly reason: string;
}

export type Lab = InlineLab | WindowLab | SceneLab;

/** Checks every entry against `Lab` and keeps each `id` as a literal type, which is what `LabName` is made from. */
function defineLabs<const Labs extends readonly Lab[]>(labs: Labs): Labs {
  return labs;
}

export const LABS = defineLabs([
  {
    id: 'counter', kind: 'inline', padded: true, group: 'Foundations', title: 'Counter',
    description: 'State, memoised values and effects in a React component, laid out by native Flexbox and Grid.',
    component: CounterLab, sources: ['res://src/app.tsx'],
  },
  {
    id: 'inventory', kind: 'inline', padded: true, group: 'Foundations', title: 'Inventory',
    description: 'A keyed grid you can filter, reorder, add to and remove from, where each card keeps its own state.',
    component: InventoryLab, sources: ['res://src/app.tsx'],
  },
  {
    id: 'interaction', kind: 'inline', padded: true, group: 'Foundations', title: 'Events',
    description: 'Capture and bubble order, enter and leave, and handlers that change the tree while native is still dispatching.',
    component: InteractionLab, sources: ['res://src/interaction-lab.tsx'],
  },
  {
    id: 'positioning', kind: 'inline', group: 'Layout', title: 'Positioning',
    description: 'Position, insets and z-index, clipping by the containing block, fixed boxes and the overlay layer.',
    component: PositioningLab, sources: ['res://src/positioning-lab.tsx'],
  },
  {
    id: 'scroll', kind: 'inline', group: 'Layout', title: 'Scrolling',
    description: 'Wheel, trackpad, touch, keys and scrollbars, with nested lists, chaining and overscroll containment.',
    component: ScrollLab, sources: ['res://src/scroll-lab.tsx'],
  },
  {
    id: 'pointers', kind: 'inline', group: 'Input', title: 'Pointers',
    description: 'Mouse buttons, touches, click counts and pointer capture.',
    component: PointerLab, sources: ['res://src/pointer-lab.tsx'],
  },
  {
    id: 'keyboard', kind: 'inline', group: 'Input', title: 'Keyboard',
    description: 'Tab order, the focus ring, key events and a focus trap.',
    component: KeyboardLab, sources: ['res://src/keyboard-lab.tsx'],
  },
  {
    id: 'inputs', kind: 'inline', group: 'Input', title: 'Controls',
    description: 'Checkbox, switch, radio group, slider, select and text field from the component kit.',
    component: InputsLab, sources: ['res://src/inputs-lab.tsx'],
  },
  {
    id: 'combobox', kind: 'inline', group: 'Input', title: 'Combobox',
    description: 'Single and multiple editable comboboxes with list filtering, chips and custom values.',
    component: ComboboxLab, sources: ['res://src/combobox-lab.tsx'],
  },
  {
    id: 'drag', kind: 'inline', group: 'Input', title: 'Drag and drop',
    description: 'Move cards between lists and onto a trash, with drop effects, edge auto-scroll and touch.',
    component: DragLab, sources: ['res://src/drag-lab.tsx'],
  },
  {
    id: 'forms', kind: 'inline', group: 'Text', title: 'Text inputs',
    description: 'Single-line and multi-line text inputs bound to one state object.',
    component: FormsLab, sources: ['res://src/forms-lab.tsx'],
  },
  {
    id: 'forms-extra', kind: 'inline', group: 'Text', title: 'Text inputs, edge cases',
    description: 'Fields that the text input review found misbehaving, kept as a standing check.',
    component: FormsExtraLab, sources: ['res://src/forms-extra-lab.tsx'],
  },
  {
    id: 'selection', kind: 'inline', group: 'Text', title: 'Text selection',
    description: 'Click, double and triple click, drag, Shift+click, copy and select all on rendered text.',
    component: SelectionLab, sources: ['res://src/selection-lab.tsx'],
  },
  {
    id: 'motion', kind: 'inline', padded: true, group: 'Motion', title: 'Transitions',
    description: 'Height, colour and opacity transitions that run natively, including intrinsic sizes and retargeting.',
    component: MotionLab, sources: ['res://src/motion-lab.tsx'],
  },
  {
    id: 'filters', kind: 'inline', group: 'Effects', title: 'Filters',
    description: 'CSS filters and backdrop filters on real layouts: pick a fixture and a blur radius.',
    component: FiltersExplorer, sources: ['res://src/filters-explorer.tsx', 'res://src/filters-lab.tsx'],
  },
  {
    id: 'glass', kind: 'window', group: 'Effects', title: 'Frosted glass',
    description: 'A music app page built from backdrop blur, saturation and translucent fills over a coloured background.',
    reason: 'It lays itself out from the window\'s size and pins its top bar to the window, so it needs the whole window.',
    component: GlassLab, sources: ['res://src/glass-lab.tsx'],
  },
  {
    id: 'hud', kind: 'inline', surface: 'game', group: 'Godot', title: 'HUD over the game',
    description: 'Pointers and keys fall through empty space to the Godot scene underneath; only the controls take them.',
    component: PassthroughHud, sources: ['res://src/passthrough-hud.tsx'],
  },
  {
    id: 'world', kind: 'scene', group: 'Godot', title: 'World space',
    description: 'A React panel on a quad in a 3D scene, with pointer input mapped through the camera and a label that follows a node.',
    reason: 'It is its own Godot scene: a camera, a quad and a SubViewport that holds the React root.',
    scene: 'res://world.tscn', sources: ['res://src/world-panel.tsx', 'res://src/world-label.tsx'],
  },
  {
    id: 'accessibility', kind: 'inline', group: 'Platform', title: 'Accessibility',
    description: 'Roles, names and states for assistive technology. Start the demo with --accessibility always to read the tree.',
    component: A11yPanel, sources: ['res://src/a11y-panel.tsx'],
  },
  {
    id: 'hidpi', kind: 'inline', group: 'Platform', title: 'High-DPI text and edges',
    description: 'Crisp glyphs, borders, carets and focus rings at device pixel ratios of one and two.',
    component: HidpiLab, sources: ['res://src/hidpi-lab.tsx'],
  },
  {
    id: 'benchmark', kind: 'inline', group: 'Performance', title: 'Benchmark',
    description: 'Mount and update hundreds or thousands of cells and watch what a change costs.',
    component: BenchmarkExplorer, sources: ['res://src/benchmark-explorer.tsx', 'res://src/benchmark.tsx'],
  },
]);

/** A lab that is a component: all but the scenes. `showLab` and `labElement` take these. */
type ComponentLab = Extract<(typeof LABS)[number], { readonly component: ComponentType }>;

/** The ids of the labs a verifier can render in place of the app (`godotReactDemo.showLab`). */
export type LabName = ComponentLab['id'];

/** The lab `id` names, or `undefined`. */
export function findLab(id: string, labs: readonly Lab[] = LABS): Lab | undefined {
  return labs.find(lab => lab.id === id);
}

/** The page of the lab `name`, to render in place of the app. */
export function labElement(name: LabName): ReactElement {
  const lab = findLab(name);
  if (lab === undefined || lab.kind === 'scene') throw new Error(`There is no lab page named ${name}`);
  return createElement(lab.component);
}

/** `labs` in the sidebar's order: by group, then as the array lists them. */
export function labsInOrder(labs: readonly Lab[]): readonly Lab[] {
  return LAB_GROUPS.flatMap(group => labs.filter(lab => lab.group === group));
}

/**
 * The labs that match what was typed in the filter: every word must appear in the lab's title, description, group or id, in any
 * case. Nothing typed matches every lab.
 */
export function filterLabs(labs: readonly Lab[], query: string): readonly Lab[] {
  const words = query.toLowerCase().split(/\s+/u).filter(word => word !== '');
  if (words.length === 0) return labs;
  return labs.filter(lab => {
    const haystack = `${lab.title} ${lab.description} ${lab.group} ${lab.id}`.toLowerCase();
    return words.every(word => haystack.includes(word));
  });
}
