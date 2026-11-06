import type { AxNode, Frame } from './ax-tree.mjs';

export interface Expectation {
  id: string; label: string; roles: string[]; enabled?: boolean; value?: [number, number]; mixed?: true; range?: [number, number];
}
export interface Reading { tree: AxNode; focusedElement?: AxNode }
export const ELEMENTS: Expectation[];
export function numeric(value: unknown): number;
/** `phase` is 0 before the Godot-side input and 1 after it; `snapshots` is the `nodes` of ready.json or mutated.json. */
export function checkElements(reading: Reading, phase: 0 | 1, snapshots: Record<string, { rect: Frame }>): string[];
export function checkFocus(reading: Reading): { failures: string[]; note?: string };
