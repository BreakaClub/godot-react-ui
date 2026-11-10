import type { AxNode, Frame } from './ax-tree.mjs';

export interface Expectation {
  id: string; label: string; roles: string[]; enabled?: boolean; value?: [number, number]; mixed?: true; range?: [number, number]; engineGap?: string; scroll?: true; actions?: string[];
  /** The scroll bar elements the element has as children, by axis, horizontal first. */
  bars?: Array<'x' | 'y'>;
}
/** The native scroll state of a scroll container, as `NativeScrollState` reports it: what its scroll bars must say. */
export interface SnapshotScroll {
  scrollLeft: number; scrollTop: number; minScrollLeft: number; maxScrollLeft: number; minScrollTop: number; maxScrollTop: number;
  tracks: { x: Frame | null; y: Frame | null } | null;
}
export interface SnapshotElement { rect: Frame; scroll?: SnapshotScroll }
export interface Reading { tree: AxNode; focusedElement?: AxNode }
export const ELEMENTS: Expectation[];
export const SCROLL_ITEMS: Array<{ id: string; label: string; roles: string[] }>;
export function numeric(value: unknown): number;
/** `phase` is 0 before the Godot-side input and 1 after it; `snapshots` is the `nodes` of ready.json or mutated.json. */
/** What the engine cannot convey is appended to `notes`, not reported as a failure. */
/** `mixedGap`: the engine is the one the mixed-checkbox gap was recorded on (stock); anywhere else the mixed state must be conveyed. */
export function checkElements(reading: Reading, phase: 0 | 1, snapshots: Record<string, SnapshotElement>, notes?: string[], options?: { mixedGap?: boolean }): string[];
export function checkFocus(reading: Reading): { failures: string[]; note?: string };
