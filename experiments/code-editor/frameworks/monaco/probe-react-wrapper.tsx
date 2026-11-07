// Proves: @monaco-editor/loader and @monaco-editor/react cannot run in godot-react-ui. The loader injects a <script>
// into document.body and waits for window.require; the React wrapper renders DOM host elements. Records the exact errors.
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/monaco/probe-react-wrapper.tsx
import { createElement as h } from 'react';
import { mount } from '../../harness/host';

async function main(): Promise<void> {
  console.log('document:', typeof document, 'window:', typeof window);
  const loader = require('@monaco-editor/loader');
  console.log('loader import OK; keys:', Object.keys(loader.default ?? loader).join(','));
  try {
    await loader.default.init();
    console.log('loader.init resolved (unexpected)');
  } catch (error) {
    console.log('loader.init() throws:', error instanceof Error ? `${error.constructor.name}: ${error.message} at ${String(error.stack).split('\n')[1]?.trim()}` : String(error));
  }
  const react = require('@monaco-editor/react');
  console.log('react wrapper import OK; keys:', Object.keys(react).join(','));
  for (const loading of ['default "Loading..."', 'loading: null']) {
    const props = { height: '300px', defaultLanguage: 'typescript', defaultValue: 'const a = 1;', ...(loading === 'loading: null' ? { loading: null } : {}) };
    try {
      const rendered = await mount(h(react.Editor, props));
      console.log(loading, '-> render errors:', rendered.errors.map((e) => e.message.split('\n')[0]));
      console.log(rendered.outline());
      rendered.unmount();
    } catch (error) {
      console.log(loading, '-> render throws:', error instanceof Error ? error.message.split('\n')[0] : String(error));
    }
  }
}
main().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
