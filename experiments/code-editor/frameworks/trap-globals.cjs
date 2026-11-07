// Preloaded with `node --require`: replaces the browser globals Node does not have (and Node 22's own `navigator`) by
// accessors that record who looked at them and return undefined, so an import under Node behaves as in a runtime with
// no DOM (GodotJS has none) and we learn WHICH globals the package's load touches, from a real attempt.
const BROWSER_GLOBALS = [
  'window', 'document', 'navigator', 'self', 'location', 'history', 'screen', 'localStorage', 'sessionStorage', 'indexedDB',
  'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'Text', 'Range', 'Selection', 'DocumentFragment',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'getComputedStyle', 'matchMedia', 'CSS', 'CSSStyleSheet', 'DOMParser', 'XMLSerializer', 'Worker',
  'SharedWorker', 'AudioContext', 'KeyboardEvent', 'MouseEvent', 'InputEvent', 'FocusEvent', 'CompositionEvent', 'DragEvent',
  'ClipboardEvent', 'Image', 'Option', 'XMLHttpRequest', 'DOMException',
];
const touched = new Map();
function note(name) {
  const stack = String(new Error().stack).split('\n').slice(3).find((line) => !line.includes('trap-globals.cjs')) ?? '';
  const site = stack.trim().replace(/^at /, '').replace(/\(?file:\/\/\/[^)]*?\/node_modules\//, '(').replace(/^.*?\/node_modules\//, '');
  const entry = touched.get(name);
  if (entry === undefined) touched.set(name, { count: 1, firstSite: site });
  else entry.count += 1;
}
for (const name of BROWSER_GLOBALS) {
  Object.defineProperty(globalThis, name, { configurable: true, enumerable: false, get() { note(name); return undefined; }, set(value) { Object.defineProperty(globalThis, name, { value, writable: true, configurable: true }); } });
}
globalThis.__touchedGlobals = () => Object.fromEntries([...touched].map(([name, entry]) => [name, `${entry.count}x, first at ${entry.firstSite}`]));

// STUB_CSS=1: a `.css` import (bundler territory: monaco-editor's ESM has hundreds) loads as an empty module instead of
// ending the attempt with ERR_UNKNOWN_FILE_EXTENSION, so the attempt can show what fails NEXT. Node >= 22.15 `registerHooks`.
if (process.env.STUB_CSS === '1') {
  require('node:module').registerHooks({
    load(url, context, nextLoad) {
      if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
      return nextLoad(url, context);
    },
  });
}
