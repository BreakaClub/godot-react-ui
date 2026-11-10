import assert from 'node:assert/strict';
import test from 'node:test';
import { LspError, SERVER_CANCELLED, fileUri, type LspMessage, type LspReply, type TscHost } from 'godot-tsc/host';
import { LspChecker, hoverText, offsetOf, positionOf } from '../demo/src/live-compile-checker';

// The code editor's checker over godot-tsc's language server (demo/src/live-compile-checker.ts), against a server the test plays: the
// conversion between the editor's UTF-16 offsets and LSP's lines and characters, the outcomes of a check, and the naming of each lab's
// project to the one server the labs share.

const TEXT = 'const a = 1;\nconst greeting: string = 2;\n\nfoo(1);\n';

test('offsets and LSP positions convert both ways, a character past a line\'s end being the end', () => {
  assert.deepEqual(positionOf(TEXT, 0), { line: 0, character: 0 });
  assert.deepEqual(positionOf(TEXT, 13), { line: 1, character: 0 });
  assert.deepEqual(positionOf(TEXT, 19), { line: 1, character: 6 });
  assert.deepEqual(positionOf(TEXT, 41), { line: 2, character: 0 }, 'the empty line');
  assert.deepEqual(positionOf(TEXT, 42), { line: 3, character: 0 });
  for (const offset of [0, 5, 12, 13, 19, 41, 42, 43, TEXT.length]) assert.equal(offsetOf(TEXT, positionOf(TEXT, offset)), offset, `offset ${offset}`);
  assert.equal(offsetOf(TEXT, { line: 0, character: 99 }), 12, 'the end of the first line, before its newline');
  assert.equal(offsetOf(TEXT, { line: 9, character: 0 }), TEXT.length, 'a line past the last is the text\'s end');
  // UTF-16: a character outside the BMP is two code units on its line, as in a JavaScript string.
  const emoji = 'x = "😀";\ny';
  assert.deepEqual(positionOf(emoji, emoji.indexOf('y')), { line: 1, character: 0 });
  assert.equal(offsetOf(emoji, { line: 0, character: 7 }), 7);
});

test('a hover\'s markdown is the name and the type, or the type alone', () => {
  assert.deepEqual(hoverText('```typescript\ngreeting: string\n```'), { name: 'greeting', type: 'string' });
  assert.deepEqual(hoverText('```typescript\nsetState: (value: number) => void\n```'), { name: 'setState', type: '(value: number) => void' });
  assert.deepEqual(hoverText('```typescript\nnumber\n```'), { name: '', type: 'number' });
  assert.throws(() => hoverText('greeting: string'), /not a TypeScript code block/u);
});

/** A language server the test plays: it records each message, and answers a request with what `answers` gives for its method. */
function server(answers: Record<string, (message: LspMessage) => Pick<LspMessage, 'result' | 'error'>>): { host: TscHost; sent: LspMessage[]; sessions: string[] } {
  const sent: LspMessage[] = [];
  /** The session each message was sent to, in step with `sent`. */
  const sessions: string[] = [];
  const host: TscHost = {
    setFile() {}, setFiles() {}, removeFile() {}, close() {},
    transpile: () => Promise.reject(new Error('not asked for')),
    lsp: (message, _scope, session = ''): Promise<LspReply> => {
      sent.push(message);
      sessions.push(session);
      if (message.id === undefined) return Promise.resolve({ messages: [], serviceMs: 0 });
      const answer = message.method === 'initialize' ? { result: { capabilities: {} } } : answers[message.method ?? '']?.(message);
      if (answer === undefined) throw new Error(`no answer for ${message.method}`);
      return Promise.resolve({ messages: [{ jsonrpc: '2.0', id: message.id, ...answer }], serviceMs: 4.5 });
    },
  };
  return { host, sent, sessions };
}

const PROJECT = { config: '/project/tsconfig.lab.json', libDir: '/libs' };
const FILE = '/project/lab/a.ts';

