import type { ChangeDesc } from '@codemirror/state';
import type { EditorModel } from './model';

/**
 * Results of the asynchronous services (a type check, inlay hints) arrive for the version of the text that was sent, not the text
 * now. An annotation set holds them in the coordinates of the current text: a result for an older version is mapped through the
 * edits made since, and refused when the model no longer knows those edits, so one is never drawn in the wrong place. Every edit
 * that follows keeps the set mapped.
 */

export type AnnotationOutcome = 'applied' | 'mapped' | 'refused';

/** A range of the text that carries a message: a diagnostic. */
export interface RangeAnnotation {
  readonly from: number;
  readonly to: number;
}

/** A point of the text that carries a label: an inlay hint. */
export interface PointAnnotation {
  readonly at: number;
}

/**
 * How an annotation moves with edits. Returning `undefined` drops it: the text it described is gone.
 */
export type Remap<T> = (annotation: T, changes: ChangeDesc) => T | undefined;

/** A range follows its text: its start stays after an insertion at the start, its end before one at the end; text deleted from under it drops it. */
export function remapRange<T extends RangeAnnotation>(annotation: T, changes: ChangeDesc): T | undefined {
  const from = changes.mapPos(annotation.from, 1);
  const to = changes.mapPos(annotation.to, -1);
  if (to <= from) return undefined;
  return from === annotation.from && to === annotation.to ? annotation : { ...annotation, from, to };
}

/** A point moves with the text before it; an insertion at the point goes after it. */
export function remapPoint<T extends PointAnnotation>(annotation: T, changes: ChangeDesc): T | undefined {
  const at = changes.mapPos(annotation.at, -1);
  return at === annotation.at ? annotation : { ...annotation, at };
}

export class AnnotationSet<T> {
  private held: readonly T[] = [];
  private readonly remap: Remap<T>;

  constructor(remap: Remap<T>) {
    this.remap = remap;
  }

  get items(): readonly T[] {
    return this.held;
  }

  /**
   * Replaces the set with `items`, which were computed for the text of `version`. Returns what became of them: `applied` as they are,
   * `mapped` through the edits since, or `refused` when those edits are no longer known (the old set stays).
   */
  replace(model: EditorModel, version: number, items: readonly T[]): AnnotationOutcome {
    const changes = model.changesSince(version);
    if (changes === undefined) return 'refused';
    if (version === model.version) {
      this.held = items;
      return 'applied';
    }
    this.held = items.flatMap(item => remapped(this.remap, item, changes));
    return 'mapped';
  }

  /** Keeps the set in step with one edit. */
  follow(changes: ChangeDesc): void {
    if (this.held.length === 0) return;
    this.held = this.held.flatMap(item => remapped(this.remap, item, changes));
  }

  clear(): void {
    this.held = [];
  }
}

function remapped<T>(remap: Remap<T>, item: T, changes: ChangeDesc): T[] {
  const moved = remap(item, changes);
  return moved === undefined ? [] : [moved];
}
