import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Button, Text, View } from 'godot-react-ui';
import { InteractionLab } from './interaction-lab';
import { LabIntro } from './lab-parts';
import { MotionLab } from './motion-lab';

type Demo = 'counter' | 'inventory' | 'motion' | 'interaction';
type Accent = 'indigo' | 'emerald';
type Category = 'All' | 'Seeds' | 'Tools';

const AccentContext = createContext<Accent>('indigo');
const MAX_ITEMS = 6;
const INITIAL_ITEMS = 4;
const INITIAL_COUNT = 0;
const SMALL_STEP = 1;
const LARGE_STEP = 5;
const DERIVED_MULTIPLIER = 2;
const INVENTORY_CARD_HEIGHT = 124;

const lifecycle = { appMounts: 0, appCleanups: 0, counterMounts: 0, counterCleanups: 0, resetPresses: 0 };

/** Read-only observations of actual React effects, for the native verifier. */
export function getDemoLifecycle() {
  return { ...lifecycle };
}

const accentStyles = {
  indigo: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white',
    soft: 'bg-indigo-50 text-indigo-700',
    border: 'border-indigo-500',
    text: 'text-indigo-600',
  },
  emerald: {
    primary: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white',
    soft: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-500',
    text: 'text-emerald-600',
  },
};

const secondaryButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-4 py-2 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-4 gap-1 min-w-0">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="text-xl text-slate-900">{value}</Text>
      <Text className="text-xs text-slate-500">{detail}</Text>
    </View>
  );
}

/** The explanation a lab adds to the controls the playground's verifiers drive. */
const explanationText = 'text-xs text-slate-500';

interface PlaygroundTabProps {
  /**
   * The lab is a tab of the playground page (`App`), whose verifiers read the geometry of everything on it in two fixed windows: it shows its
   * controls and nothing else, as it always did. Left off, the lab is a page of the navigator and says what it shows before the controls.
   */
  embedded?: boolean;
}

