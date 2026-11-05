import type { Style } from './types';

/** The ClassDB-facing API. Structural typing also permits recording transports in tests. */
export interface NativeHost {
  applyBatch(json: string): string;
  drainEvents(): string;
  getSnapshot(): string;
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
  style: Record<string, unknown>;
}

export interface NativeSnapshot {
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
    nodes: array(snapshot.nodes, 'snapshot.nodes').map((entry) => {
      const node = record(entry, 'node');
      const rect = record(node.rect, 'node.rect');
      return {
        id: id(node.id, 'node.id'),
        kind: kind(node.kind),
        text: string(node.text, 'node.text'),
        parent: optionalId(node.parent, 'node.parent'),
        children: array(node.children, 'node.children').map((child) => id(child, 'child ID')),
        rect: {
          x: number(rect.x, 'rect.x'),
          y: number(rect.y, 'rect.y'),
          width: number(rect.width, 'rect.width'),
          height: number(rect.height, 'rect.height'),
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

export function applyCommands(host: NativeHost, commands: NativeCommand[]): void {
  if (commands.length === 0) return;
  const error = host.applyBatch(JSON.stringify(commands));
  if (error !== '') throw new Error(`Native UI batch rejected: ${error}`);
}
