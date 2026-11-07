// Proves: Monaco's model layer (TextModel: piece-tree buffer, edits, undo/redo, decorations incl. injected text,
// tokenization) runs headless in Node with the browser globals trapped, via deep imports and a hand-built service set.
//
//   node --require experiments/code-editor/frameworks/trap-globals.cjs experiments/code-editor/frameworks/monaco/probe-model.mjs
// (add STUB_CSS=1 to the environment only for the full-API attempts in import-probe.cjs; the model chain imports no CSS.)
import { TextModel } from 'monaco-editor/editor/common/model/textModel.js';
import { InstantiationService } from 'monaco-editor/platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from 'monaco-editor/platform/instantiation/common/serviceCollection.js';
import { IUndoRedoService } from 'monaco-editor/platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from 'monaco-editor/platform/undoRedo/common/undoRedoService.js';
import { ILanguageService } from 'monaco-editor/editor/common/languages/language.js';
import { LanguageService } from 'monaco-editor/editor/common/services/languageService.js';
import { ILanguageConfigurationService, LanguageConfigurationService } from 'monaco-editor/editor/common/languages/languageConfigurationRegistry.js';
import { IConfigurationService } from 'monaco-editor/platform/configuration/common/configuration.js';
import { Event } from 'monaco-editor/base/common/event.js';
import { ITreeSitterLibraryService } from 'monaco-editor/editor/common/services/treeSitter/treeSitterLibraryService.js';
import { Range } from 'monaco-editor/editor/common/core/range.js';
import { Selection } from 'monaco-editor/editor/common/core/selection.js';

const touchedAtLoad = globalThis.__touchedGlobals();
console.log('globals touched while importing the model chain:', touchedAtLoad);

// Services the model needs. The DOM-free ones are monaco's own; the dialog and notification services (only used when an
// undo spans several resources) and the configuration service are the smallest stubs that satisfy the constructors.
const configurationService = {
  _serviceBrand: undefined,
  getValue: () => undefined,
  onDidChangeConfiguration: Event.None,
};
const languageService = new LanguageService(false);
const languageConfigurationService = new LanguageConfigurationService(configurationService, languageService);
const undoRedoService = new UndoRedoService({ _serviceBrand: undefined }, { _serviceBrand: undefined });
const services = new ServiceCollection(
  [IConfigurationService, configurationService],
  [ILanguageService, languageService],
  [ILanguageConfigurationService, languageConfigurationService],
  [IUndoRedoService, undoRedoService],
  // TokenizationTextModelPart asks it `supportsLanguage` (tree-sitter tokenization is opt-in); say no.
  [ITreeSitterLibraryService, { _serviceBrand: undefined, supportsLanguage: () => false }],
);
const instantiationService = new InstantiationService(services, false); // non-strict: a service nobody registered is `undefined` instead of an error

const text = 'function greet(name) {\n  return `hello ${name}`;\n}\n';
const options = TextModel.DEFAULT_CREATION_OPTIONS;
let model;
try {
  model = new TextModel(text, 'plaintext', options, null, undoRedoService, languageService, languageConfigurationService, instantiationService);
} catch (error) {
  console.log('TextModel constructor FAILED:', error.stack.split('\n').slice(0, 6).join('\n'));
  console.log('touched:', globalThis.__touchedGlobals());
  process.exit(1);
}
console.log('model created. lines', model.getLineCount(), 'length', model.getValueLength(), 'line 2:', JSON.stringify(model.getLineContent(2)));

// 1. edits + events + undo
const events = [];
model.onDidChangeContent((event) => events.push(event.changes.map((c) => `${c.rangeOffset}+${c.rangeLength}->${JSON.stringify(c.text)}`).join(';')));
model.pushStackElement();
model.pushEditOperations([new Selection(1, 1, 1, 1)], [{ range: new Range(1, 1, 1, 1), text: '// greeting\n' }], () => null);
model.pushStackElement();
model.pushEditOperations([], [{ range: new Range(3, 10, 3, 14), text: 'who' }], () => null);
console.log('after two edits:', JSON.stringify(model.getValue()), 'events', events);
console.log('canUndo/undo chain: versionId', model.getVersionId(), 'alternative', model.getAlternativeVersionId());
model.undo();
console.log('after undo:', JSON.stringify(model.getLineContent(3)), '| redo available via model.redo():');
model.redo();
console.log('after redo:', JSON.stringify(model.getLineContent(3)));

// 2. decorations: a background highlight, an underline class, and an injected-text "inlay" that document offsets skip
const ids = model.deltaDecorations([], [
  { range: new Range(2, 1, 2, 9), options: { description: 'keyword-bg', className: 'hl-keyword', stickiness: 1 } },
  { range: new Range(2, 10, 2, 14), options: { description: 'underline', inlineClassName: 'squiggle' } },
  { range: new Range(2, 14, 2, 14), options: { description: 'inlay', showIfCollapsed: true, after: { content: ': string', inlineClassName: 'inlay' } } },
]);
const found = model.getDecorationsInRange(new Range(1, 1, 5, 1)).map((d) => `${d.options.description}@${d.range.toString()}`);
console.log('decorations in range:', found);
const injected = model.getInjectedTextDecorations(0).map((d) => `${d.options.after?.content}@${d.range.toString()}`);
console.log('injected text (inlay) decorations:', injected, '| line 2 content is unchanged:', JSON.stringify(model.getLineContent(2)));
model.pushEditOperations([], [{ range: new Range(2, 1, 2, 1), text: '>>' }], () => null);
console.log('decoration ranges after inserting 2 chars at line 2 col 1:', model.getDecorationsInRange(new Range(1, 1, 5, 1)).map((d) => `${d.options.description}@${d.range.toString()}`));
void ids;

// 3. offsets <-> positions, multiple selections are a view-model concept (cursor): check what the model offers
console.log('offsetAt(2,5) =', model.getOffsetAt({ lineNumber: 2, column: 5 }), 'positionAt(40) =', JSON.stringify(model.getPositionAt(40)));

// 4. tokens: plaintext has no tokenizer registered; a state-machine tokenizer is registered through the languages
// registry, which lives behind monaco-editor/editor/standalone (DOM): see probe-tokens.mjs.
console.log('tokens for line 1 (plaintext):', JSON.stringify(model.tokenization.getLineTokens(1).getCount()), 'token(s)');
console.log('touched at the end:', globalThis.__touchedGlobals());
model.dispose();