export function CounterLab({ embedded = false }: PlaygroundTabProps) {
  const [count, setCount] = useState(INITIAL_COUNT);
  const [step, setStep] = useState(SMALL_STEP);
  const accent = accentStyles[useContext(AccentContext)];
  const doubled = useMemo(() => count * DERIVED_MULTIPLIER, [count]);

  useEffect(() => {
    lifecycle.counterMounts += 1;
    return () => { lifecycle.counterCleanups += 1; };
  }, []);

  return (
    <View testID="counter-lab" className="gap-4">
      {embedded ? null : (
        <LabIntro
          title="React state on a native canvas"
          paragraphs={[
            'An ordinary React component: useState holds the count and the step size, useMemo derives the doubled value, and each button\'s onClick closes over the current step. Its boxes are not DOM elements but native ones, laid out by Rust (Taffy) with Flexbox and Grid and drawn by Godot.',
            'Try it: press Add, then Switch to 5 and press Add again. Updates that re-render, closures that see fresh values and a disabled button that ignores presses are the basics any React renderer has to get right.',
          ]}
        />
      )}
      <View testID="counter-columns" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <View testID="counter-card" className="bg-white rounded-2xl border border-slate-200 p-6 gap-3">
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-sm text-slate-500">A little state, a native canvas.</Text>
            <Text className={`text-xs rounded-lg px-2 py-1 ${accent.soft}`}>useState</Text>
          </View>
          <Text testID="counter-value" className={`text-5xl ${accent.text}`}>{count}</Text>
          <View className="flex-row gap-3">
            <Button testID="increment" className={`flex-1 rounded-lg px-4 py-3 focus:border-indigo-500 border border-transparent ${accent.primary}`} onClick={() => setCount(value => value + step)}>
              Add {step}
            </Button>
            <Button testID="decrement" className={secondaryButton} onClick={() => setCount(value => value - step)}>Subtract</Button>
            <Button testID="reset" className={`${secondaryButton} disabled:bg-slate-100 disabled:text-slate-400`} disabled={count === INITIAL_COUNT} onClick={() => { lifecycle.resetPresses += 1; setCount(INITIAL_COUNT); }}>Reset</Button>
          </View>
          {embedded ? null : (
            <Text className={explanationText}>Add and Subtract change the count by the step size. Reset sets it back to 0 and is disabled while the count is 0.</Text>
          )}
          <Text testID="counter-derived" className="text-sm text-slate-500">Derived with useMemo: {doubled}</Text>
          {embedded ? null : (
            <Text className={explanationText}>useMemo works this out from the count, so it is always twice the number above and is recomputed only when the count changes.</Text>
          )}
        </View>

        <View className="rounded-2xl bg-slate-900 p-6 gap-3">
          <Text className="text-lg text-white">Feels like React.</Text>
          <Text className="text-sm text-slate-300">Components, hooks, closures and className. Flexbox and Grid are calculated in native Rust.</Text>
          <View className="hidden md:flex bg-slate-800 rounded-lg p-3 gap-1">
            <Text className="text-sm text-slate-200">{'<Button className="rounded-lg bg-indigo-600"'}</Text>
            <Text className="text-sm text-slate-200">{'  onClick={() => setCount(n => n + 1)}>'}</Text>
            <Text className="text-sm text-slate-200">{'  Add 1'}</Text>
            <Text className="text-sm text-slate-200">{'</Button>'}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Text className="text-sm text-slate-300">Step size</Text>
            <Button testID="step-toggle" className="rounded-lg bg-slate-700 text-white px-3 py-2 hover:bg-slate-600 focus:border-indigo-500 border border-transparent" onClick={() => setStep(value => value === SMALL_STEP ? LARGE_STEP : SMALL_STEP)}>
              Switch to {step === SMALL_STEP ? LARGE_STEP : SMALL_STEP}
            </Button>
          </View>
          {embedded ? null : (
            <Text className="text-xs text-slate-300">The step switches between 1 and 5 and the Add button's label follows it. Add's handler is made again on every render, so the press after a switch uses the new step.</Text>
          )}
        </View>
      </View>

      {embedded ? null : (
        <Text className={explanationText}>The three cards say how the page is made: React TSX components, laid out by Taffy, drawn by Godot. A window narrower than 768 logical pixels stacks the two panels above and hides the code sample (md: classes), which native applies without a React render.</Text>
      )}
      <View testID="feature-grid" className="grid grid-cols-3 gap-3">
        <Stat label="AUTHOR" value="React TSX" detail="Real components + hooks" />
        <Stat label="ARRANGE" value="Taffy" detail="Native Flexbox + Grid" />
        <Stat label="RENDER" value="Godot" detail="One canvas, shaped text" />
      </View>
    </View>
  );
}

interface Item {
  id: string;
  name: string;
  category: Exclude<Category, 'All'>;
  mark: string;
  quantity: number;
  tone: string;
}

const itemCatalog: readonly Item[] = [
  { id: 'carrot', name: 'Carrot seeds', category: 'Seeds', mark: 'C', quantity: 12, tone: 'bg-amber-100 text-amber-700' },
  { id: 'watering', name: 'Watering can', category: 'Tools', mark: 'W', quantity: 1, tone: 'bg-indigo-100 text-indigo-700' },
  { id: 'sunflower', name: 'Sunflower', category: 'Seeds', mark: 'S', quantity: 8, tone: 'bg-emerald-100 text-emerald-700' },
  { id: 'spade', name: 'Garden spade', category: 'Tools', mark: 'G', quantity: 1, tone: 'bg-slate-200 text-slate-700' },
  { id: 'pumpkin', name: 'Pumpkin seeds', category: 'Seeds', mark: 'P', quantity: 6, tone: 'bg-rose-100 text-rose-700' },
  { id: 'rake', name: 'Wooden rake', category: 'Tools', mark: 'R', quantity: 1, tone: 'bg-amber-100 text-amber-700' },
];

