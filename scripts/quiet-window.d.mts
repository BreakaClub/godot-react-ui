/** Printed by every process the library is loaded into. */
export const LOADED_MARKER: string;
/** The library, built if this source has not been built yet. */
export function quietWindowLibrary(): string;
/** What to spawn so `godot` cannot take focus. */
export function quietLaunch(
  godot: string,
  env: Record<string, string | undefined>,
  options?: { platform?: string; library?: () => string },
): { command: string; env: Record<string, string | undefined> };
/** Why this run's log says it was not quiet, or `undefined`. */
export function quietWindowProblem(log: string, platform?: string): string | undefined;
