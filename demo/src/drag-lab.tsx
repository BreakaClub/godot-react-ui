import { useState, type ReactNode } from 'react';
import {
  ScrollView, Text, View,
  type EffectAllowed, type UIDragEndEvent, type UIDragEvent, type UIPointerEvent,
} from 'godot-react-ui';

/** Rows in the list, enough to need a scroll from the first row to the last. */
const LIST_ROWS = 20;
/** The log keeps this many of the latest drag events. */
const LOG_LINES = 6;
const CARD_MIME = 'text/plain';
const PALETTE_ITEM = 'palette';
const ROW_PREFIX = 'row-';

type ColumnName = 'todo' | 'doing';
const COLUMN_NAMES: readonly ColumnName[] = ['todo', 'doing'];
type Board = Record<ColumnName, readonly string[]>;

const INITIAL_BOARD: Board = { todo: ['a', 'b', 'c'], doing: ['d', 'e'] };

const chip = 'h-9 w-36 shrink-0 justify-center rounded-lg border border-slate-200 bg-white px-3';
const card = 'h-9 w-full shrink-0 justify-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700';
const cardRest = 'bg-white';
const cardTarget = 'bg-indigo-100';
const columnRest = 'bg-slate-100';
const columnTarget = 'bg-indigo-50';

/** The effect a target accepts: the one the source's `effectAllowed` offers first (copy for a palette item, else move). */
function acceptedEffect(allowed: EffectAllowed): 'copy' | 'move' {
  return allowed === 'copy' ? 'copy' : 'move';
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-slate-500">{title}</Text>
      {children}
    </View>
  );
}

