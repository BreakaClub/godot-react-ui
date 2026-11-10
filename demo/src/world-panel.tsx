import { useState } from 'react';
import { Button, Text, TextInput, View, type UIInputEvent } from 'godot-react-ui';

const INITIAL_COUNT = 0;
const STEP = 1;
/** The card is narrower than the panel on purpose: the margin around it is see-through and lets pointers by. */
const CARD_WIDTH = 'w-[360px]';

const primaryButton = 'flex-1 rounded-lg border border-transparent px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white focus:border-indigo-300';
const nameField = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 caret-indigo-600 focus:border-indigo-500';
const secondaryButton = 'rounded-lg border border-slate-200 px-4 py-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 focus:border-indigo-500';

/**
 * The React content of the world-space panel: a counter with the two buttons and a name field that the verifier
 * drives. It does not know it is drawn on a quad; it lays out in the `SubViewport`'s pixels like any other root.
 *
 * Every ancestor of the card is `pointer-events-none`, so the transparent margin around the card belongs to
 * whatever the 3D scene has behind the quad, exactly as a HUD's empty space does.
 */
export function WorldPanel() {
  const [count, setCount] = useState(INITIAL_COUNT);
  const [name, setName] = useState('');

  return (
    <View testID="world-root" className="w-full h-full items-center justify-center pointer-events-none">
      <View testID="world-card" className={`${CARD_WIDTH} bg-white rounded-2xl border border-slate-200 p-5 gap-3 pointer-events-auto`}>
        <Text testID="world-title" className="text-sm text-slate-500">A React panel in the 3D world</Text>
        <Text testID="world-count" className="text-5xl text-indigo-600">{count}</Text>
        <View className="flex-row gap-3">
          <Button testID="world-increment" className={primaryButton} onClick={() => setCount(value => value + STEP)}>Add {STEP}</Button>
          <Button testID="world-reset" className={secondaryButton} onClick={() => setCount(INITIAL_COUNT)}>Reset</Button>
        </View>
        <TextInput
          testID="world-input" className={nameField} placeholder="Your name" value={name}
          onChange={(event: UIInputEvent) => setName(event.value)}
        />
        <Text testID="world-echo" className="text-sm text-slate-500">{name === '' ? 'Nobody yet' : `Hello, ${name}`}</Text>
      </View>
    </View>
  );
}
