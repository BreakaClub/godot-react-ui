import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LiveCompileHost } from '../demo/src/live-compile-host';
import { parseCompileResult, type CheckOutcome, type CompileResult } from '../demo/src/live-compile-protocol';
import { RequestCancelled } from '../demo/src/live-compile-scope';

// The compiler as a live session's host in Node tests: Bun's parser and printer through the `live-compile-cli` process (one spawn for each
// compile, `node scripts/build-live-compile.mjs --cli`), answered the way the extension answers, later and not at all once the request's scope
// was cancelled. Checks are not run.

const root = resolve(__dirname, '..');
export const CLI = resolve(root, 'live-compile/target/release/live-compile-cli');
export const NEEDS_CLI = existsSync(CLI) ? false : 'live-compile-cli is not built: run `node scripts/build-live-compile.mjs --cli`';
const FRAME_HEADER_BYTES = 4;
const NEVER_CHECKED: CheckOutcome = { kind: 'superseded', by: 0 };

export function compileWithCli(path: string, source: string, refresh: boolean): CompileResult {
  const body = Buffer.from(JSON.stringify({ op: 'transpile', path, source, refresh }));
  const header = Buffer.alloc(FRAME_HEADER_BYTES);
  header.writeUInt32LE(body.length);
  const reply = spawnSync(CLI, [], { input: Buffer.concat([header, body]), maxBuffer: 64 * 1024 * 1024 });
  assert.equal(reply.status, 0, `the compiler exited ${reply.status}`);
  return parseCompileResult(reply.stdout.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + reply.stdout.readUInt32LE(0)).toString('utf8'));
}

export interface CliHostOptions {
  /** Holds the answer of a compile until the returned promise settles: a service that is busy. */
  readonly hold?: (path: string, source: string) => Promise<void>;
  /** Told of each compile request as it is made (before it is held). */
  readonly onRequest?: (path: string, source: string) => void;
}

export function cliHost(options: CliHostOptions = {}): LiveCompileHost {
  return {
    async compile(path, source, refresh, scope) {
      scope.throwIfCancelled();
      options.onRequest?.(path, source);
      // A request that is held is taken back by its scope, as the extension takes a request back: it fails at once, not when the hold ends.
      if (options.hold !== undefined) {
        await Promise.race([
          options.hold(path, source),
          new Promise<never>((_, reject) => { scope.onCancel(() => reject(new RequestCancelled())); }),
        ]);
      }
      scope.throwIfCancelled();
      return compileWithCli(path, source, refresh);
    },
    setFile() {},
    setFiles() {},
    requestCheck: () => Promise.resolve(NEVER_CHECKED),
    hover: () => Promise.resolve(null),
    inlayHints: () => Promise.resolve([]),
    close() {},
  };
}
