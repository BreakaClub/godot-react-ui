// Shared by the probes: render a React element through godot-react-ui's real reconciler into the test suite's recording host
// (tests/recording-host.ts), with no DOM, and read back what native would have been sent.
//
// Run a probe from the worktree root: node_modules/.bin/tsx experiments/code-editor/<dir>/<probe>.tsx
import type { ReactElement } from 'react';
import { RecordingHost, createTestRoot } from '../../../tests/recording-host';
import type { NativeSnapshotNode } from '../../../src/native';

export interface Rendered {
  readonly host: RecordingHost;
  /** Every error the root reported (a thrown render, an unsupported element). */
  readonly errors: Error[];
  /** The main layer as an indented outline: `kind#id "text" {props}`. */
  outline(): string;
  /** The nodes of the main layer in tree order. */
  nodes(): NativeSnapshotNode[];
  /** Total bytes of JSON the commits carried (what crossed the native boundary). */
  commitBytes(): number;
  unmount(): void;
  render(element: ReactElement): Promise<void>;
}

/** Let React's scheduler (microtasks, then a timer) run until nothing is pending. */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
}

export function mount(element: ReactElement): Promise<Rendered> {
  const host = new RecordingHost();
  const errors: Error[] = [];
  const { root } = createTestRoot(host, { onError: (error: Error) => { errors.push(error); } });
  const rendered: Rendered = {
    host, errors,
    nodes() {
      const result: NativeSnapshotNode[] = [];
      const visit = (id: number) => {
        const entry = host.nodes.get(id);
        if (entry === undefined) return;
        result.push(entry);
        for (const child of entry.children) visit(child);
      };
      for (const id of host.layerRoots[0] ?? []) visit(id);
      return result;
    },
    outline() {
      const lines: string[] = [];
      const visit = (id: number, depth: number) => {
        const entry = host.nodes.get(id);
        if (entry === undefined) return;
        const props = Object.keys(entry.props).filter((key) => key !== 'children' && key !== 'style');
        lines.push(`${'  '.repeat(depth)}${entry.kind}#${id}${entry.text ? ` ${JSON.stringify(entry.text)}` : ''}${props.length ? ` {${props.join(',')}}` : ''}`);
        for (const child of entry.children) visit(child, depth + 1);
      };
      for (const id of host.layerRoots[0] ?? []) visit(id, 0);
      return lines.join('\n');
    },
    commitBytes() {
      return host.commits.reduce((total, commit) => total + JSON.stringify(commit.payload).length, 0);
    },
    unmount() { root.unmount(); },
    async render(next) { root.render(next); await settle(); },
  };
  return rendered.render(element).then(() => rendered);
}
