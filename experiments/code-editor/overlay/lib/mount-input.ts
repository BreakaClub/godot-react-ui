// A mount() like experiments/code-editor/harness/host.ts, but on tests/text-input-host.ts (which simulates native's beforeinput ->
// edit -> input pipeline) and exposing the root and host, so a probe can click a button or type into a TextInput.
// The harness's mount() hides the root, and I may not edit the harness.
import type { ReactElement } from 'react';
import type { UIRoot } from '../../../../src';
import type { NativeSnapshotNode } from '../../../../src/native';
import { createTestRoot } from '../../../../tests/recording-host';
import { TextInputHost } from '../../../../tests/text-input-host';

export interface Mounted {
  readonly host: TextInputHost;
  readonly root: UIRoot;
  readonly errors: Error[];
  nodes(): NativeSnapshotNode[];
  outline(): string;
  render(element: ReactElement): Promise<void>;
  click(tag: number): Promise<void>;
  /** Focus a text input the way native would on a press, then type `text` a character at a time. */
  type(tag: number, text: string): Promise<void>;
  settle(): Promise<void>;
  unmount(): void;
}

export async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
}

export async function mountInput(element: ReactElement): Promise<Mounted> {
  const host = new TextInputHost();
  const errors: Error[] = [];
  const { root } = createTestRoot(host, { onError: (error: Error) => { errors.push(error); } });
  const nodes = () => {
    const result: NativeSnapshotNode[] = [];
    const visit = (id: number) => {
      const entry = host.nodes.get(id);
      if (entry === undefined) return;
      result.push(entry);
      for (const child of entry.children) visit(child);
    };
    for (const id of host.layerRoots[0] ?? []) visit(id);
    return result;
  };
  const mounted: Mounted = {
    host, root, errors, nodes, settle,
    outline() {
      const lines: string[] = [];
      const visit = (id: number, depth: number) => {
        const entry = host.nodes.get(id);
        if (entry === undefined) return;
        const value = host.textInputs.get(id)?.value;
        lines.push(`${'  '.repeat(depth)}${entry.kind}#${id}${entry.text ? ` ${JSON.stringify(entry.text)}` : ''}${value !== undefined ? ` value=${JSON.stringify(value)}` : ''}`);
        for (const child of entry.children) visit(child, depth + 1);
      };
      for (const id of host.layerRoots[0] ?? []) visit(id, 0);
      return lines.join('\n');
    },
    async render(next) { root.render(next); await settle(); },
    async click(tag) { host.event(tag, 'click'); root.dispatchEvents(); await settle(); },
    async type(tag, text) { root.getSnapshot(); host.focused = tag; host.type(root, text, tag); await settle(); },
    unmount() { root.unmount(); },
  };
  await mounted.render(element);
  return mounted;
}
