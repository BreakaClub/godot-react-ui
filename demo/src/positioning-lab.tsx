import { useRef, useState, type ReactNode } from 'react';
import { Button, Portal, Text, View, type UIHandle } from 'godot-react-ui';
import { LabIntro, LabLimit, Readout } from './lab-parts';

/** Where the stacking boxes sit inside their container, in its padding box. */
const STACK_BOXES = {
  a: { left: 8, top: 8 },
  b: { left: 56, top: 14 },
  c: { left: 96, top: 18 },
} as const;
/** The z-index the toggle gives box A: above B, which comes after it in the document. */
const RAISED_Z_INDEX = 10;
/** Where the clipped and escaping boxes sit in their 128 x 64 cells: partly beyond the right and bottom edges. */
const CELL_CHILD = { left: 100, top: 40 } as const;
/** The gap between the menu button and the popover under it. */
const POPOVER_GAP = 4;
/** The narrowest a case's notes get beside its live stage; narrower than this and they wrap under it. */
const NOTES_MIN_WIDTH = 240;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
const menuItem = 'items-start text-left rounded bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-slate-900 px-2 py-1 text-sm focus:border-indigo-500';
/** The number and name of a clipping cell, in its top left corner, clear of the red box in the bottom right. */
const cellLabel = 'px-1.5 py-1 text-xs text-slate-700';

/** The anchor's rectangle in root coordinates, as `getRect()` answers. */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CaseProps {
  title: string;
  /** What the case shows and what to try. */
  caption: string;
  /** What should happen, read off the live stage. */
  expected: string;
  /** What the library does differently from a browser here, when the case shows it. */
  limit?: string;
  /** The classes of the stage's column: its own fixed width beside the notes, or `w-full` so the notes go under it. */
  stageClassName: string;
  children: ReactNode;
}

/**
 * A case: its title over the live stage and the notes, side by side while they fit and one under the other when they do not. Flat, not a card: the
 * page's own fill is what the verifier reads around the clipping cells, so nothing here may paint behind them.
 */
function Case({ title, caption, expected, limit, stageClassName, children }: CaseProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-slate-900">{title}</Text>
      <View className="flex-row flex-wrap gap-x-4 gap-y-3">
        <View className={`gap-2 ${stageClassName}`}>{children}</View>
        <View className={`min-w-[${NOTES_MIN_WIDTH}px] flex-1 gap-2`}>
          <Text className="text-xs text-slate-600">{caption}</Text>
          <Text className="text-xs text-indigo-700">{`Expected: ${expected}`}</Text>
          {limit === undefined ? null : <LabLimit>{limit}</LabLimit>}
        </View>
      </View>
    </View>
  );
}

