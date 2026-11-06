import { useState } from 'react';
import { Button, Text, View, type UIPointerEvent, type UIWheelEvent } from 'godot-react-ui';

const hudButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500 pointer-events-auto disabled:opacity-50';

interface WheelReadout {
  deltaX: number;
  deltaY: number;
}

function WheelPanel({ testID, title, note, consume, onTick }: {
  testID: string; title: string; note: string; consume: boolean; onTick: (event: UIWheelEvent) => void;
}) {
  return (
    <View
      testID={testID}
      className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-3 gap-1 pointer-events-auto"
      onWheel={(event: UIWheelEvent) => {
        if (consume) event.preventDefault();
        onTick(event);
      }}
    >
      <Text className="text-sm text-slate-900">{title}</Text>
      <Text className="text-xs text-slate-500">{note}</Text>
    </View>
  );
}

/**
 * A game HUD over a Godot scene: every ancestor is `pointer-events-none`, so empty space belongs to
 * whatever the game draws underneath, and only the elements that say `pointer-events-auto` take
 * pointers. The demo owner puts a Godot Control behind the root and counts what reaches it and what
 * reaches `_unhandled_input` (`godotReactDemo.passthrough()`).
 */
export function PassthroughHud() {
  const [inventory, setInventory] = useState(0);
  const [map, setMap] = useState(0);
  const [help, setHelp] = useState(0);
  const [panel, setPanel] = useState(0);
  const [label, setLabel] = useState(0);
  const [locked, setLocked] = useState(false);
  const [consumed, setConsumed] = useState(0);
  const [passed, setPassed] = useState(0);
  const [lastWheel, setLastWheel] = useState<WheelReadout | undefined>(undefined);
  const [lastDown, setLastDown] = useState('none');

  const tick = (counter: (update: (value: number) => number) => void) => (event: UIWheelEvent) => {
    counter(value => value + 1);
    setLastWheel({ deltaX: event.deltaX, deltaY: event.deltaY });
  };
  const recordDown = (event: UIPointerEvent) => setLastDown(`${event.x},${event.y} viewport ${event.viewportX},${event.viewportY}`);

  return (
    <View testID="hud" className="w-full h-full justify-between p-6 gap-4 pointer-events-none">
      <View className="gap-2">
        <View className="flex-row flex-wrap gap-2">
          <Button testID="hud-inventory" disabled={locked} className={hudButton} onClick={() => setInventory(value => value + 1)}>Inventory</Button>
          <Button testID="hud-map" disabled={locked} className={`${hudButton} cursor-pointer`} onClick={() => setMap(value => value + 1)}>Map</Button>
          <Button testID="hud-help" disabled={locked} className={`${hudButton} cursor-help`} onClick={() => setHelp(value => value + 1)}>Help</Button>
          {/* Not a button: it cannot take focus, so with it locked nothing is tabbable. */}
          <View
            testID="hud-lock"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 pointer-events-auto cursor-pointer"
            onClick={() => setLocked(value => !value)}
          >
            <Text className="text-sm text-slate-700">{locked ? 'Unlock buttons' : 'Lock buttons'}</Text>
          </View>
        </View>
        <Text className="text-lg text-slate-900">HUD over the game</Text>
        <Text className="text-xs text-slate-500">Everything here but the controls lets pointers through.</Text>
      </View>

      <View className="gap-2">
        <View
          testID="hud-panel"
          className="self-start bg-white rounded-xl border border-slate-200 p-3 gap-1 pointer-events-auto cursor-move"
          onPointerDown={recordDown}
          onClick={() => setPanel(value => value + 1)}
        >
          <Text testID="hud-panel-label" className="text-sm text-slate-900 pointer-events-none" onClick={() => setLabel(value => value + 1)}>
            Panel (click anywhere on it)
          </Text>
          <Text className="text-xs text-slate-500 pointer-events-none">Its labels have pointer-events-none, so the panel is the target.</Text>
        </View>
        <Text testID="hud-status" className="text-xs text-slate-600">
          {`inventory ${inventory}, map ${map}, help ${help}, panel ${panel}, label ${label}, locked ${locked}`}
        </Text>
        <Text testID="hud-pointer" className="text-xs text-slate-600">{`last panel press ${lastDown}`}</Text>
      </View>

      <View className="gap-2">
        <View className="flex-row gap-3">
          <WheelPanel testID="hud-wheel-consume" title="Wheel: consumed" note="onWheel calls preventDefault()" consume onTick={tick(setConsumed)} />
          <WheelPanel testID="hud-wheel-pass" title="Wheel: passed on" note="onWheel only counts" consume={false} onTick={tick(setPassed)} />
        </View>
        <Text testID="hud-wheel-status" className="text-xs text-slate-600">
          {`consumed ticks ${consumed}, passed ticks ${passed}, last delta ${lastWheel === undefined ? 'none' : `${lastWheel.deltaX},${lastWheel.deltaY}`}`}
        </Text>
      </View>
    </View>
  );
}