function InventoryCard({ item, selected, onSelect }: { item: Item; selected: boolean; onSelect: () => void }) {
  // This state belongs to the keyed component. Reverse the grid after selecting a
  // card: the click count must follow the item rather than its former grid cell.
  const [selections, setSelections] = useState(0);
  const accent = accentStyles[useContext(AccentContext)];
  return (
    <Button
      testID={`item-${item.id}`}
      className={`justify-start text-left p-4 rounded-xl border bg-white gap-2 hover:bg-slate-50 focus:border-indigo-500 ${selected ? accent.border : 'border-slate-200'}`}
      style={{ height: INVENTORY_CARD_HEIGHT, alignItems: 'stretch' }}
      onClick={() => { setSelections(value => value + 1); onSelect(); }}
    >
      <View className="flex-row items-center gap-3">
        <Text className={`w-8 h-8 rounded-lg text-lg text-center ${item.tone}`}>{item.mark}</Text>
        <Text className="text-base text-slate-900 flex-1 min-w-0">{item.name}</Text>
      </View>
      <Text className="text-xs text-slate-500">{item.category} · Quantity {item.quantity}</Text>
      <Text testID={`item-state-${item.id}`} className={`text-sm ${selected ? accent.text : 'text-slate-400'}`}>
        {selections === 0 ? 'Click to select' : `Selected ${selections} ${selections === 1 ? 'time' : 'times'}`}
      </Text>
    </Button>
  );
}

export function InventoryLab({ embedded = false }: PlaygroundTabProps) {
  const [items, setItems] = useState(() => itemCatalog.slice(0, INITIAL_ITEMS));
  const [category, setCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const accent = accentStyles[useContext(AccentContext)];
  const visibleItems = useMemo(() => items.filter(item => category === 'All' || item.category === category), [items, category]);
  const selectedItem = items.find(item => item.id === selected);
  const categories: readonly Category[] = ['All', 'Seeds', 'Tools'];

  function addItem() {
    const next = itemCatalog.find(candidate => !items.some(item => item.id === candidate.id));
    if (next) setItems(current => [...current, next]);
  }

  function removeItem() {
    const last = items.at(-1);
    if (!last) return;
    setItems(current => current.filter(item => item.id !== last.id));
    if (selected === last.id) setSelected(null);
  }

  return (
    <View testID="inventory-lab" className="gap-4">
      {embedded ? (
        <View className="gap-1">
          <Text className="text-2xl text-slate-900">The garden collection</Text>
          <Text className="text-sm text-slate-500">Select a card, then reverse the order. Its local React state stays with its key.</Text>
        </View>
      ) : (
        <LabIntro
          title="The garden collection"
          paragraphs={[
            'Each card is its own React component with its own state: how many times it was clicked. The cards are drawn from a list and each has a key, so when the list changes React matches cards by key, not by position.',
            'Try it: click a card two or three times, then press Reverse. The cards swap places and each keeps its count, and the selected one keeps its outline: React moved the native elements instead of building new ones. A filter or Remove takes cards out of the tree, so their counts start again when they come back.',
          ]}
        />
      )}
      <View className="flex-row flex-wrap justify-between gap-3">
        <View className="flex-row gap-2">
          {categories.map(value => (
            <Button key={value} testID={`filter-${value.toLowerCase()}`} className={`px-3 py-2 rounded-lg border focus:border-indigo-500 ${category === value ? `${accent.soft} border-transparent` : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`} onClick={() => setCategory(value)}>{value}</Button>
          ))}
        </View>
        <View className="flex-row gap-2">
          <Button testID="reverse-items" className={secondaryButton} onClick={() => setItems(current => [...current].reverse())}>Reverse</Button>
          <Button testID="add-item" className={`${secondaryButton} disabled:text-slate-400`} disabled={items.length === MAX_ITEMS} onClick={addItem}>Add</Button>
          <Button testID="remove-item" className={`${secondaryButton} disabled:text-slate-400`} disabled={items.length === 0} onClick={removeItem}>Remove</Button>
        </View>
      </View>
      {embedded ? null : (
        <Text className={explanationText}>All, Seeds and Tools show one category. Add brings back the next item from the catalogue (up to six) and Remove takes the last one away. The line under the cards names the selected card and counts the cards shown.</Text>
      )}
      {visibleItems.length > 0 ? (
        <View testID="inventory-grid" className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleItems.map(item => <InventoryCard key={item.id} item={item} selected={selected === item.id} onSelect={() => setSelected(item.id)} />)}
        </View>
      ) : (
        <View testID="inventory-empty" className="bg-white border border-slate-200 rounded-xl p-6 gap-2">
          <Text className="text-xl text-slate-900">Room for something new.</Text>
          <Text className="text-sm text-slate-500">Add an item or choose another category to fill the collection.</Text>
        </View>
      )}
      <View className="bg-white rounded-xl border border-slate-200 p-4 flex-row justify-between gap-4">
        <Text testID="inventory-selection" className="text-sm text-slate-700">{selectedItem ? `Selected: ${selectedItem.name}` : 'Choose an item to inspect it.'}</Text>
        <Text testID="inventory-count" className="text-sm text-slate-500">{visibleItems.length} of {items.length} items</Text>
      </View>
    </View>
  );
}

