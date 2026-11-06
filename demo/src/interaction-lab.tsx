import { useState, type ReactNode } from 'react';
import { Button, ScrollView, Text, View, type UIPointerEvent } from 'godot-react-ui';

/**
 * What the lab's buttons may ask of their Godot owner from inside a pointer handler. The owner sets
 * it while mounted. It exists to exercise re-entrant native dispatch: unmounting or detaching the
 * root while native is still inside `gui_input`, and reading native state at handler time.
 */
export interface LabOwner {
  /** Unmount the React root and queue the native surface for freeing. */
  unmountRoot(): void;
  /** Remove the native surface from the scene tree, keeping the React root alive. */
  detachSurface(): void;
  processFrame(): number;
  /** Native ID of the element that holds focus right now. */
  focusedNodeId(): number | null;
}

let owner: LabOwner | undefined;

export function setLabOwner(next: LabOwner | undefined): void {
  owner = next;
}

function requireOwner(): LabOwner {
  if (!owner) throw new Error('The interaction lab needs its Godot owner');
  return owner;
}

/** The tab body keeps this height and scrolls what does not fit in it (it does fit at the verifiers' sizes, so no scrollbar shows). */
const LAB_HEIGHT = 'h-[520px]';
const LOG_LIMIT = 8;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-2 py-1 text-xs hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

function append(log: readonly string[], entry: string): string[] {
  return [...log, entry].slice(-LOG_LIMIT);
}

