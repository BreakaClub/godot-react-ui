import type { CommitPayload } from './commit';
import type { NativeKind } from './props';
import type { TransitionProperty } from './types';

export type { NativeKind } from './props';

/** A Godot `PackedInt64Array`, as much of it as the renderer reads. */
export interface PackedTags {
  size(): number;
  get(index: number): number;
}

/** The ClassDB-facing API. Structural typing also permits fake hosts in tests. */
export interface NativeHost {
  /**
   * Apply one layer's commit payload (a JSON string, plan 4.1). An empty string means success;
   * anything else says why nothing changed.
   */
  commit(layer: number, payloadJson: string): string;
  /** The tags the last successful `commit` deleted. */
  takeCommitDeletions(): PackedTags;
  drainEvents(): string;
  getSnapshot(): string;
  /** The root-local rectangle of a node as JSON, or `null`. */
  getNodeRect(tag: number): string;
  /** The tag of the first node created with `testId`, or -1. */
  findByTestId(testId: string): number;
  /**
   * `element.setPointerCapture(pointerId)`: the element receives the pointer's events until it is
   * released, the pointer goes up or is cancelled, or the element is removed. An empty string means
   * success; anything else says why nothing changed.
   */
  setPointerCapture(tag: number, pointerId: number): string;
  /** Only the capturing element can release; any other call does nothing. An empty string means success. */
  releasePointerCapture(tag: number, pointerId: number): string;
  hasPointerCapture(tag: number, pointerId: number): boolean;
  /**
   * Answer the one event native is awaiting (`cancelable: true`). An empty string means success.
   * `dropEffect` is '' (not set), 'none', 'copy', 'move' or 'link'.
   */
  resolveEvent(seq: number, defaultPrevented: boolean, dropEffect: string): string;
}

export interface NativeDiagnosticsHost extends NativeHost {
  setProfiling(enabled: boolean): void;
  takeProfile(): string;
  getActivity(): string;
}

export interface NativeActivity {
  batches: number;
  layoutPasses: number;
  paintPasses: number;
  animationFrames: number;
  animating: boolean;
  trackedTransitions: number;
  clockMs: number;
  drawSerial: number;
  nodeCount: number;
  /** Commit counters (plan 4.5): what the mounting and render layers did, cumulatively. */
  mutations: number;
  nodesUpdated: number;
  nodesRestyled: number;
  boxRecords: number;
  contentRecords: number;
}

export interface NativeTransition {
  id: number;
  property: TransitionProperty;
  current: number | string;
  target: number | string;
  startedAtMs: number;
  durationMs: number;
}

type NativeSampleKind = 'batch' | 'frame' | 'draw';
export interface NativeTimingSample {
  kind: NativeSampleKind;
  [field: string]: number | NativeSampleKind;
}
export interface NativeProfile {
  samples: NativeTimingSample[];
  dropped: number;
  counters: NativeActivity;
}

export type NativePointerEventType =
  | 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerenter' | 'pointerleave' | 'pointercancel'
  | 'click' | 'dblclick' | 'auxclick' | 'contextmenu';
export type NativeWheelEventType = 'wheel';
export type NativeFocusEventType = 'focus' | 'blur';
export type NativeEventType = NativePointerEventType | NativeWheelEventType | NativeFocusEventType;

/** '' is synthetic keyboard activation, as in browsers. */
export type NativePointerType = 'mouse' | 'touch' | '';

interface NativeEventBase {
  /** Monotonic per root, starting at 1. */
  seq: number;
  /** 0 addresses root listeners only. */
  target: number;
  /** The target and then its ancestors up to its layer's top-level node; empty for target 0. */
  path: number[];
  /** True only while native is blocked waiting for `resolveEvent(seq, ...)`. */
  cancelable: boolean;
  /** Milliseconds on the engine tick clock when native queued the event. */
  timeStamp: number;
}

