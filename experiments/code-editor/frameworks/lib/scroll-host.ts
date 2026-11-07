// Shared by the framework probes: godot-react-ui's real reconciler on the test suite's recording host, plus an
// EMULATION of a native scroll container.
//
// What is real: the reconciler, the event dispatch (`root.dispatchEvents()`), the handle (`getScrollState`,
// `scrollTo`), the commit bytes. What is emulated, and why: layout does not run in the recording host, so a scroll
// container's client size is told to the host (`defineContainer`) and its content height comes from a callback.
// The behaviours copied from native/scroll_input.rs are: `scrollTo`/`scrollBy` clamp to [0, scrollHeight -
// clientHeight] and queue a `scroll` event (scroll_to_checked -> scroll_container_to -> scrolled ->
// queue_scroll_event), and a `scroll` event still waiting for JS is replaced in place (events.rs
// `EventQueue::push_scroll`, "coalesced per container").
import type { ReactElement } from 'react';
import { KitHost } from '../../../../tests/kit-host';
import { createTestRoot } from '../../../../tests/recording-host';
import type { UIRoot } from '../../../../src';
import type { NativeScrollState, NativeSnapshotNode } from '../../../../src/native';

export interface ContainerSpec {
  clientWidth: number;
  clientHeight: number;
  /** The height of the container's content, read each time the state is asked for. */
  contentHeight(): number;
}

export class ScrollingHost extends KitHost {
  private readonly containers = new Map<string, ContainerSpec>();
  private readonly offsets = new Map<number, number>();
  /** Every scroll event this host queued (before coalescing), for friction counts. */
  scrollEventsQueued = 0;
  scrollEventsDelivered = 0;

  defineContainer(testID: string, spec: ContainerSpec): void {
    this.containers.set(testID, spec);
  }

  private specOf(tag: number): ContainerSpec | undefined {
    const testID = this.nodes.get(tag)?.props.testID;
    return typeof testID === 'string' ? this.containers.get(testID) : undefined;
  }

  stateOf(tag: number): NativeScrollState | undefined {
    const spec = this.specOf(tag);
    if (spec === undefined) return undefined;
    const scrollHeight = Math.max(spec.contentHeight(), spec.clientHeight);
    const maxScrollTop = scrollHeight - spec.clientHeight;
    return {
      scrollLeft: 0, scrollTop: Math.min(this.offsets.get(tag) ?? 0, maxScrollTop),
      scrollWidth: spec.clientWidth, scrollHeight, clientWidth: spec.clientWidth, clientHeight: spec.clientHeight,
      minScrollLeft: 0, maxScrollLeft: 0, minScrollTop: 0, maxScrollTop, thumbs: null, tracks: null,
    };
  }

  override getScrollState(tag: number): string {
    this.calls.push('getScrollState');
    return JSON.stringify(this.stateOf(tag) ?? null);
  }

  override getNodeRect(tag: number): string {
    const spec = this.specOf(tag);
    if (spec === undefined) return super.getNodeRect(tag);
    this.calls.push('getNodeRect');
    return JSON.stringify({ x: 0, y: 0, width: spec.clientWidth, height: spec.clientHeight });
  }

  override scrollTo(tag: number, left: number, top: number): string {
    this.calls.push('scrollTo');
    this.scrollRequests.push({ method: 'scrollTo', tag, x: left, y: top });
    if (this.specOf(tag) === undefined) return `node ${tag} is not a scroll container`;
    this.moveTo(tag, top);
    return '';
  }

  override scrollBy(tag: number, dx: number, dy: number): string {
    this.calls.push('scrollBy');
    this.scrollRequests.push({ method: 'scrollBy', tag, x: dx, y: dy });
    if (this.specOf(tag) === undefined) return `node ${tag} is not a scroll container`;
    this.moveTo(tag, (this.stateOf(tag)?.scrollTop ?? 0) + dy);
    return '';
  }

  /** Move a container as native does for a command or for input: clamp, then queue a coalesced scroll event. */
  moveTo(tag: number, top: number): void {
    const state = this.stateOf(tag);
    if (state === undefined) throw new Error(`node ${tag} is not a scroll container`);
    const clamped = Math.min(Math.max(top, 0), state.maxScrollTop);
    this.offsets.set(tag, clamped);
    const next = this.stateOf(tag);
    if (next === undefined) throw new Error('unreachable: the container was just read');
    this.scrollEventsQueued += 1;
    const event = this.scrollEvent(tag, {
      scrollLeft: 0, scrollTop: next.scrollTop, scrollWidth: next.scrollWidth, scrollHeight: next.scrollHeight,
      clientWidth: next.clientWidth, clientHeight: next.clientHeight,
    });
    const pending = this.events.findIndex((candidate) => candidate.type === 'scroll' && candidate.target === tag);
    if (pending >= 0) this.events[pending] = { ...event, seq: this.events[pending]!.seq };
    else this.events.push(event);
  }

  override drainEvents(): string {
    this.scrollEventsDelivered += this.events.filter((event) => event.type === 'scroll').length;
    return super.drainEvents();
  }

  tagOf(testID: string): number {
    for (const [tag, node] of this.nodes) if (node.props.testID === testID) return tag;
    throw new Error(`no node with testID ${testID}`);
  }

  /** The user scrolls the container (wheel, drag, bar): native moves it and queues the event. */
  userScrollTo(root: UIRoot, testID: string, top: number): void {
    this.moveTo(this.tagOf(testID), top);
    root.dispatchEvents();
  }
}

/** Let React's scheduler (microtasks, then timers) run until nothing is pending. */
export async function settle(rounds = 4): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
}

export interface Mounted {
  readonly host: ScrollingHost;
  readonly root: UIRoot;
  readonly errors: Error[];
  render(element: ReactElement): Promise<void>;
  /** Count of nodes of the main layer in tree order. */
  nodeCount(kind?: string): number;
  commitBytes(fromCommit?: number): number;
  commitCount(): number;
  texts(): string[];
  outline(max?: number): string;
  unmount(): void;
}

export async function mountScrolling(element: ReactElement, setup?: (host: ScrollingHost) => void): Promise<Mounted> {
  const host = new ScrollingHost();
  setup?.(host);
  const errors: Error[] = [];
  const { root } = createTestRoot(host, { onError: (error: Error) => { errors.push(error); } });
  const nodes = (): NativeSnapshotNode[] => {
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
    host, root, errors,
    async render(next) { root.render(next); await settle(); },
    nodeCount(kind) { return nodes().filter((entry) => kind === undefined || entry.kind === kind).length; },
    commitBytes(fromCommit = 0) {
      return host.commits.slice(fromCommit).reduce((total, commit) => total + JSON.stringify(commit.payload).length, 0);
    },
    commitCount() { return host.commits.length; },
    texts() { return nodes().filter((entry) => entry.kind === 'text').map((entry) => entry.text); },
    outline(max = 40) {
      const lines: string[] = [];
      const visit = (id: number, depth: number) => {
        if (lines.length >= max) return;
        const entry = host.nodes.get(id);
        if (entry === undefined) return;
        lines.push(`${'  '.repeat(depth)}${entry.kind}#${id}${entry.text ? ` ${JSON.stringify(entry.text)}` : ''}`);
        for (const child of entry.children) visit(child, depth + 1);
      };
      for (const id of host.layerRoots[0] ?? []) visit(id, 0);
      return lines.join('\n');
    },
    unmount() { root.unmount(); },
  };
  await mounted.render(element);
  return mounted;
}
