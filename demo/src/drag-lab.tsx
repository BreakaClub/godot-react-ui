import { useState, type ReactNode } from 'react';
import {
  Button, ScrollView, Text, TextInput, View,
  type DropEffect, type EffectAllowed, type UIDragEndEvent, type UIDragEvent, type UIPointerEvent,
} from 'godot-react-ui';
import { LabIntro } from './lab-parts';

/** Rows in the list, enough to need a scroll from the first row to the last. */
const LIST_ROWS = 20;
/** The log keeps this many of the latest drag events. */
const LOG_LINES = 6;
const CARD_MIME = 'text/plain';
/** The text the draggable form's field starts with. */
export const CHIP_INPUT_TEXT = 'Ada Lovelace';
const PALETTE_ITEM = 'palette';
const ROW_PREFIX = 'row-';

type ColumnName = 'todo' | 'doing';
const COLUMN_NAMES: readonly ColumnName[] = ['todo', 'doing'];
type Board = Record<ColumnName, readonly string[]>;

const INITIAL_BOARD: Board = { todo: ['a', 'b', 'c'], doing: ['d', 'e'] };

/** The board is two 144 px columns and the gap between them; the other sections are as wide as their widest chip, the form. */
// The sections grow to share their row: at their least width a caption wraps to four or five lines, and the lab must fit a 600 x 900 window.
const BOARD_WIDTH = 'min-w-[296px] flex-1';
const SECTION_WIDTH = 'min-w-44 flex-1';

/** A chip holds its name and a detail line in 36 px, so a detail must fit the 120 px inside it on one line: two lines run out of the chip. */
const chip = 'h-9 w-36 shrink-0 justify-center rounded-lg border border-slate-200 bg-white px-3';
const card = 'h-9 w-full shrink-0 justify-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700';
const cardRest = 'bg-white';
const cardTarget = 'bg-indigo-100 border-indigo-500';
/** A column is a drop target, so it has an edge to be one; the pointer over it turns the edge and the fill indigo. */
const columnRest = 'border-slate-300 bg-slate-100';
const columnTarget = 'border-indigo-500 bg-indigo-50';

/** The effect a target accepts: the one the source's `effectAllowed` offers first (copy for a palette item, else move). */
function acceptedEffect(allowed: EffectAllowed): 'copy' | 'move' {
  return allowed === 'copy' ? 'copy' : 'move';
}

/**
 * What a drop would do, as the library settles it: a target that takes only `only` refuses a source whose `effectAllowed` leaves it out
 * (`none`, and the cursor shows it); the lab's sources allow `move` or `copy`, and every other target takes either.
 */
function negotiated(allowed: EffectAllowed, only?: 'move'): DropEffect {
  if (only === undefined) return acceptedEffect(allowed);
  return allowed === only ? only : 'none';
}

/**
 * A part of the page: its name and what it shows, over its controls. The caption wraps at the section's own width, which is fixed, so a
 * wider caption never moves a source or a target (the verifiers find free page beside the sections for a ghost to rest on).
 */
function Section({ title, caption, className, children }: { title: string; caption: string; className: string; children: ReactNode }) {
  return (
    <View className={`gap-1 ${className}`}>
      <Text className="text-xs text-slate-900">{title}</Text>
      <Text className="text-xs text-slate-500">{caption}</Text>
      {children}
    </View>
  );
}

/** A chip's name, and under it in small type what makes it different. Neither takes the pointer: the chip does. */
function ChipLabel({ name, detail }: { name: string; detail: string }) {
  return (
    <>
      <Text className="pointer-events-none text-xs text-slate-700">{name}</Text>
      <Text className="pointer-events-none select-none text-[10px] text-slate-500">{detail}</Text>
    </>
  );
}

