import { spawn } from 'node:child_process';

/** How long a child gets to leave after SIGTERM before it is killed. */
export const KILL_GRACE_MS = 5_000;
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];

/**
 * A writer that passes whole lines on, each starting with `prefix`, however the text arrives in chunks. `flush` writes a last line
 * that never got its newline.
 */
export function lineWriter(prefix, write) {
  let pending = '';
  return {
    push(text) {
      pending += text;
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) write(`${prefix}${line}\n`);
    },
    flush() {
      if (pending !== '') write(`${prefix}${pending}\n`);
      pending = '';
    },
  };
}

/**
 * Start `command` and wait for it, with every way out closing it: its deadline (SIGTERM, then SIGKILL after a grace), a signal sent
 * to this script (forwarded, then SIGKILL after the same grace), and this script exiting for any reason. Nothing is left running, and no
 * timer outlives the child. The child's output (both streams) is echoed to this process's stdout as it arrives and returned as `log`;
 * `outputPrefix` starts every echoed line with it, for children that run at the same time.
 *
 * Several children may be supervised at once: each has its own deadline and its own signal handlers.
 */
export async function runSupervised({ command, args, env, cwd, deadlineMs, killGraceMs = KILL_GRACE_MS, outputPrefix = '' }) {
  const child = spawn(command, args, { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  const echo = outputPrefix === '' ? undefined : lineWriter(outputPrefix, text => process.stdout.write(text));
  const collect = data => { const value = data.toString(); log += value; if (echo === undefined) process.stdout.write(value); else echo.push(value); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  let timedOut = false;
  let interrupted;
  let escalation;
  const stop = signal => {
    child.kill(signal);
    escalation ??= setTimeout(() => child.kill('SIGKILL'), killGraceMs);
  };
  const deadline = setTimeout(() => { timedOut = true; stop('SIGTERM'); }, deadlineMs);
  const forwarders = FORWARDED_SIGNALS.map(signal => [signal, () => { interrupted = signal; stop(signal); }]);
  for (const [signal, handler] of forwarders) process.on(signal, handler);
  const abandon = () => child.kill('SIGKILL');
  process.on('exit', abandon);
  try {
    const code = await new Promise((resolvePromise, reject) => { child.on('error', reject); child.on('exit', resolvePromise); });
    return { log, code, timedOut, interrupted };
  } finally {
    echo?.flush();
    clearTimeout(deadline);
    clearTimeout(escalation);
    for (const [signal, handler] of forwarders) process.off(signal, handler);
    process.off('exit', abandon);
  }
}
