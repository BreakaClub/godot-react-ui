import { useRef, useState } from 'react';
import { Button, Portal, Text, View, type UIHandle } from 'godot-react-ui';

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

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
const menuItem = 'rounded bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-slate-900 px-2 py-1 text-sm focus:border-indigo-500';

/** The anchor's rectangle in root coordinates, as `getRect()` answers. */
interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
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
    <View testID="positioning-lab" className="w-full min-h-full bg-slate-50 p-6 gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Positioning</Text>
        <Text className="text-sm text-slate-500">position, insets, zIndex and the overlay layer.</Text>
      </View>

      {/* Siblings paint in document order unless zIndex says otherwise; an absolute box competes with
          the children of its containing block, so the negative one goes behind both others. */}
      <View className="gap-1">
        <Text className="text-xs text-slate-500">Stacking: A, B, C in document order; C is -z-10; Raise gives A z-10.</Text>
        <View testID="pos-stack" className="relative w-48 h-20 rounded-lg border border-slate-200 bg-white">
          <View testID="pos-z-a" className="absolute w-24 h-14 bg-indigo-500" style={{ ...STACK_BOXES.a, zIndex: raised ? RAISED_Z_INDEX : 0 }} />
          <View testID="pos-z-b" className="absolute w-24 h-14 bg-emerald-500" style={STACK_BOXES.b} />
          <View testID="pos-z-c" className="absolute w-24 h-14 bg-amber-500 -z-10" style={STACK_BOXES.c} />
        </View>
        <Button testID="pos-z-toggle" className={labButton} onClick={() => setRaised(value => !value)}>
          {raised ? 'Lower A' : 'Raise A'}
        </Button>
      </View>

      {/* The same red box, 100 px right and 40 px down inside a 128 x 64 grey cell, in three places. */}
      <View className="gap-1">
        <Text className="text-xs text-slate-500">Clipping: inside a relative overflow-hidden cell, past a static overflow-hidden cell, fixed.</Text>
        <View className="flex-row gap-4">
          <View testID="pos-clip-1" className="relative overflow-hidden w-32 h-16 bg-slate-200">
            <View testID="pos-clip-child-1" className="absolute w-16 h-12 bg-rose-500" style={CELL_CHILD} />
          </View>
          <View testID="pos-clip-wrap" className="relative w-32 h-16">
            <View testID="pos-clip-2" className="overflow-hidden w-32 h-16 bg-slate-200">
              <View testID="pos-clip-child-2" className="absolute w-16 h-12 bg-rose-500" style={CELL_CHILD} />
            </View>
          </View>
          <View testID="pos-clip-3" className="relative overflow-hidden w-32 h-16 bg-slate-200">
            <View testID="pos-fixed" className="fixed w-16 h-8 bg-indigo-700" style={{ right: 8, bottom: 8 }} />
          </View>
        </View>
      </View>

      {/* A card that clips its content, a menu button in it, and content right below it that the menu
          will cover. The popover is rendered in the overlay layer, anchored with getRect(). */}
      <View className="gap-2">
        <Text className="text-xs text-slate-500">Popover: opens below the Menu button, in the overlay layer; its backdrop closes it.</Text>
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
        <Text testID="pos-status" className="text-xs text-slate-600">
          {`open ${open}, later clicks ${laterClicks}, card clicks ${cardClicks}, backdrop closes ${backdropCloses}, item ${lastItem}`}
        </Text>
      </View>

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
