import type { Style, TransitionProperty } from './types';

/** The ClassDB-facing API. Structural typing also permits recording transports in tests. */
export interface NativeHost {
  applyBatch(json: string): string;
  drainEvents(): string;
  getSnapshot(): string;
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

export type NativeKind = 'view' | 'text' | 'button';
export type NativeCommand =
  | { op: 'create'; id: number; kind: NativeKind }
  | { op: 'style'; id: number; style: Style }
  | { op: 'text'; id: number; text: string }
  | { op: 'children'; id: number; children: number[] }
  | { op: 'remove'; id: number };

export type NativeEventType =
  | 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerenter' | 'pointerleave'
  | 'click' | 'focus' | 'blur';

export interface NativeEvent {
  id: number;
  type: NativeEventType;
  x: number;
  y: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeSnapshotNode {
  id: number;
  kind: NativeKind;
  text: string;
  parent: number | null;
  children: number[];
  rect: LayoutRect;
  clipRect: LayoutRect | null;
  presentation: { width: number; height: number; widthIsAuto: boolean; heightIsAuto: boolean; opacity: number; backgroundColor: string };
  style: Record<string, unknown>;
}

export interface NativeSnapshot {
  clockMs: number;
  transitions: NativeTransition[];
  nodes: NativeSnapshotNode[];
  stats: {
    layoutPasses: number;
    batches: number;
    nodeCount: number;
    paintPasses: number;
    layoutMicros: number;
  };
  width: number;
  height: number;
  hovered: number | null;
  focused: number | null;
  pressed: number | null;
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
    case 'pointerleave': case 'click': case 'focus': case 'blur':
      return value;
    default:
      throw new Error(`Invalid native event type: ${String(value)}`);
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
  return array(value, 'events').map((entry) => {
    const event = record(entry, 'event');
    return {
      id: id(event.id, 'event.id'),
      type: eventType(event.type),
      x: number(event.x, 'event.x'),
      y: number(event.y, 'event.y'),
    };
  });
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
      };
    }),
    stats: {
      layoutPasses: number(stats.layoutPasses, 'stats.layoutPasses'),
      batches: number(stats.batches, 'stats.batches'),
      nodeCount: number(stats.nodeCount, 'stats.nodeCount'),
      paintPasses: number(stats.paintPasses, 'stats.paintPasses'),
      layoutMicros: number(stats.layoutMicros, 'stats.layoutMicros'),
    },
    width: number(snapshot.width, 'snapshot.width'),
    height: number(snapshot.height, 'snapshot.height'),
    hovered: optionalId(snapshot.hovered, 'snapshot.hovered'),
    focused: optionalId(snapshot.focused, 'snapshot.focused'),
    pressed: optionalId(snapshot.pressed, 'snapshot.pressed'),
  };
}

export interface BatchTiming {
  jsonEncodeMs: number;
  nativeCallMs: number;
  jsonChars: number;
}

export function applyCommands(host: NativeHost, commands: NativeCommand[], now?: () => number): BatchTiming | undefined {
  if (commands.length === 0) return;
  const encodeStart = now?.();
  const json = JSON.stringify(commands);
  const callStart = now?.();
  const error = host.applyBatch(json);
  const callEnd = now?.();
  if (error !== '') throw new Error(`Native UI batch rejected: ${error}`);
  if (encodeStart === undefined || callStart === undefined || callEnd === undefined) return;
  return {jsonEncodeMs: callStart - encodeStart, nativeCallMs: callEnd - callStart, jsonChars: json.length};
}