function Panel({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <View className="bg-white rounded-xl border border-slate-200 p-3 gap-2">
      <View className="gap-1">
        <Text className="text-sm text-slate-900">{title}</Text>
        <Text className="text-xs text-slate-500">{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function NestedBox({ name, stop, note, tone, children }: {
  name: string; stop: boolean; note: (entry: string) => void; tone: string; children?: ReactNode;
}) {
  return (
    <View
      testID={`event-${name}`}
      className={`rounded-lg border p-2 gap-1 ${tone}`}
      onPointerDownCapture={(event: UIPointerEvent) => {
        note(`${name}:capture`);
        if (stop && name === 'middle') event.stopPropagation();
      }}
      onPointerDown={() => note(`${name}:bubble`)}
    >
      <Text className="text-xs text-slate-700">{name}</Text>
      {children}
    </View>
  );
}

function EventsPanel() {
  const [log, setLog] = useState<string[]>([]);
  const [stopInCapture, setStopInCapture] = useState(false);
  const [normalClicks, setNormalClicks] = useState(0);
  const [preventedClicks, setPreventedClicks] = useState(0);
  const [probeDown, setProbeDown] = useState('not pressed');
  const [probeFocus, setProbeFocus] = useState('not focused');
  const note = (entry: string) => setLog(current => append(current, entry));
  const describe = () => `frame=${requireOwner().processFrame()} focused=${requireOwner().focusedNodeId() ?? 'none'}`;

  return (
    <Panel title="Events" hint="Press the inner box: capture runs outside in, bubble inside out.">
      <NestedBox name="outer" stop={stopInCapture} note={note} tone="bg-indigo-50 border-indigo-200">
        <NestedBox name="middle" stop={stopInCapture} note={note} tone="bg-indigo-100 border-indigo-300">
          <NestedBox name="inner" stop={stopInCapture} note={note} tone="bg-indigo-200 border-indigo-400" />
        </NestedBox>
      </NestedBox>
      <View className="flex-row flex-wrap gap-2">
        <Button testID="stop-toggle" className={labButton} onClick={() => setStopInCapture(value => !value)}>
          Stop in capture: {stopInCapture ? 'on' : 'off'}
        </Button>
        <Button testID="event-clear" className={labButton} onClick={() => setLog([])}>Clear</Button>
      </View>
      <Text testID="event-log" className="text-xs text-slate-600">{log.join(' ')}</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button testID="focus-normal" className={labButton} onClick={() => setNormalClicks(value => value + 1)}>Takes focus</Button>
        <Button
          testID="focus-prevented"
          className={labButton}
          onPointerDown={event => event.preventDefault()}
          onClick={() => setPreventedClicks(value => value + 1)}
        >
          No focus
        </Button>
        <Button
          testID="sync-probe"
          className={labButton}
          onPointerDown={() => setProbeDown(`down ${describe()}`)}
          onFocus={() => setProbeFocus(`focus ${describe()}`)}
        >
          Probe
        </Button>
      </View>
      <Text testID="focus-status" className="text-xs text-slate-600">Clicks: normal {normalClicks}, no-focus {preventedClicks}</Text>
      <Text testID="probe-down" className="text-xs text-slate-500">{probeDown}</Text>
      <Text testID="probe-focus" className="text-xs text-slate-500">{probeFocus}</Text>
    </Panel>
  );
}

function CrossingPanel() {
  const [log, setLog] = useState<string[]>([]);
  const note = (entry: string) => setLog(current => append(current, entry));
  const crossing = (name: string) => ({
    testID: `chain-${name}`,
    onPointerEnter: () => note(`${name}:enter`),
    onPointerLeave: () => note(`${name}:leave`),
  });

  return (
    <Panel title="Enter and leave" hint="Moving between siblings never leaves or enters their parent.">
      <View {...crossing('parent')} className="flex-row gap-2 p-2 rounded-lg bg-slate-100 hover:bg-slate-200">
        <View {...crossing('a')} className="flex-1 h-8 rounded-lg bg-white hover:bg-emerald-100" />
        <View {...crossing('b')} className="flex-1 h-8 rounded-lg bg-white hover:bg-emerald-100" />
      </View>
      <Text testID="chain-log" className="text-xs text-slate-600">{log.join(' ')}</Text>
      <Button testID="chain-clear" className={labButton} onClick={() => setLog([])}>Clear</Button>
    </Panel>
  );
}

function ReentrancyPanel() {
  const [present, setPresent] = useState(true);
  const [removedClicks, setRemovedClicks] = useState(0);
  const [clickPresent, setClickPresent] = useState(true);

  return (
    <Panel title="Re-entrancy" hint="Each button changes the tree while native is still handling its press.">
      <View className="flex-row flex-wrap gap-2">
        {present && (
          <Button
            testID="self-remove"
            className={labButton}
            onPointerDown={() => setPresent(false)}
            onClick={() => setRemovedClicks(value => value + 1)}
          >
            Remove me
          </Button>
        )}
        <Button testID="self-restore" className={labButton} onClick={() => setPresent(true)}>Restore</Button>
        {clickPresent && (
          <Button testID="click-remove" className={labButton} onClick={() => setClickPresent(false)}>Remove on click</Button>
        )}
        <Button testID="click-restore" className={labButton} onClick={() => setClickPresent(true)}>Bring back</Button>
        <Button testID="danger-detach" className={labButton} onPointerDown={() => requireOwner().detachSurface()}>Detach root</Button>
        <Button testID="danger-unmount" className={labButton} onPointerDown={() => requireOwner().unmountRoot()}>Unmount root</Button>
      </View>
      <Text testID="reentrancy-status" className="text-xs text-slate-600">
        {present ? 'Button present' : 'Button removed'}, clicks on it: {removedClicks}
      </Text>
    </Panel>
  );
}

/** The interaction lab: a vertical scroll view, so sections added to it scroll inside this body (Phase I5). */
export function InteractionLab() {
  return (
    <ScrollView testID="interaction-lab" className={LAB_HEIGHT} contentClassName="gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Interaction, in order.</Text>
        <Text className="text-sm text-slate-500">Native dispatches input to React synchronously, so a handler can change what native does next.</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 min-w-0"><EventsPanel /></View>
        <View className="flex-1 min-w-0 gap-3">
          <CrossingPanel />
          <ReentrancyPanel />
        </View>
      </View>
    </ScrollView>
  );
}
