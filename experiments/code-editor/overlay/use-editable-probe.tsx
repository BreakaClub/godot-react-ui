// Proves why use-editable (contenteditable hook, used by react-live's LiveEditor) cannot run: its layout effect needs a DOM element
// (`element.style`, `contentEditable`, `window`/`document` listeners, `window.getSelection()`). The ref a host element gets here is our
// UIHandle. `disabled: true` makes the hook a no-op, which is the only mode that runs.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/use-editable-probe.tsx
import { createElement as h, useRef } from 'react';
import { useEditable } from 'use-editable';
import { Text, View, type UIHandle } from '../../../src';
import { mountInput } from './lib/mount-input';

function Probe({ disabled }: { disabled: boolean }) {
  const ref = useRef<UIHandle | null>(null);
  // useEditable's type wants a RefObject<HTMLElement>; the point of the probe is that ours is not one.
  useEditable(ref as never, () => {}, { disabled, indentation: 2 });
  return h(View, { ref }, h(Text, null, 'x'));
}

async function main() {
  for (const withoutNavigator of [false, true]) {
    // Node 22 defines `navigator`; GodotJS does not (not verified for the Web runtime). use-editable.js line 173 returns before registering
    // any effect when `typeof navigator !== 'object'`.
    if (withoutNavigator) Reflect.deleteProperty(globalThis, 'navigator');
    console.log(`== navigator ${withoutNavigator ? 'removed' : 'present (Node 22 default)'}`);
    await both();
  }
}

async function both() {
  for (const disabled of [true, false]) {
    try {
      const m = await mountInput(h(Probe, { disabled }));
      console.log(`disabled=${disabled}: mounted, root errors ${m.errors.length}${m.errors[0] ? ' ' + m.errors[0].message : ''}`);
      m.unmount();
    } catch (error) {
      console.log(`disabled=${disabled}: THREW ${(error as Error).constructor.name}: ${(error as Error).message}`);
    }
  }
  if (typeof navigator === 'object') await handleKeys();
}

async function handleKeys() {
  const handle: unknown = await (async () => {
    let captured: unknown;
    const m = await mountInput(h(View, { ref: (value: unknown) => { if (value !== null) captured = value; } }));
    m.unmount();
    return captured;
  })();
  console.log('a host ref is a UIHandle with keys:', Object.keys(handle as object).join(', '));
  console.log('typeof handle.style =', typeof (handle as { style?: unknown }).style, '| typeof handle.addEventListener =', typeof (handle as { addEventListener?: unknown }).addEventListener);
}
main();