/** What every event with a pointer position carries. */
export interface NativeMouseFields extends NativeEventBase {
  /** Root-local logical pixels. */
  x: number;
  y: number;
  /** Canvas coordinates. */
  viewportX: number;
  viewportY: number;
  pointerId: number;
  pointerType: NativePointerType;
  /** DOM `button`, -1 when the event is not a button change. */
  button: number;
  /** DOM `buttons` bitmask. */
  buttons: number;
  /** Click count. */
  detail: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface NativePointerEvent extends NativeMouseFields {
  type: NativePointerEventType;
  /** Enter and leave events: the element left towards or entered from. */
  relatedTarget: number | null;
  /** Enter and leave events: `relatedTarget`'s path (empty if none). */
  relatedPath: number[];
}

/** A wheel tick or trackpad pan; cancelable. Deltas are in wheel ticks, positive down and right. */
export interface NativeWheelEvent extends NativeMouseFields {
  type: NativeWheelEventType;
  deltaX: number;
  deltaY: number;
}

export interface NativeFocusEvent extends NativeEventBase {
  type: NativeFocusEventType;
}

export type NativeEvent = NativePointerEvent | NativeWheelEvent | NativeFocusEvent;

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeSnapshotNode {
  id: number;
  kind: NativeKind;
  /** 0 is the main layer, 1 the overlay layer. */
  layer: number;
  text: string;
  parent: number | null;
  children: number[];
  rect: LayoutRect;
  clipRect: LayoutRect | null;
  presentation: { width: number; height: number; widthIsAuto: boolean; heightIsAuto: boolean; opacity: number; backgroundColor: string };
  /** The node's computed style: inherited values, then every style layer that applies. */
  style: Record<string, unknown>;
  /** The native props the node was last given (`style` as compiled layers, `text`, `disabled`, ...). */
  props: Record<string, unknown>;
}

export interface NativeSnapshot {
  clockMs: number;
  transitions: NativeTransition[];
  nodes: NativeSnapshotNode[];
  stats: {
    layoutPasses: number;
    /** Successful commits. */
    batches: number;
    nodeCount: number;
    paintPasses: number;
    layoutMicros: number;
    nodesCreated: number;
    nodesUpdated: number;
    nodesDeleted: number;
    /** Nodes whose computed style changed and was published (commit, hover, press, focus, breakpoint). */
    nodesRestyled: number;
    /** Removes, deletes, creates, updates and inserts the mounting layer applied. */
    mutations: number;
    /** Canvas-item command lists re-recorded: boxes (background, border) and contents (text). */
    boxRecords: number;
    contentRecords: number;
  };
  width: number;
  height: number;
  hovered: number | null;
  focused: number | null;
  pressed: number | null;
  /** Every pointer native knows: the mouse, and each touch while it is down. */
  pointers: NativePointerState[];
}

export interface NativePointerState {
  id: number;
  type: 'mouse' | 'touch';
  /** Root-local logical pixels. */
  x: number;
  y: number;
  /** DOM `buttons`. */
  buttons: number;
  /** A button (or the touch contact) is down. */
  down: boolean;
  /** The element receiving the pointer's events regardless of what is under it. */
  capture: { target: number; implicit: boolean } | null;
}

const MAX_NODE_ID = 0xffff_ffff;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid native ${label}: expected an object`);
  }
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid native ${label}: expected a finite number`);
  }
  return value;
}

function id(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result) || result < 0 || result > MAX_NODE_ID) {
    throw new Error(`Invalid native ${label}: expected a u32 node ID`);
  }
  return result;
}

