import { useRef, useState } from 'react';
import { Button, Text, View, type UIHandle, type UIPointerEvent } from 'godot-react-ui';

/** The pad logs this many of the latest events (moves are counted, not logged). */
const LOG_LINES = 6;
const KNOB_TRACK_WIDTH = 240;
const KNOB_THUMB_WIDTH = 20;
const PERCENT = 100;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-2 py-1 text-xs hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

interface Tally {
  /** `pointerdown`s by pointer type. */
  downs: { mouse: number; touch: number };
  /** The `detail` of every `click`, in order. */
  clicks: number[];
  doubleClicks: number;
  auxClicks: number;
  contextMenus: number;
  cancels: number;
  /** The distinct pointer ids that went down. */
  ids: number[];
}

const EMPTY_TALLY: Tally = { downs: { mouse: 0, touch: 0 }, clicks: [], doubleClicks: 0, auxClicks: 0, contextMenus: 0, cancels: 0, ids: [] };

function describe(event: UIPointerEvent): string {
  return `${event.type} ${event.pointerType}#${event.pointerId} b${event.button} bs${event.buttons} d${event.detail}`;
}

function tally(previous: Tally, event: UIPointerEvent): Tally {
  switch (event.type) {
    case 'pointerdown': {
      const type = event.pointerType === 'touch' ? 'touch' : 'mouse';
      return {
        ...previous,
        downs: { ...previous.downs, [type]: previous.downs[type] + 1 },
        ids: previous.ids.includes(event.pointerId) ? previous.ids : [...previous.ids, event.pointerId].sort((a, b) => a - b),
      };
    }
    case 'click': return { ...previous, clicks: [...previous.clicks, event.detail] };
    case 'dblclick': return { ...previous, doubleClicks: previous.doubleClicks + 1 };
    case 'auxclick': return { ...previous, auxClicks: previous.auxClicks + 1 };
    case 'contextmenu': return { ...previous, contextMenus: previous.contextMenus + 1 };
    case 'pointercancel': return { ...previous, cancels: previous.cancels + 1 };
    case 'pointerup': case 'pointermove': case 'pointerenter': case 'pointerleave':
      return previous;
  }
}

function describeTally(value: Tally): string {
  return `down mouse ${value.downs.mouse} touch ${value.downs.touch}, ids ${value.ids.join(',') || 'none'}, clicks ${value.clicks.join(',') || 'none'}, `
    + `dbl ${value.doubleClicks}, aux ${value.auxClicks}, ctx ${value.contextMenus}, cancel ${value.cancels}`;
}

function Pad() {
  const [lines, setLines] = useState<string[]>([]);
  const [counts, setCounts] = useState(EMPTY_TALLY);
  const [moves, setMoves] = useState(0);
  const record = (event: UIPointerEvent) => {
    setLines(current => [...current, describe(event)].slice(-LOG_LINES));
    setCounts(current => tally(current, event));
  };
  return (
    <View className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-3 gap-2">
      <Text className="text-sm text-slate-900">Pointer pad</Text>
      <View
        testID="pad"
        className="h-16 rounded-lg border-2 border-indigo-300 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 items-center justify-center"
        onPointerDown={record}
        onPointerUp={record}
        onPointerCancel={record}
        onPointerEnter={record}
        onPointerLeave={record}
        onPointerMove={() => setMoves(value => value + 1)}
        onClick={record}
        onDoubleClick={record}
        onAuxClick={record}
        onContextMenu={record}
      >
        <Text className="text-xs text-slate-600">Click, right-click, touch</Text>
      </View>
      <Text testID="pad-log" className="text-xs text-slate-600">{lines.join('\n')}</Text>
      <Text testID="pad-tally" className="text-xs text-slate-500">{describeTally(counts)}</Text>
      <Text testID="pad-moves" className="text-xs text-slate-500">{`moves ${moves}`}</Text>
    </View>
  );
}

function Knob() {
  const track = useRef<UIHandle>(null);
  const [value, setValue] = useState(0);
  const [captured, setCaptured] = useState(false);
  const [moves, setMoves] = useState(0);
  const [captureStatus, setCaptureStatus] = useState('not tried');

  /** The value under `x` (root-local), keeping the thumb inside the track. */
  const update = (x: number) => {
    const rect = track.current?.getRect();
    if (rect === undefined) return;
    const fraction = (x - rect.x - KNOB_THUMB_WIDTH / 2) / (rect.width - KNOB_THUMB_WIDTH);
    setValue(Math.round(Math.min(1, Math.max(0, fraction)) * PERCENT));
  };

  return (
    <View className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 p-3 gap-2">
      <Text className="text-sm text-slate-900">Capture knob</Text>
      <View
        ref={track}
        testID="knob-track"
        className="h-8 rounded-lg bg-slate-200 flex-row overflow-hidden"
        style={{ width: KNOB_TRACK_WIDTH }}
        onPointerDown={(event: UIPointerEvent) => {
          // Everything until the pointer goes up comes here, wherever the pointer is.
          event.currentTarget.setPointerCapture(event.pointerId);
          setCaptured(true);
          update(event.x);
        }}
        onPointerMove={(event: UIPointerEvent) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          setMoves(count => count + 1);
          update(event.x);
        }}
        onPointerUp={() => setCaptured(false)}
        onPointerCancel={() => setCaptured(false)}
      >
        <View className="bg-indigo-300" style={{ width: Math.round(value / PERCENT * (KNOB_TRACK_WIDTH - KNOB_THUMB_WIDTH)) }} />
        <View className="h-8 rounded-lg bg-indigo-600" style={{ width: KNOB_THUMB_WIDTH }} />
      </View>
      <Text testID="knob-readout" className="text-xs text-slate-600">{`value ${value}, captured ${captured}, moves ${moves}`}</Text>
      <Button
        testID="capture-bad"
        className={labButton}
        onClick={(event: UIPointerEvent) => {
          // By the time a click arrives the pointer is up: it cannot be captured.
          try {
            track.current?.setPointerCapture(event.pointerId);
            setCaptureStatus('captured');
          } catch (error) {
            setCaptureStatus(error instanceof Error ? error.message : String(error));
          }
        }}
      >
        Capture an idle pointer
      </Button>
      <Text testID="capture-status" className="text-xs text-slate-500">{captureStatus}</Text>
    </View>
  );
}

/** Phase I2: every pointer event a pointer produces, and pointer capture. */
export function PointerLab() {
  return (
    <View testID="pointer-lab" className="w-full min-h-full bg-slate-50 p-6 gap-4">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Pointers</Text>
        <Text className="text-sm text-slate-500">Mouse buttons, touches, click counts and capture.</Text>
      </View>
      <View className="flex-row gap-4">
        <Pad />
        <Knob />
      </View>
    </View>
  );
}