/** Phase I4: `position`, insets and `zIndex`, what clips an out-of-flow box, and a popover in the overlay layer. */
export function PositioningLab() {
  const [raised, setRaised] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [laterClicks, setLaterClicks] = useState(0);
  const [cardClicks, setCardClicks] = useState(0);
  const [backdropCloses, setBackdropCloses] = useState(0);
  const [lastItem, setLastItem] = useState('none');
  const menu = useRef<UIHandle>(null);

  const open = anchor !== null;
  const openMenu = () => {
    const rect = menu.current?.getRect();
    if (rect === undefined) throw new Error('The menu button has no rectangle');
    setAnchor(rect);
  };
  const choose = (item: string) => {
    setLastItem(item);
    setAnchor(null);
  };

  return (
    <View testID="positioning-lab" className="w-full min-h-full bg-slate-50 p-6 gap-4">
      <LabIntro
        title="Where a box goes, and what covers it"
        paragraphs={['This lab is about boxes that leave the normal flow. Position (absolute, fixed), the inset classes (top-*, inset-0) and z-index decide where such a box goes, what is in front and what clips it, by CSS\'s rules, and a Portal draws a popover in the overlay layer above everything. Not built: position: sticky.']}
      />

      {/* Siblings paint in document order unless zIndex says otherwise; an absolute box competes with
          the children of its containing block, so the negative one goes behind both others. */}
      <Case
        title="Stacking"
        stageClassName="w-48 shrink-0"
        caption="A, B and C are absolute boxes in one container. Later boxes paint over earlier ones, so B covers A. C has a negative z-index, so it goes behind both. Raise A gives A a z-index of 10."
        expected="after Raise A, A's indigo comes over B's green, and C stays behind both."
        limit="z-index only orders the boxes one parent paints. There are no stacking contexts, so C is still drawn over its container's white background."
      >
        <View testID="pos-stack" className="relative w-48 h-20 rounded-lg border border-slate-200 bg-white">
          <View testID="pos-z-a" className="absolute w-24 h-14 bg-indigo-500" style={{ ...STACK_BOXES.a, zIndex: raised ? RAISED_Z_INDEX : 0 }} />
          <View testID="pos-z-b" className="absolute w-24 h-14 bg-emerald-500" style={STACK_BOXES.b} />
          <View testID="pos-z-c" className="absolute w-24 h-14 bg-amber-500 -z-10" style={STACK_BOXES.c} />
        </View>
        <Button testID="pos-z-toggle" className={`self-start ${labButton}`} onClick={() => setRaised(value => !value)}>
          {raised ? 'Lower A' : 'Raise A'}
        </Button>
      </Case>

      {/* The same red box, 100 px right and 40 px down inside a 128 x 64 grey cell, in three places. The red box of the middle
          cell hangs 24 px below it, so the cells keep more than that between their rows. */}
      <Case
        title="Clipping"
        stageClassName="w-full"
        caption="The same red box sits 100 px right and 40 px down in three cells. An absolute box is clipped by its containing block, not by its parent, and a fixed box only by the window."
        expected="cell 1 cuts the box at its edge. Cell 2 shows all of it, past the cell: its containing block is the relative wrapper round the cell, which does not clip. Cell 3 is empty: its box is the dark indigo one at the window's bottom right corner."
      >
        <View className="flex-row flex-wrap gap-x-4 gap-y-8 pb-6">
          <View testID="pos-clip-1" className="relative overflow-hidden w-32 h-16 bg-slate-200">
            <Text className={cellLabel}>1: relative, overflow-hidden</Text>
            <View testID="pos-clip-child-1" className="absolute w-16 h-12 bg-rose-500" style={CELL_CHILD} />
          </View>
          <View testID="pos-clip-wrap" className="relative w-32 h-16">
            <View testID="pos-clip-2" className="overflow-hidden w-32 h-16 bg-slate-200">
              <Text className={cellLabel}>2: static, overflow-hidden</Text>
              <View testID="pos-clip-child-2" className="absolute w-16 h-12 bg-rose-500" style={CELL_CHILD} />
            </View>
          </View>
          <View testID="pos-clip-3" className="relative overflow-hidden w-32 h-16 bg-slate-200">
            <Text className={cellLabel}>3: fixed child</Text>
            <View testID="pos-fixed" className="fixed w-16 h-8 bg-indigo-700" style={{ right: 8, bottom: 8 }} />
          </View>
        </View>
      </Case>

      {/* A card that clips its content, a menu button in it, and content right below it that the menu
          will cover. The popover is rendered in the overlay layer, anchored with getRect(). */}
      <Case
        title="Popover in the overlay layer"
        stageClassName="w-64 shrink-0"
        caption="Menu opens a list under the button through a Portal, which draws in the overlay layer: above everything and hit-tested first. So the card's overflow-hidden does not cut it, and it covers Later content. Press outside it to close it: a full-window backdrop takes that press."
        expected="Menu gives open true and card clicks 1. Choosing an item gives open false, with card clicks still 1 and later clicks 0. Pressing outside instead adds 1 to backdrop closes."
        limit="a click inside a Portal bubbles through the overlay tree, not through the Portal's React parents as in React DOM, so the card does not count a click on an item."
      >
        <View testID="pos-card" className="overflow-hidden w-64 rounded-xl border border-slate-200 bg-white p-3 gap-2" onClick={() => setCardClicks(value => value + 1)}>
          <Text className="text-sm text-slate-900">Card (overflow-hidden)</Text>
          <Button ref={menu} testID="pos-menu" className={labButton} onClick={openMenu}>Menu</Button>
        </View>
        <Button
          testID="pos-later"
          className="w-40 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 text-sm"
          onClick={() => setLaterClicks(value => value + 1)}
        >
          Later content
        </Button>
        <Readout
          label="Counters"
          testID="pos-status"
          value={`open ${open}, later clicks ${laterClicks}, card clicks ${cardClicks}, backdrop closes ${backdropCloses}, item ${lastItem}`}
        />
      </Case>

      {anchor !== null && (
        <Portal>
          <View
            testID="pos-backdrop"
            className="absolute inset-0"
            onClick={() => {
              setBackdropCloses(value => value + 1);
              setAnchor(null);
            }}
          />
          <View
            testID="pos-popover"
            className="absolute w-44 rounded-lg border border-amber-300 bg-amber-50 p-1"
            style={{ left: anchor.x, top: anchor.y + anchor.height + POPOVER_GAP }}
          >
            <Button testID="pos-item-rename" className={menuItem} onClick={() => choose('Rename')}>Rename</Button>
            <Button testID="pos-item-duplicate" className={menuItem} onClick={() => choose('Duplicate')}>Duplicate</Button>
            <Button testID="pos-item-delete" className={menuItem} onClick={() => choose('Delete')}>Delete</Button>
          </View>
        </Portal>
      )}
    </View>
  );
}