function indexes(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

function removeCard(board: Board, id: string): Board {
  return { todo: board.todo.filter(other => other !== id), doing: board.doing.filter(other => other !== id) };
}

/** `id` goes into `column` before `before` (at the end if there is none), leaving wherever it was. */
function placeCard(board: Board, id: string, column: ColumnName, before: string | null): Board {
  const without = removeCard(board, id);
  const list = [...without[column]];
  const at = before === null ? -1 : list.indexOf(before);
  list.splice(at < 0 ? list.length : at, 0, id);
  return { ...without, [column]: list };
}

/**
 * Phase I9. A two-column board (cards reorder within a column and move between them), a trash that takes only a
 * `move`, a palette item that is copy-only (the trash refuses it: the cursor says so), a list long enough to
 * auto-scroll, and readouts of what each drag did.
 */
export function DragLab() {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [over, setOver] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [ended, setEnded] = useState('none');
  const [clicks, setClicks] = useState(0);
  const [ups, setUps] = useState(0);
  const [trashed, setTrashed] = useState('none');
  const [listDrop, setListDrop] = useState('none');
  const [created, setCreated] = useState(0);

  const record = (line: string) => setLog(current => [...current, line].slice(-LOG_LINES));
  const finish = (event: UIDragEndEvent) => {
    setOver(null);
    setEnded(`${event.dropEffect} outside ${event.endedOutsideRoot} at ${Math.round(event.x)},${Math.round(event.y)} viewport ${Math.round(event.viewportX)},${Math.round(event.viewportY)}`);
    record(`dragend ${event.dropEffect}`);
  };
  const countClick = (_: UIPointerEvent) => setClicks(current => current + 1);

  /** A source: cards and rows move, the palette item copies. */
  const source = (id: string, effect: EffectAllowed) => ({
    draggable: true,
    onDragStart: (event: UIDragEvent<'dragstart'>) => {
      event.dataTransfer.setData(CARD_MIME, id);
      event.dataTransfer.effectAllowed = effect;
      record(`dragstart ${id}`);
    },
    onDragEnd: finish,
    onClick: countClick,
  });

  /**
   * A drop target that accepts what the source offers: it prevents `dragover` and names the effect it would have
   * (`only` makes that effect fixed, so a source that does not allow it is refused).
   */
  const target = (key: string, drop: (event: UIDragEvent<'drop'>) => void, only?: 'move') => ({
    onDragEnter: (event: UIDragEvent<'dragenter'>) => {
      event.stopPropagation();
      setOver(key);
      record(`dragenter ${key}`);
    },
    onDragOver: (event: UIDragEvent<'dragover'>) => {
      event.stopPropagation();
      event.dataTransfer.dropEffect = only ?? acceptedEffect(event.dataTransfer.effectAllowed);
      event.preventDefault();
    },
    // A leave clears the highlight only if the pointer has not already entered something else (enter comes first).
    onDragLeave: (_: UIDragEvent<'dragleave'>) => setOver(current => (current === key ? null : current)),
    onDrop: (event: UIDragEvent<'drop'>) => {
      event.stopPropagation();
      event.preventDefault();
      setOver(null);
      drop(event);
    },
  });

  const dropOnBoard = (event: UIDragEvent<'drop'>, column: ColumnName, before: string | null) => {
    const id = event.dataTransfer.getData(CARD_MIME);
    record(`drop ${id} ${event.dataTransfer.dropEffect}`);
    // A card dropped on itself stays where it is.
    if (id === before) return;
    if (id === PALETTE_ITEM) {
      const fresh = `n${created + 1}`;
      setCreated(current => current + 1);
      setBoard(current => placeCard(current, fresh, column, before));
    } else if (id.startsWith(ROW_PREFIX)) {
      setListDrop(`${id} onto ${column}`);
    } else {
      setBoard(current => placeCard(current, id, column, before));
    }
  };

  return (
    <View testID="drag-lab" className="w-full min-h-full bg-slate-50 p-4 gap-3" onPointerUp={(_: UIPointerEvent) => setUps(current => current + 1)}>
      <View className="gap-1">
        <Text testID="drag-title" className="text-2xl text-slate-900">Drag and drop</Text>
        <Text className="text-sm text-slate-500">Drag cards between the columns and onto the trash (move only). The palette item copies, so the trash refuses it. Drag to a list's edge to scroll it. Escape cancels. The gesture chips cannot start a drag: locked (its pointerdown is prevented), captured (it captured the pointer), refused (its dragstart is prevented). The no-ghost chip drags with no ghost, and the select-text chip is a drag source whose text starts no selection.</Text>
      </View>
      <View testID="drag-sections" className="flex-row flex-wrap gap-3">
        <Section title="Board">
          <View className="flex-row gap-2">
            {COLUMN_NAMES.map(name => (
              <View
                key={name}
                testID={`column-${name}`}
                className={`w-36 min-h-32 gap-1 rounded-xl p-2 ${over === `column-${name}` ? columnTarget : columnRest}`}
                {...target(`column-${name}`, event => dropOnBoard(event, name, null))}
              >
                <Text className="text-xs text-slate-500">{name}</Text>
                {board[name].map(id => (
                  <View
                    key={id}
                    testID={`card-${id}`}
                    className={`${card} ${over === `card-${id}` ? cardTarget : cardRest}`}
                    {...source(id, 'move')}
                    {...target(`card-${id}`, event => dropOnBoard(event, name, id))}
                  >
                    <Text className="pointer-events-none text-sm text-slate-700">{`Card ${id}`}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Section>
        <Section title="Palette and trash">
          <View testID="palette" className={`${chip} bg-amber-100`} {...source(PALETTE_ITEM, 'copy')}>
            <Text className="pointer-events-none text-sm text-amber-800">New card (copy)</Text>
          </View>
          <View
            testID="trash"
            className={`h-16 w-36 items-center justify-center rounded-xl border border-rose-200 ${over === 'trash' ? 'bg-rose-200' : 'bg-rose-50'}`}
            {...target('trash', event => {
              const id = event.dataTransfer.getData(CARD_MIME);
              record(`drop ${id} trash`);
              setBoard(current => removeCard(current, id));
              setTrashed(id);
            }, 'move')}
          >
            <Text className="pointer-events-none text-sm text-rose-800">Trash (move only)</Text>
          </View>
          <View testID="refuser" className="h-12 w-36 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Text className="pointer-events-none text-xs text-slate-500">Takes nothing</Text>
          </View>
        </Section>
        <Section title="Gestures">
          <View
            testID="locked" className={chip}
            {...source('locked', 'move')}
            onPointerDown={(event: UIPointerEvent) => event.preventDefault()}
          >
            <Text className="pointer-events-none text-xs text-slate-700">locked</Text>
          </View>
          <View
            testID="captured" className={chip}
            {...source('captured', 'move')}
            onPointerDown={(event: UIPointerEvent) => event.currentTarget.setPointerCapture(event.pointerId)}
          >
            <Text className="pointer-events-none text-xs text-slate-700">captured</Text>
          </View>
          <View
            testID="refused" className={chip}
            {...source('refused', 'move')}
            onDragStart={(event: UIDragEvent<'dragstart'>) => { event.preventDefault(); record('dragstart refused'); }}
          >
            <Text className="pointer-events-none text-xs text-slate-700">refused</Text>
          </View>
          <View testID="ghostless" className={chip} dragPreview="none" {...source('ghostless', 'move')}>
            <Text className="pointer-events-none text-xs text-slate-700">no ghost</Text>
          </View>
          <View testID="selectable" className={`${chip} select-text`} {...source('selectable', 'move')}>
            <Text testID="selectable-text" className="text-xs text-slate-700">select me</Text>
          </View>
          <Text testID="selectable-plain" className="select-text text-xs text-slate-700">plain text, selectable</Text>
        </Section>
        <Section title="List (drag to its edge)">
          <ScrollView testID="drag-list" className="h-44 w-44 rounded-xl border border-slate-200 bg-white" focusable={false} contentClassName="gap-1 p-2">
            {indexes(LIST_ROWS).map(index => (
              <View
                key={index}
                testID={`row-${index}`}
                className={`h-8 shrink-0 justify-center rounded-lg border border-slate-200 px-3 ${over === `row-${index}` ? cardTarget : cardRest}`}
                {...source(`${ROW_PREFIX}${index}`, 'move')}
                {...target(`row-${index}`, event => {
                  const id = event.dataTransfer.getData(CARD_MIME);
                  record(`drop ${id} row ${index}`);
                  setListDrop(`${id} onto row ${index}`);
                })}
              >
                <Text className="pointer-events-none text-sm text-slate-700">{`Row ${index}`}</Text>
              </View>
            ))}
          </ScrollView>
        </Section>
      </View>
      <View className="gap-1">
        <Text testID="board-status" className="text-xs text-slate-600">{`todo: ${board.todo.join(',')} | doing: ${board.doing.join(',')}`}</Text>
        <Text testID="end-status" className="text-xs text-slate-600">{`last drag ended: ${ended}`}</Text>
        <Text testID="drop-status" className="text-xs text-slate-600">{`trash ${trashed}, list ${listDrop}, pointerups ${ups}, clicks ${clicks}`}</Text>
        <Text testID="drag-log" className="text-xs text-slate-600">{log.length === 0 ? 'no events' : log.join(' > ')}</Text>
      </View>
    </View>
  );
}
