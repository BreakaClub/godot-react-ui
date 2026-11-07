export interface Edit {
  readonly search: string;
  readonly replace: string;
}
export interface AnchoredEdit extends Edit {
  /** Text in the edited file whose first character is where the problem is reported. */
  readonly anchor: string;
}
export interface TypeErrorEdit extends AnchoredEdit {
  /** TypeScript's code for the error. */
  readonly code: number;
}
export const INPUTS_LAB_PATH: string;
export const RECOLOUR: readonly Edit[];
export const BACKGROUND_COLOURS: readonly string[];
export const HOOK_ORDER: readonly Edit[];
export const SYNTAX_ERROR: AnchoredEdit;
export const THROW_IN_RENDER: readonly Edit[];
export const THROW_IN_MODULE: readonly Edit[];
export const TYPE_ERROR: TypeErrorEdit;
export function applyEdits(text: string, edits: readonly Edit[]): string;
export function anchorOffset(edited: string, anchor: string): number;
