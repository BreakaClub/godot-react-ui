import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { RequestCancelled, SERVER_CANCELLED, parseTranspileResult, type LspMessage, type LspReply, type RequestScope, type TranspileResult, type TscHost } from 'godot-tsc/host';
import { CLI_FIX, godotTscCli } from '../scripts/godot-tsc.mjs';

// The transpiler as a live session's host in Node tests: Bun's parser and printer through the godot-tsc package's `godot-tsc-cli` process
// (one spawn for each transpile), answered the way the extension answers, later and not at all once the request's scope was cancelled.
// Checks are not run: the language server answers a workspace check as superseded, and hovers and hints with nothing. The npm package does not
// ship the process: a checkout of godot-tsc builds it (`pnpm build:native --cli` there), and the tests that need it run when `GODOT_TSC_CLI`
// names it (scripts/godot-tsc.mjs). Without the variable they are skipped, which is how CI runs them.

const CLI = godotTscCli();
export const NEEDS_CLI = CLI === undefined ? `no godot-tsc-cli: ${CLI_FIX}` : false;
const FRAME_HEADER_BYTES = 4;

export function compileWithCli(path: string, source: string, refresh: boolean): TranspileResult {
  const body = Buffer.from(JSON.stringify({ op: 'transpile', path, source, refresh }));
  const header = Buffer.alloc(FRAME_HEADER_BYTES);
  header.writeUInt32LE(body.length);
  if (CLI === undefined) throw new Error(`No godot-tsc-cli: ${CLI_FIX}.`);
  const reply = spawnSync(CLI, [], { input: Buffer.concat([header, body]), maxBuffer: 64 * 1024 * 1024 });
  assert.equal(reply.status, 0, `the compiler exited ${reply.status}`);
  return parseTranspileResult(reply.stdout.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + reply.stdout.readUInt32LE(0)).toString('utf8'));
}

export interface CliHostOptions {
  /** Holds the answer of a compile until the returned promise settles: a service that is busy. */
  readonly hold?: (path: string, source: string) => Promise<void>;
  /** Told of each compile request as it is made (before it is held). */
  readonly onRequest?: (path: string, source: string) => void;
  /** Holds the answer of a check until the returned promise settles; a check that is held is taken back by its scope. */
  readonly holdChecks?: () => Promise<void>;
}

/** A promise that fails with `RequestCancelled` when `scope` is cancelled, and never settles otherwise (nor without a scope). */
function cancelledBy(scope: RequestScope | undefined): Promise<never> {
  return new Promise<never>((_, reject) => { scope?.onCancel(() => reject(new RequestCancelled())); });
}

export function cliHost(options: CliHostOptions = {}): TscHost {
  return {
    async transpile(path, source, transpileOptions = {}, scope) {
      scope?.throwIfCancelled();
      options.onRequest?.(path, source);
      // A request that is held is taken back by its scope, as the extension takes a request back: it fails at once, not when the hold ends.
      if (options.hold !== undefined) await Promise.race([options.hold(path, source), cancelledBy(scope)]);
      scope?.throwIfCancelled();
      return compileWithCli(path, source, transpileOptions.reactRefresh ?? false);
    },
    setFile() {},
    setFiles() {},
    removeFile() {},
    async lsp(message: LspMessage, scope?: RequestScope): Promise<LspReply> {
      scope?.throwIfCancelled();
      const answer = (body: Pick<LspMessage, 'result' | 'error'>): LspReply => ({ messages: [{ jsonrpc: '2.0', id: message.id ?? null, ...body }], serviceMs: 0 });
      switch (message.method) {
        case 'initialize':
          return answer({ result: { capabilities: {} } });
        case 'workspace/diagnostic':
          // A check that is held is taken back by its scope, as the extension takes a request back.
          if (options.holdChecks !== undefined) await Promise.race([options.holdChecks(), cancelledBy(scope)]);
          return answer({ error: { code: SERVER_CANCELLED, message: 'checks are not run in these tests' } });
        case 'textDocument/inlayHint':
          return answer({ result: [] });
        default:
          // A notification has no answer; any other request (a hover) finds nothing.
          return message.id === undefined ? { messages: [], serviceMs: 0 } : answer({ result: null });
      }
    },
    close() {},
  };
}