/**
 * All element rectangles have one owner: native Taffy. The root uses symmetric
 * 24/32px gutters; cards use 16/24px padding; siblings use 12–20px gaps. At 600px
 * the counter panels stack and inventory uses two columns; at 1120px they use
 * two and three columns respectively. No fixed desktop coordinate is reused.
 * Native raster acceptance covers both tabs, selection/reorder, empty and
 * disabled/hover/focus states at both intended logical viewport sizes.
 */
export function App() {
  const [demo, setDemo] = useState<Demo>('counter');
  const [accentName, setAccentName] = useState<Accent>('indigo');
  const accent = accentStyles[accentName];

  useEffect(() => {
    lifecycle.appMounts += 1;
    return () => { lifecycle.appCleanups += 1; };
  }, []);

  return (
    <AccentContext.Provider value={accentName}>
      <View testID="app" className="w-full min-h-full bg-slate-50 p-6 md:p-8 gap-5">
        <View className="flex-row items-center justify-between gap-4">
          <View className="gap-1 flex-1 min-w-0">
            <Text className="text-xs text-slate-500">GODOT REACT UI / PLAYGROUND</Text>
            <Text className="text-3xl text-slate-900">Native, by nature.</Text>
            <Text className="text-sm text-slate-500">A small React app. A real Godot canvas.</Text>
          </View>
          <Button testID="accent-toggle" className={`${secondaryButton} text-sm`} onClick={() => setAccentName(value => value === 'indigo' ? 'emerald' : 'indigo')}>Change accent</Button>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Button testID="tab-counter" className={`rounded-lg px-5 py-3 border focus:border-indigo-500 ${demo === 'counter' ? `${accent.primary} border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`} onClick={() => setDemo('counter')}>01  Counter lab</Button>
          <Button testID="tab-inventory" className={`rounded-lg px-5 py-3 border focus:border-indigo-500 ${demo === 'inventory' ? `${accent.primary} border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`} onClick={() => setDemo('inventory')}>02  Inventory</Button>
          <Button testID="tab-motion" className={`rounded-lg px-5 py-3 border focus:border-indigo-500 ${demo === 'motion' ? `${accent.primary} border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`} onClick={() => setDemo('motion')}>03  Motion</Button>
          <Button testID="tab-interaction" className={`rounded-lg px-5 py-3 border focus:border-indigo-500 ${demo === 'interaction' ? `${accent.primary} border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`} onClick={() => setDemo('interaction')}>04  Interaction</Button>
        </View>

        {demo === 'counter' ? <CounterLab embedded /> : demo === 'inventory' ? <InventoryLab embedded /> : demo === 'motion' ? <MotionLab /> : <InteractionLab embedded />}

        <View className="flex-row flex-wrap justify-between gap-2">
          <Text className="text-xs text-slate-400">React 19 · GodotJS · Rust + Taffy</Text>
          <Text className="text-xs text-slate-400">Try resizing. Tab + Enter works too.</Text>
        </View>
      </View>
    </AccentContext.Provider>
  );
}