test('a check gives each diagnostic at offsets of its file\'s text, with TypeScript\'s category', async () => {
  // The line the server reports the error on: the second line of the text, until a line is put before it.
  let line = 1;
  const { host } = server({
    'workspace/diagnostic': () => ({
      result: {
        items: [{
          uri: fileUri(FILE), kind: 'full',
          items: [{ range: { start: { line, character: 6 }, end: { line, character: 14 } }, severity: 1, code: 2322, source: 'ts', message: "Type 'number' is not assignable to type 'string'." }],
        }, { uri: fileUri('/project/lab/b.ts'), kind: 'full', items: [] }],
        filesLoaded: 7, incomplete: [],
      },
    }),
  });
  const checker = new LspChecker(host, PROJECT, [{ path: FILE, text: TEXT }, { path: '/project/lab/b.ts', text: '' }]);
  const outcome = await checker.check();
  assert.equal(outcome.kind, 'checked');
  if (outcome.kind !== 'checked') return;
  assert.equal(outcome.serviceMs, 4.5);
  assert.equal(outcome.report.filesLoaded, 7);
  assert.deepEqual(outcome.report.diagnostics, [{ fileName: FILE, pos: 19, end: 27, code: 2322, category: 1, messageText: "Type 'number' is not assignable to type 'string'." }]);
  assert.equal(TEXT.slice(19, 27), 'greeting');
  // The checker converts with the text it has now: the same error a line further down is at its new offset.
  checker.setText(FILE, `// one more line\n${TEXT}`);
  line = 2;
  const moved = await checker.check();
  assert.ok(moved.kind === 'checked' && moved.report.diagnostics[0]?.pos === 19 + '// one more line\n'.length);
});

test('a check a newer one replaced is superseded, and one the server refuses failed', async () => {
  const replaced = new LspChecker(server({ 'workspace/diagnostic': () => ({ error: { code: SERVER_CANCELLED, message: 'replaced' } }) }).host, PROJECT, []);
  assert.deepEqual(await replaced.check(), { kind: 'superseded' });
  const refused = new LspChecker(server({ 'workspace/diagnostic': () => ({ error: { code: -32803, message: 'the lib files are missing' } }) }).host, PROJECT, []);
  assert.deepEqual(await refused.check(), { kind: 'failed', message: 'the lib files are missing' });
  assert.ok(new LspError(SERVER_CANCELLED, 'x') instanceof Error);
});

test('a hover and inlay hints are asked at LSP positions and answered at offsets', async () => {
  const { host, sent } = server({
    'textDocument/hover': () => ({ result: { contents: { kind: 'markdown', value: '```typescript\ngreeting: string\n```' }, range: { start: { line: 1, character: 6 }, end: { line: 1, character: 14 } } } }),
    'textDocument/inlayHint': () => ({ result: [
      { position: { line: 3, character: 4 }, label: 'value:', kind: 2, paddingRight: true },
      { position: { line: 0, character: 7 }, label: ': 1', kind: 1, paddingRight: false },
    ] }),
  });
  const checker = new LspChecker(host, PROJECT, [{ path: FILE, text: TEXT }]);
  assert.deepEqual(await checker.hover(FILE, 21), { name: 'greeting', type: 'string', start: 19, end: 27 });
  assert.deepEqual(sent.find(message => message.method === 'textDocument/hover')?.params, { textDocument: { uri: fileUri(FILE) }, position: { line: 1, character: 8 } });
  assert.deepEqual(await checker.inlayHints(FILE, 0, TEXT.length), [
    { position: TEXT.indexOf('1);'), kind: 'parameter', label: 'value:' },
    { position: 7, kind: 'type', label: ': 1' },
  ]);
  assert.deepEqual(sent.find(message => message.method === 'textDocument/inlayHint')?.params, {
    textDocument: { uri: fileUri(FILE) }, range: { start: { line: 0, character: 0 }, end: { line: 4, character: 0 } },
  });
});

test('each lab\'s checker is a session of its own: started once, before its first request, and ended when it closes', async () => {
  const { host, sent, sessions } = server({ 'textDocument/inlayHint': () => ({ result: [] }), shutdown: () => ({ result: null }) });
  const first = new LspChecker(host, PROJECT, [{ path: FILE, text: TEXT }]);
  const second = new LspChecker(host, { config: '/project/tsconfig.other.json', libDir: '/libs' }, [{ path: FILE, text: TEXT }]);
  await first.inlayHints(FILE, 0, 1);
  await second.inlayHints(FILE, 0, 1);
  await first.inlayHints(FILE, 0, 1);
  await second.close();
  const asked = sent.map((message, index) => `${sessions[index]} ${String(message.method)}`);
  const [one, two] = [sessions[0], sessions.find(session => session !== sessions[0])];
  assert.ok(one !== undefined && two !== undefined && one !== two, `two sessions: ${JSON.stringify(sessions)}`);
  assert.deepEqual(asked, [
    `${one} initialize`, `${one} initialized`, `${one} textDocument/inlayHint`,
    `${two} initialize`, `${two} initialized`, `${two} textDocument/inlayHint`,
    `${one} textDocument/inlayHint`,
    `${two} shutdown`, `${two} exit`,
  ]);
  const configs = sent.filter(message => message.method === 'initialize').map(message => JSON.stringify(message.params)).map(params => params.includes('tsconfig.other') ? 'other' : 'lab');
  assert.deepEqual(configs, ['lab', 'other'], 'each session is named its own lab\'s project, once');
});
