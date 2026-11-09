import { useEffect, useRef, useState } from 'react';
import {
  Button, Portal, Text, TextInput, useRangeRects, useRootSnapshot, useScrollIntoView, View,
  type LayoutRect, type NativeSnapshot, type NativeSnapshotNode, type TextInputHandle,
  type UIInputEvent, type UIKeyboardEvent,
} from 'godot-react-ui';

export interface PageMatch {
  readonly nodeId: number;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly rect: LayoutRect;
}

export interface SearchableSnapshotNode {
  readonly id: number;
  readonly text?: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly number[];
  readonly rect: LayoutRect;
}

export function findMatchesInSnapshot(
  snapshot: { readonly nodes: readonly SearchableSnapshotNode[] },
  query: string,
): readonly PageMatch[] {
  if (query.trim() === '') return [];
  const normalizedQuery = query.toLowerCase();

  const nodesById = new Map<number, SearchableSnapshotNode>();
  for (const node of snapshot.nodes) {
    nodesById.set(node.id, node);
  }

  let stageNodeId: number | undefined;
  let searchBarNodeId: number | undefined;

  for (const node of snapshot.nodes) {
    const testID = node.props.testID;
    if (testID === 'lab-stage') {
      stageNodeId = node.id;
    } else if (testID === 'page-search') {
      searchBarNodeId = node.id;
    }
  }

  const excludedIds = new Set<number>();
  if (searchBarNodeId !== undefined) {
    const queue = [searchBarNodeId];
    excludedIds.add(searchBarNodeId);
    while (queue.length > 0) {
      const cur = queue.pop();
      if (cur === undefined) continue;
      const node = nodesById.get(cur);
      if (node) {
        for (const childId of node.children) {
          excludedIds.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  const includedIds = new Set<number>();
  if (stageNodeId !== undefined) {
    const queue = [stageNodeId];
    includedIds.add(stageNodeId);
    while (queue.length > 0) {
      const cur = queue.pop();
      if (cur === undefined) continue;
      const node = nodesById.get(cur);
      if (node) {
        for (const childId of node.children) {
          if (!excludedIds.has(childId)) {
            includedIds.add(childId);
            queue.push(childId);
          }
        }
      }
    }
  } else {
    for (const node of snapshot.nodes) {
      if (!excludedIds.has(node.id)) {
        includedIds.add(node.id);
      }
    }
  }

  // Also include lab-header if present
  for (const node of snapshot.nodes) {
    if (node.props.testID === 'lab-header') {
      includedIds.add(node.id);
      const queue = [node.id];
      while (queue.length > 0) {
        const cur = queue.pop();
        if (cur === undefined) continue;
        const n = nodesById.get(cur);
        if (n) {
          for (const childId of n.children) {
            if (!excludedIds.has(childId)) {
              includedIds.add(childId);
              queue.push(childId);
            }
          }
        }
      }
      break;
    }
  }

  const matches: PageMatch[] = [];
  for (const node of snapshot.nodes) {
    if (!includedIds.has(node.id)) continue;
    const text = node.text;
    if (typeof text !== 'string' || text.length === 0) continue;

    const lower = text.toLowerCase();
    let index = 0;
    while ((index = lower.indexOf(normalizedQuery, index)) !== -1) {
      matches.push({
        nodeId: node.id,
        text,
        start: index,
        end: index + query.length,
        rect: node.rect,
      });
      index += query.length;
    }
  }

  return matches;
}

export interface PageSearchProps {
  readonly selectedLabId: string | undefined;
  readonly searchEpoch: number;
  readonly onClose: () => void;
}

export function PageSearch({ selectedLabId, searchEpoch, onClose }: PageSearchProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<readonly PageMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const inputRef = useRef<TextInputHandle | null>(null);

  const readSnapshot = useRootSnapshot();
  const scrollIntoView = useScrollIntoView();
  const rangeRects = useRangeRects();

  const prevEpoch = useRef(searchEpoch);
  useEffect(() => {
    if (searchEpoch !== prevEpoch.current) {
      prevEpoch.current = searchEpoch;
      inputRef.current?.focus();
      if (matches.length > 1) {
        const next = (activeMatchIndex + 1) % matches.length;
        setActiveMatchIndex(next);
        const m = matches[next];
        if (m) scrollIntoView(m.nodeId);
      }
    }
  }, [searchEpoch, matches, activeMatchIndex, scrollIntoView]);

  useEffect(() => {
    if (query.trim() === '') {
      setMatches([]);
      setActiveMatchIndex(0);
      return;
    }
    const snapshot = readSnapshot();
    const found = findMatchesInSnapshot(snapshot, query);
    setMatches(found);
    setActiveMatchIndex(0);
    if (found.length > 0 && found[0] !== undefined) {
      scrollIntoView(found[0].nodeId);
    }
  }, [query, selectedLabId, readSnapshot, scrollIntoView]);

  const nextMatch = () => {
    if (matches.length === 0) return;
    const next = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(next);
    const m = matches[next];
    if (m) scrollIntoView(m.nodeId);
  };

  const prevMatch = () => {
    if (matches.length === 0) return;
    const prev = (activeMatchIndex - 1 + matches.length) % matches.length;
    setActiveMatchIndex(prev);
    const m = matches[prev];
    if (m) scrollIntoView(m.nodeId);
  };

  const onKeyDown = (event: UIKeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) prevMatch();
      else nextMatch();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if ((event.key === 'f' || event.key === 'F') && (event.ctrlKey || event.metaKey) && !event.altKey) {
      event.preventDefault();
      nextMatch();
    }
  };

  const activeMatch = matches[activeMatchIndex];
  const activeRects = activeMatch !== undefined ? rangeRects(activeMatch.nodeId, activeMatch.start, activeMatch.end) : undefined;
  const highlightRect: LayoutRect | undefined = (activeRects && activeRects.length > 0)
    ? activeRects[0]
    : activeMatch?.rect;

  const countText = query === '' ? '' : matches.length === 0 ? '0 of 0' : `${activeMatchIndex + 1} of ${matches.length}`;

  return (
    <>
      <View
        testID="page-search"
        className="absolute top-3 right-6 z-40 flex-row items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-3 py-2 shadow-lg backdrop-blur pointer-events-auto"
      >
        <TextInput
          ref={inputRef}
          testID="page-search-input"
          aria-label="Find in page"
          placeholder="Find in page"
          value={query}
          autoFocus
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 w-48"
          onChange={(event: UIInputEvent) => setQuery(event.value)}
          onKeyDown={onKeyDown}
        />
        <Text testID="page-search-count" className="text-xs text-slate-500 min-w-[50px] text-center font-medium">
          {countText}
        </Text>
        <Button
          testID="page-search-previous"
          aria-label="Previous match"
          disabled={matches.length === 0}
          className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          onClick={prevMatch}
        >
          <Text className="text-sm">↑</Text>
        </Button>
        <Button
          testID="page-search-next"
          aria-label="Next match"
          disabled={matches.length === 0}
          className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          onClick={nextMatch}
        >
          <Text className="text-sm">↓</Text>
        </Button>
        <Button
          testID="page-search-close"
          aria-label="Close search"
          className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100"
          onClick={onClose}
        >
          <Text className="text-sm">✕</Text>
        </Button>
      </View>
      {highlightRect && highlightRect.width > 0 && highlightRect.height > 0 ? (
        <Portal>
          <View
            testID="page-search-active-highlight"
            className="fixed pointer-events-none rounded border border-amber-500 bg-amber-400/40 z-30"
            style={{
              left: highlightRect.x - 2,
              top: highlightRect.y - 1,
              width: highlightRect.width + 4,
              height: highlightRect.height + 2,
            }}
          />
        </Portal>
      ) : null}
    </>
  );
}