function optionalId(value: unknown, label: string): number | null {
  return value === null ? null : id(value, label);
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid native ${label}: expected a string`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid native ${label}: expected a boolean`);
  return value;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Invalid native ${label}: expected an array`);
  return value;
}

function kind(value: unknown): NativeKind {
  if (value === 'view' || value === 'text' || value === 'button') return value;
  throw new Error(`Invalid native node kind: ${String(value)}`);
}

function eventType(value: unknown): NativeEventType {
  switch (value) {
    case 'pointerdown': case 'pointerup': case 'pointermove': case 'pointerenter':
    case 'pointerleave': case 'pointercancel': case 'click': case 'dblclick': case 'auxclick':
    case 'contextmenu': case 'wheel': case 'focus': case 'blur':
      return value;
    default:
      throw new Error(`Invalid native event type: ${String(value)}`);
  }
}

function pointerType(value: unknown): NativePointerType {
  if (value === 'mouse' || value === 'touch' || value === '') return value;
  throw new Error(`Invalid native pointer type: ${String(value)}`);
}

function nonnegativeInteger(value: unknown, label: string): number {
  const result = number(value, label);
  if (!Number.isInteger(result) || result < 0) {
    throw new Error(`Invalid native ${label}: expected a nonnegative integer`);
  }
  return result;
}

function idList(value: unknown, label: string): number[] {
  return array(value, label).map((entry) => id(entry, label));
}

function mouseFields(base: NativeEventBase, event: Record<string, unknown>): NativeMouseFields {
  return {
    ...base,
    x: number(event.x, 'event.x'), y: number(event.y, 'event.y'),
    viewportX: number(event.viewportX, 'event.viewportX'), viewportY: number(event.viewportY, 'event.viewportY'),
    pointerId: nonnegativeInteger(event.pointerId, 'event.pointerId'),
    pointerType: pointerType(event.pointerType),
    button: number(event.button, 'event.button'),
    buttons: nonnegativeInteger(event.buttons, 'event.buttons'),
    detail: nonnegativeInteger(event.detail, 'event.detail'),
    shiftKey: boolean(event.shiftKey, 'event.shiftKey'), ctrlKey: boolean(event.ctrlKey, 'event.ctrlKey'),
    altKey: boolean(event.altKey, 'event.altKey'), metaKey: boolean(event.metaKey, 'event.metaKey'),
  };
}

function pointerEvent(type: NativePointerEventType, base: NativeEventBase, event: Record<string, unknown>): NativePointerEvent {
  return {
    ...mouseFields(base, event), type,
    relatedTarget: optionalId(event.relatedTarget, 'event.relatedTarget'),
    relatedPath: event.relatedPath === undefined ? [] : idList(event.relatedPath, 'event.relatedPath'),
  };
}

function wheelEvent(base: NativeEventBase, event: Record<string, unknown>): NativeWheelEvent {
  return {
    ...mouseFields(base, event), type: 'wheel',
    deltaX: number(event.deltaX, 'event.deltaX'), deltaY: number(event.deltaY, 'event.deltaY'),
  };
}

function nativeEvent(entry: unknown): NativeEvent {
  const event = record(entry, 'event');
  const base: NativeEventBase = {
    seq: nonnegativeInteger(event.seq, 'event.seq'),
    target: id(event.target, 'event.target'),
    path: idList(event.path, 'event.path'),
    cancelable: boolean(event.cancelable, 'event.cancelable'),
    timeStamp: number(event.timeStamp, 'event.timeStamp'),
  };
  const type = eventType(event.type);
  switch (type) {
    case 'pointerdown': case 'pointerup': case 'pointermove': case 'pointerenter':
    case 'pointerleave': case 'pointercancel': case 'click': case 'dblclick': case 'auxclick':
    case 'contextmenu':
      return pointerEvent(type, base, event);
    case 'wheel':
      return wheelEvent(base, event);
    case 'focus': case 'blur':
      return { ...base, type };
  }
}

function rect(value: unknown, label: string): LayoutRect {
  const object = record(value, label);
  return {
    x: number(object.x, `${label}.x`), y: number(object.y, `${label}.y`),
    width: number(object.width, `${label}.width`), height: number(object.height, `${label}.height`),
  };
}

function transitionProperty(value: unknown): TransitionProperty {
  if (value === 'width' || value === 'height' || value === 'opacity' || value === 'backgroundColor') return value;
  throw new Error(`Invalid native transition property: ${String(value)}`);
}

function transitionValue(value: unknown): number | string {
  return typeof value === 'string' ? value : number(value, 'transition value');
}

export function readActivity(host: NativeDiagnosticsHost): NativeActivity {
  const value: unknown = JSON.parse(host.getActivity());
  return parseActivity(value);
}

function parseActivity(value: unknown): NativeActivity {
  const activity = record(value, 'activity');
  if (typeof activity.animating !== 'boolean') throw new Error('Native activity.animating must be boolean');
  return {
    batches: number(activity.batches, 'batches'),
    layoutPasses: number(activity.layoutPasses, 'layoutPasses'),
    paintPasses: number(activity.paintPasses, 'paintPasses'),
    animationFrames: number(activity.animationFrames, 'animationFrames'),
    animating: activity.animating,
    trackedTransitions: number(activity.trackedTransitions, 'trackedTransitions'),
    clockMs: number(activity.clockMs, 'clockMs'),
    drawSerial: number(activity.drawSerial, 'drawSerial'),
    nodeCount: number(activity.nodeCount, 'nodeCount'),
    mutations: number(activity.mutations, 'mutations'),
    nodesUpdated: number(activity.nodesUpdated, 'nodesUpdated'),
    nodesRestyled: number(activity.nodesRestyled, 'nodesRestyled'),
    boxRecords: number(activity.boxRecords, 'boxRecords'),
    contentRecords: number(activity.contentRecords, 'contentRecords'),
  };
}

export function takeNativeProfile(host: NativeDiagnosticsHost): NativeProfile {
  const value: unknown = JSON.parse(host.takeProfile());
  const profile = record(value, 'profile');
  return {
    dropped: number(profile.dropped, 'profile dropped'), counters: parseActivity(profile.counters),
    samples: array(profile.samples, 'profile samples').map(value => {
      const fields = record(value, 'profile sample');
      const kind = fields.kind;
      if (kind !== 'batch' && kind !== 'frame' && kind !== 'draw') throw new Error('Invalid native profile sample kind');
      const sample: NativeTimingSample = {kind};
      for (const [key, value] of Object.entries(fields)) {
        if (key !== 'kind') sample[key] = number(value, `profile ${key}`);
      }
      return sample;
    }),
  };
}

export function readEvents(host: NativeHost): NativeEvent[] {
  const value: unknown = JSON.parse(host.drainEvents());
  return array(value, 'events').map(nativeEvent);
}

/** Report the outcome of an awaited (`cancelable`) event. Native rejects any other sequence number. */
export function resolveEvent(host: NativeHost, seq: number, defaultPrevented: boolean, dropEffect = ''): void {
  const error = host.resolveEvent(seq, defaultPrevented, dropEffect);
  if (error !== '') throw new Error(`Native resolveEvent rejected event ${seq}: ${error}`);
}

export function readSnapshot(host: NativeHost): NativeSnapshot {
  const value: unknown = JSON.parse(host.getSnapshot());
  const snapshot = record(value, 'snapshot');
  const stats = record(snapshot.stats, 'snapshot.stats');
  return {
    clockMs: number(snapshot.clockMs, 'snapshot.clockMs'),
    transitions: array(snapshot.transitions, 'snapshot.transitions').map(value => {
      const transition = record(value, 'transition');
      return {
        id: id(transition.id, 'transition.id'), property: transitionProperty(transition.property),
        current: transitionValue(transition.current), target: transitionValue(transition.target),
        startedAtMs: number(transition.startedAtMs, 'transition.startedAtMs'),
        durationMs: number(transition.durationMs, 'transition.durationMs'),
      };
    }),
    nodes: array(snapshot.nodes, 'snapshot.nodes').map((entry) => {
      const node = record(entry, 'node');
      const presentation = record(node.presentation, 'node.presentation');
      return {
        id: id(node.id, 'node.id'),
        kind: kind(node.kind),
        layer: nonnegativeInteger(node.layer, 'node.layer'),
        text: string(node.text, 'node.text'),
        parent: optionalId(node.parent, 'node.parent'),
        children: array(node.children, 'node.children').map((child) => id(child, 'child ID')),
        rect: rect(node.rect, 'node.rect'),
        clipRect: node.clipRect === null ? null : rect(node.clipRect, 'node.clipRect'),
        presentation: {
          width: number(presentation.width, 'presentation.width'),
          height: number(presentation.height, 'presentation.height'),
          widthIsAuto: boolean(presentation.widthIsAuto, 'presentation.widthIsAuto'),
          heightIsAuto: boolean(presentation.heightIsAuto, 'presentation.heightIsAuto'),
          opacity: number(presentation.opacity, 'presentation.opacity'),
          backgroundColor: string(presentation.backgroundColor, 'presentation.backgroundColor'),
        },
        style: record(node.style, 'node.style'),
        props: record(node.props, 'node.props'),
      };
    }),
    stats: {
      layoutPasses: number(stats.layoutPasses, 'stats.layoutPasses'),
      batches: number(stats.batches, 'stats.batches'),
      nodeCount: number(stats.nodeCount, 'stats.nodeCount'),
      paintPasses: number(stats.paintPasses, 'stats.paintPasses'),
      layoutMicros: number(stats.layoutMicros, 'stats.layoutMicros'),
      nodesCreated: number(stats.nodesCreated, 'stats.nodesCreated'),
      nodesUpdated: number(stats.nodesUpdated, 'stats.nodesUpdated'),
      nodesDeleted: number(stats.nodesDeleted, 'stats.nodesDeleted'),
      nodesRestyled: number(stats.nodesRestyled, 'stats.nodesRestyled'),
      mutations: number(stats.mutations, 'stats.mutations'),
      boxRecords: number(stats.boxRecords, 'stats.boxRecords'),
      contentRecords: number(stats.contentRecords, 'stats.contentRecords'),
    },
    width: number(snapshot.width, 'snapshot.width'),
    height: number(snapshot.height, 'snapshot.height'),
    hovered: optionalId(snapshot.hovered, 'snapshot.hovered'),
    focused: optionalId(snapshot.focused, 'snapshot.focused'),
    pressed: optionalId(snapshot.pressed, 'snapshot.pressed'),
    pointers: array(snapshot.pointers, 'snapshot.pointers').map((entry) => {
      const pointer = record(entry, 'pointer');
      const type = pointer.type;
      if (type !== 'mouse' && type !== 'touch') throw new Error(`Invalid native pointer kind: ${String(type)}`);
      const capture = pointer.capture === null ? null : record(pointer.capture, 'pointer.capture');
      return {
        id: nonnegativeInteger(pointer.id, 'pointer.id'), type,
        x: number(pointer.x, 'pointer.x'), y: number(pointer.y, 'pointer.y'),
        buttons: nonnegativeInteger(pointer.buttons, 'pointer.buttons'),
        down: boolean(pointer.down, 'pointer.down'),
        capture: capture === null ? null : { target: id(capture.target, 'capture.target'), implicit: boolean(capture.implicit, 'capture.implicit') },
      };
    }),
  };
}

export interface CommitTiming {
  jsonEncodeMs: number;
  nativeCallMs: number;
  jsonChars: number;
}

/** Send one layer's commit payload. Throws, leaving the mounted tree unchanged, if native rejects it. */
export function commitPayload(host: NativeHost, layer: number, payload: CommitPayload, now?: () => number): CommitTiming | undefined {
  const encodeStart = now?.();
  const json = JSON.stringify(payload);
  const callStart = now?.();
  const error = host.commit(layer, json);
  const callEnd = now?.();
  if (error !== '') throw new Error(`Native UI commit rejected: ${error}`);
  if (encodeStart === undefined || callStart === undefined || callEnd === undefined) return;
  return {jsonEncodeMs: callStart - encodeStart, nativeCallMs: callEnd - callStart, jsonChars: json.length};
}

/** Throw if native refused a pointer-capture request (DOM throws `NotFoundError` or `InvalidStateError`). */
export function checkCapture(error: string, method: string): void {
  if (error !== '') throw new Error(`${method} failed: ${error}`);
}

/** The tags the commit that just succeeded deleted. */
export function readDeletions(host: NativeHost): number[] {
  const tags = host.takeCommitDeletions();
  const deleted: number[] = [];
  for (let index = 0; index < tags.size(); index += 1) deleted.push(id(tags.get(index), 'deleted tag'));
  return deleted;
}

export function readNodeRect(host: NativeHost, tag: number): LayoutRect | undefined {
  const value: unknown = JSON.parse(host.getNodeRect(tag));
  return value === null ? undefined : rect(value, 'node rect');
}

/** The tag of the first node created with `testID`, if any. */
export function findTag(host: NativeHost, testID: string): number | undefined {
  const tag = host.findByTestId(testID);
  return tag < 0 ? undefined : id(tag, 'tag');
}