/** What a drop on the target under the pointer would do, in the words the targets show. */
function effectWords(effect: DropEffect): string {
  return effect === 'none' ? 'refused' : effect;
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
  // The effect a drop on `over` would have: what the target allows, or `none` if the source's effectAllowed does not include it.
  const [offer, setOffer] = useState<DropEffect>('none');
  const [log, setLog] = useState<string[]>([]);
  const [ended, setEnded] = useState('none');
  const [clicks, setClicks] = useState(0);
  const [ups, setUps] = useState(0);
  const [trashed, setTrashed] = useState('none');
  const [listDrop, setListDrop] = useState('none');
  const [created, setCreated] = useState(0);
  const [armed, setArmed] = useState(false);
  const [vanished, setVanished] = useState(false);

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
      setOffer(negotiated(event.dataTransfer.effectAllowed, only));
      record(`dragenter ${key}`);
    },
    onDragOver: (event: UIDragEvent<'dragover'>) => {
      event.stopPropagation();
      event.dataTransfer.dropEffect = only ?? acceptedEffect(event.dataTransfer.effectAllowed);
      setOffer(negotiated(event.dataTransfer.effectAllowed, only));
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

  const overEffect = (key: string): string => (over === key ? effectWords(offer) : '');

  return (
    <View testID="drag-lab" className="w-full min-h-full bg-slate-50 p-4 gap-2" onPointerUp={(_: UIPointerEvent) => setUps(current => current + 1)}>
      <LabIntro
        testID="drag-title"
        title="Drag sources and drop targets"
        paragraphs={[
          'Drag cards between columns, onto the trash, or the palette\'s copy onto a column; Escape cancels. A mouse drags after a short move, a finger after a half-second hold (a quick swipe pans). Targets cancel dragover to take a drop, as in HTML.',
        ]}
      />
      <View testID="drag-sections" className="flex-row flex-wrap gap-3">
        <Section
          title="Board" className={BOARD_WIDTH}
          caption="Drop a card on another card to put it before that one, or on a column's empty space to put it last. A column names the effect while a drag is over it."
        >
          <View className="flex-row gap-2">
            {COLUMN_NAMES.map(name => (
              <View
                key={name}
                testID={`column-${name}`}
                className={`w-36 min-h-32 gap-1 rounded-xl border-2 p-2 ${over === `column-${name}` ? columnTarget : columnRest}`}
                {...target(`column-${name}`, event => dropOnBoard(event, name, null))}
              >
                <View className="pointer-events-none flex-row items-center justify-between">
                  <Text className="text-xs text-slate-500">{name}</Text>
                  <Text className="text-xs text-indigo-700">{overEffect(`column-${name}`)}</Text>
                </View>
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
        <Section
          title="Palette and trash" className={SECTION_WIDTH}
          caption="The palette item copies. The trash takes only a move and refuses the copy; the cursor says so."
        >
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
            <Text className="pointer-events-none text-xs text-rose-700">{over === 'trash' ? `drop: ${effectWords(offer)}` : 'drop a card here'}</Text>
          </View>
          <View testID="refuser" className="h-12 w-36 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Text className="pointer-events-none text-xs text-slate-500">Takes nothing</Text>
            <Text className="pointer-events-none text-xs text-slate-400">it never cancels dragover</Text>
          </View>
        </Section>
        <Section
          title="Gestures" className={SECTION_WIDTH}
          caption="The first three start no drag. A press in the form's field edits it; anywhere else drags it."
        >
          <View
            testID="locked" className={chip}
            {...source('locked', 'move')}
            onPointerDown={(event: UIPointerEvent) => event.preventDefault()}
          >
            <ChipLabel name="locked" detail="pointerdown prevented" />
          </View>
          <View
            testID="captured" className={chip}
            {...source('captured', 'move')}
            onPointerDown={(event: UIPointerEvent) => event.currentTarget.setPointerCapture(event.pointerId)}
          >
            <ChipLabel name="captured" detail="pointer captured" />
          </View>
          <View
            testID="refused" className={chip}
            {...source('refused', 'move')}
            onDragStart={(event: UIDragEvent<'dragstart'>) => { event.preventDefault(); record('dragstart refused'); }}
          >
            <ChipLabel name="refused" detail="dragstart prevented" />
          </View>
          <View testID="ghostless" className={chip} dragPreview="none" {...source('ghostless', 'move')}>
            <ChipLabel name="no ghost" detail="dragPreview none" />
          </View>
          <View testID="selectable" className={`${chip} select-text`} {...source('selectable', 'move')}>
            <Text testID="selectable-text" className="text-xs text-slate-700">select me</Text>
            <Text className="pointer-events-none select-none text-[10px] text-slate-500">select-text source</Text>
          </View>
          <Text testID="selectable-plain" className="select-text text-xs text-slate-700">plain text, selectable</Text>
          <View testID="input-chip" className="w-44 shrink-0 gap-1 rounded-lg border border-slate-200 bg-white p-2" {...source('input-chip', 'move')}>
            <Text className="pointer-events-none text-xs text-slate-700">a draggable form</Text>
            <TextInput
              testID="chip-input" className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 caret-indigo-600"
              defaultValue={CHIP_INPUT_TEXT}
            />
          </View>
        </Section>
        <Section
          title="List (drag to its edge)" className={SECTION_WIDTH}
          caption="Drag a row to the list's top or bottom edge and it scrolls. Rows take drops."
        >
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
          {!vanished && (
            <View
              testID="vanishing" className={chip}
              {...source('vanishing', 'move')}
              onPointerDown={(_: UIPointerEvent) => setArmed(true)}
              onPointerMove={(_: UIPointerEvent) => { if (armed) setVanished(true); }}
            >
              <ChipLabel name="vanishes" detail="on press and move" />
            </View>
          )}
          <Button
            testID="vanishing-restore"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            onClick={() => { setVanished(false); setArmed(false); }}
          >
            Restore the vanishing chip
          </Button>
        </Section>
      </View>
      <View className="gap-1">
        <Text className="text-xs text-slate-900">What the drags did</Text>
        <Text className="text-xs text-slate-500">
          The board, the last drag's end and the drag events. A drag cancels the pointer, so it sends no pointerup or click.
        </Text>
        <Text testID="board-status" className="text-xs text-slate-600">{`todo: ${board.todo.join(',')} | doing: ${board.doing.join(',')}`}</Text>
        <Text testID="end-status" className="text-xs text-slate-600">{`last drag ended: ${ended}`}</Text>
        <Text testID="drop-status" className="text-xs text-slate-600">{`trash ${trashed}, list ${listDrop}, pointerups ${ups}, clicks ${clicks}`}</Text>
        <Text testID="drag-log" className="text-xs text-slate-600">{log.length === 0 ? 'no events' : log.join(' > ')}</Text>
      </View>
    </View>
  );
}
