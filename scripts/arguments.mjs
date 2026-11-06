// An unknown command-line argument is an error in every script that has a fixed set of options: a mistyped flag must not
// silently run the default (`pnpm verify:world --renderer=mobile` used to run Compatibility and report a pass).
import { ENGINE_FLAG } from './engine.mjs';

/**
 * Throws for the first argument that is not one of `flags`, does not start with one of `prefixes`, and is not the engine selector
 * (`--engine=<name>`, which every script that calls `selectEngine` takes; its value is checked there).
 */
export function rejectUnknownArguments(argv, { flags = [], prefixes = [] } = {}) {
  for (const argument of argv) {
    if (argument.startsWith(ENGINE_FLAG) || flags.includes(argument) || prefixes.some(prefix => argument.startsWith(prefix))) continue;
    const accepted = [...flags, ...prefixes.map(prefix => `${prefix}…`), `${ENGINE_FLAG}<name>`];
    throw new Error(`Unknown argument: ${argument} (this script takes ${accepted.join(', ')})`);
  }
}
