export interface PackEntry {
  /** Path as the engine stores it, without `res://`. */
  readonly path: string;
  readonly size: number;
}

/** The file directory of the Godot pack at `path` (format 3 or 4, unencrypted directory). */
export function readPackEntries(path: string): PackEntry[];
