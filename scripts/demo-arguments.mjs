/** The arguments the demo itself takes, after Godot's `--` (demo/src/launch.ts). */
const DEMO_ARGUMENT_PREFIXES = ['--lab=', '--demo='];

/**
 * `args` for Godot with the demo's own arguments after the `--` that hands them to the scripts, so `pnpm demo --lab=glass` works as
 * well as `pnpm demo -- --lab=glass`. A `--` the caller wrote is kept, not repeated, and everything else stays where it was.
 */
export function demoArguments(args) {
  const separator = args.indexOf('--');
  const engineArguments = separator === -1 ? args : args.slice(0, separator);
  const scriptArguments = separator === -1 ? [] : args.slice(separator + 1);
  const demo = engineArguments.filter(argument => DEMO_ARGUMENT_PREFIXES.some(prefix => argument.startsWith(prefix)));
  const rest = engineArguments.filter(argument => !demo.includes(argument));
  const user = [...scriptArguments, ...demo];
  return user.length === 0 ? rest : [...rest, '--', ...user];
}
