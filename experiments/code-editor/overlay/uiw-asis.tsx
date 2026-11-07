// Proves @uiw/react-textarea-code-editor as is (no shim): it renders a div > textarea + a div whose content is an HTML STRING (dangerouslySetInnerHTML).
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/uiw-asis.tsx
import { createElement as h } from 'react';
import Uiw from '@uiw/react-textarea-code-editor';
import { mount } from '../harness/host';

async function main() {
  try {
    const m = await mount(h(Uiw, { value: 'const a = 1;', language: 'tsx' }));
    console.log(m.outline());
  } catch (error) { console.log('as is: mount threw:', (error as Error).message.split('\n')[0]); }
  try {
    const m = await mount(h(Uiw, { value: 'const a = 1;', language: 'tsx', prefixCls: '' } as never));
    console.log(m.outline());
  } catch (error) { console.log('with prefixCls="" (so no unknown class): mount threw:', (error as Error).message.split('\n')[0]); }
}
main();
