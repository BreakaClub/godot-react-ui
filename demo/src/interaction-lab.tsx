import { useState, type ReactNode } from 'react';
import { Button, ScrollView, Text, View, type UIPointerEvent } from 'godot-react-ui';
import { LAB_CARD_CLASS, LabCase, LabGrid, LabIntro } from './lab-parts';

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
const NO_FOCUS_HOLDER = 'none';

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-2 py-1 text-xs hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
/** The same buttons with a finger's room, for the lab as a page of the navigator. */
const roomyButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
/** A button that takes the whole page away for a moment: it looks like what it does. */
const dangerButton = 'rounded-lg border border-rose-200 bg-white text-rose-700 px-3 py-2 text-sm hover:bg-rose-50 active:bg-rose-100 focus:border-indigo-500';
const explanationText = 'text-xs text-slate-500';

interface InteractionLabProps {
  /**
   * The lab is the playground's Interaction tab (`App`): a 520 px scrolling body of three panels, laid out as the verifiers' two windows read it, with
   * no explanation. Left off, the lab is a page of the navigator: an introduction, then a card for each case with its caption and what to expect.
   */
  embedded?: boolean;
}

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

/** A log line: what the handlers saw, in the order they ran. A page that explains itself says what the empty line is waiting for. */
function LogText({ testID, entries, explained, waitingFor }: { testID: string; entries: readonly string[]; explained: boolean; waitingFor: string }) {
  const text = entries.join(' ');
  return (
    <>
      {explained ? <Text className="text-xs text-slate-500">What ran, in order</Text> : null}
      <Text testID={testID} className="text-xs text-slate-600">{explained && text === '' ? waitingFor : text}</Text>
    </>
  );
}

/** Capture and bubble through three nested boxes, and the toggle that stops the event in the middle box's capture handler. */
function CaptureBubbleControls({ explained }: { explained: boolean }) {
  const [log, setLog] = useState<string[]>([]);
  const [stopInCapture, setStopInCapture] = useState(false);
  const note = (entry: string) => setLog(current => append(current, entry));
  const button = explained ? roomyButton : labButton;

  return (
    <>
      <NestedBox name="outer" stop={stopInCapture} note={note} tone="bg-indigo-50 border-indigo-200">
        <NestedBox name="middle" stop={stopInCapture} note={note} tone="bg-indigo-100 border-indigo-300">
          <NestedBox name="inner" stop={stopInCapture} note={note} tone="bg-indigo-200 border-indigo-400" />
        </NestedBox>
      </NestedBox>
      <View className="flex-row flex-wrap gap-2">
        <Button testID="stop-toggle" className={button} onClick={() => setStopInCapture(value => !value)}>
          Stop in capture: {stopInCapture ? 'on' : 'off'}
        </Button>
        <Button testID="event-clear" className={button} onClick={() => setLog([])}>Clear</Button>
      </View>
      <LogText testID="event-log" entries={log} explained={explained} waitingFor="Nothing yet: press the inner box." />
    </>
  );
}

/**
 * A press that takes focus, one whose `pointerdown` is prevented, and a probe that reads native state from inside its handlers. The page that
 * explains itself also says which of them holds focus, because a press focuses a button without drawing a focus ring.
 */
function FocusControls({ explained }: { explained: boolean }) {
  const [normalClicks, setNormalClicks] = useState(0);
  const [preventedClicks, setPreventedClicks] = useState(0);
  const [probeDown, setProbeDown] = useState('not pressed');
  const [probeFocus, setProbeFocus] = useState('not focused');
  const [holder, setHolder] = useState(NO_FOCUS_HOLDER);
  const describe = () => `frame=${requireOwner().processFrame()} focused=${requireOwner().focusedNodeId() ?? 'none'}`;
  const button = explained ? roomyButton : labButton;
  // Only the page that explains itself listens for focus and blur to say who holds focus; the playground's tab keeps the handlers it always had.
  // A blur only clears the focus line if the button that lost focus is still the one it names, so it does not matter which of blur and focus comes first.
  const releases = (name: string) => () => setHolder(current => (current === name ? NO_FOCUS_HOLDER : current));
  const holding = (name: string) => (explained ? { onFocus: () => setHolder(name), onBlur: releases(name) } : {});

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        <Button testID="focus-normal" className={button} onClick={() => setNormalClicks(value => value + 1)} {...holding('Takes focus')}>Takes focus</Button>
        <Button
          testID="focus-prevented"
          className={button}
          onPointerDown={event => event.preventDefault()}
          onClick={() => setPreventedClicks(value => value + 1)}
        >
          No focus
        </Button>
        <Button
          testID="sync-probe"
          className={button}
          onPointerDown={() => setProbeDown(`down ${describe()}`)}
          onFocus={() => {
            setProbeFocus(`focus ${describe()}`);
            if (explained) setHolder('Probe');
          }}
          {...(explained ? { onBlur: releases('Probe') } : {})}
        >
          Probe
        </Button>
      </View>
      {explained ? <Text className="text-xs text-slate-500">{`Focus is on: ${holder}`}</Text> : null}
      <Text testID="focus-status" className="text-xs text-slate-600">Clicks: normal {normalClicks}, no-focus {preventedClicks}</Text>
      <Text testID="probe-down" className="text-xs text-slate-500">{probeDown}</Text>
      <Text testID="probe-focus" className="text-xs text-slate-500">{probeFocus}</Text>
    </>
  );
}

/** Two boxes in a group: the group and each box log the crossings, and highlight while hovered (on a touch, while pressed). */
function CrossingControls({ explained }: { explained: boolean }) {
  const [log, setLog] = useState<string[]>([]);
  const note = (entry: string) => setLog(current => append(current, entry));
  const crossing = (name: string) => ({
    testID: `chain-${name}`,
    onPointerEnter: () => note(`${name}:enter`),
    onPointerLeave: () => note(`${name}:leave`),
  });
  // A touch never hovers, so the page that explains itself gives every highlight a pressed twin.
  const parentTone = explained ? 'hover:bg-slate-200 active:bg-slate-200' : 'hover:bg-slate-200';
  const boxTone = explained ? 'hover:bg-emerald-100 active:bg-emerald-100' : 'hover:bg-emerald-100';

  return (
    <>
      <View {...crossing('parent')} className={`flex-row gap-2 p-2 rounded-lg bg-slate-100 ${parentTone}`}>
        <View {...crossing('a')} className={`flex-1 h-8 rounded-lg bg-white ${boxTone}`} />
        <View {...crossing('b')} className={`flex-1 h-8 rounded-lg bg-white ${boxTone}`} />
      </View>
      <LogText testID="chain-log" entries={log} explained={explained} waitingFor="Nothing yet: move the pointer over the boxes." />
      <Button testID="chain-clear" className={explained ? roomyButton : labButton} onClick={() => setLog([])}>Clear</Button>
    </>
  );
}

/** Buttons that change the tree, or take the whole page away, while native is still handling the press that fired them. */
function ReentrancyControls({ explained }: { explained: boolean }) {
  const [present, setPresent] = useState(true);
  const [removedClicks, setRemovedClicks] = useState(0);
  const [clickPresent, setClickPresent] = useState(true);
  const button = explained ? roomyButton : labButton;

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {present && (
          <Button
            testID="self-remove"
            className={button}
            onPointerDown={() => setPresent(false)}
            onClick={() => setRemovedClicks(value => value + 1)}
          >
            Remove me
          </Button>
        )}
        <Button testID="self-restore" className={button} onClick={() => setPresent(true)}>Restore</Button>
        {clickPresent && (
          <Button testID="click-remove" className={button} onClick={() => setClickPresent(false)}>Remove on click</Button>
        )}
        <Button testID="click-restore" className={button} onClick={() => setClickPresent(true)}>Bring back</Button>
        <Button testID="danger-detach" className={explained ? dangerButton : labButton} onPointerDown={() => requireOwner().detachSurface()}>Detach root</Button>
        <Button testID="danger-unmount" className={explained ? dangerButton : labButton} onPointerDown={() => requireOwner().unmountRoot()}>Unmount root</Button>
      </View>
      <Text testID="reentrancy-status" className="text-xs text-slate-600">
        {present ? 'Button present' : 'Button removed'}, clicks on it: {removedClicks}
      </Text>
    </>
  );
}

/** The lab as the playground's tab: three panels in a scroll view of a fixed height, as the verifiers' windows read them. */
function EmbeddedLab() {
  return (
    <ScrollView testID="interaction-lab" className={LAB_HEIGHT} contentClassName="gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Interaction, in order.</Text>
        <Text className="text-sm text-slate-500">Native dispatches input to React synchronously, so a handler can change what native does next.</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 min-w-0">
          <Panel title="Events" hint="Press the inner box: capture runs outside in, bubble inside out.">
            <CaptureBubbleControls explained={false} />
            <FocusControls explained={false} />
          </Panel>
        </View>
        <View className="flex-1 min-w-0 gap-3">
          <Panel title="Enter and leave" hint="Moving between siblings never leaves or enters their parent.">
            <CrossingControls explained={false} />
          </Panel>
          <Panel title="Re-entrancy" hint="Each button changes the tree while native is still handling its press.">
            <ReentrancyControls explained={false} />
          </Panel>
        </View>
      </View>
    </ScrollView>
  );
}

/** The lab as a page of the navigator: what it shows, then a card for each case, wrapping to the width the window gives it. */
function ExplainedLab() {
  return (
    <View testID="interaction-lab" className="gap-4">
      <LabIntro
        title="Events, in the order they run"
        paragraphs={[
          'Press the boxes and buttons below and read what React heard. Each card is one rule of the event system, and each follows the browser: capture handlers run from the outside in, bubble handlers from the target back out, and pointer enter and leave reach only the elements the pointer crosses.',
          'Why it matters: native hands a press to React synchronously, from inside Godot\'s input callback, so a handler can change what native does next, from cancelling the focus to removing its own button. The last card does that on purpose.',
        ]}
      />
      <LabGrid>
        <LabCase
          title="Capture and bubble"
          className={LAB_CARD_CLASS}
          caption="Press the inner box. Every box has a capture handler, which runs on the way in, outermost first, and a bubble handler, which runs on the way out, innermost first. The log lists them in the order they ran. With Stop in capture on, the middle box stops the event while it is still on the way in."
          expected="outer:capture middle:capture inner:capture inner:bubble middle:bubble outer:bubble. With Stop in capture on: outer:capture middle:capture, and no bubble handler at all."
        >
          <CaptureBubbleControls explained />
        </LabCase>
        <LabCase
          title="Focus and preventDefault"
          className={LAB_CARD_CLASS}
          caption="Press each button. A press gives a button focus without drawing a focus ring, so the line under the buttons says who has it. No focus calls preventDefault in its pointerdown handler, so native does not focus it, but its click still counts. Probe records what its own handlers saw while native was still inside the press."
          expected="Takes focus moves the focus line to it. No focus leaves the focus where it was and still counts a click. After Probe, the pointerdown line and the focus line show the same frame."
        >
          <FocusControls explained />
        </LabCase>
        <LabCase
          title="Enter and leave"
          className={LAB_CARD_CLASS}
          caption="Move a mouse from one white box to the other, then out of the grey group. The log lists each crossing. A touch never hovers, so on a touch screen press and hold a box to see it highlight."
          expected="parent:enter a:enter a:leave b:enter b:leave parent:leave. The group is entered once and left once, though the pointer moved between its boxes."
        >
          <CrossingControls explained />
        </LabCase>
        <LabCase
          title="Changing the tree during a press"
          className={LAB_CARD_CLASS}
          caption="Each button changes the tree while native is still handling the press that fired it. Remove me removes itself on pointerdown, so no click can reach it. Remove on click removes itself from its own click. Detach root and Unmount root take the whole page away from inside the press, this navigator included; it comes back a moment later, at this lab."
          expected="After Remove me: Button removed, clicks on it: 0. Nothing throws, and nothing is left focused on a button that is gone."
        >
          <ReentrancyControls explained />
        </LabCase>
      </LabGrid>
    </View>
  );
}

/** The interaction lab: the playground's tab when `embedded`, else a page of the navigator that explains each case (Phase I5). */
export function InteractionLab({ embedded = false }: InteractionLabProps) {
  return embedded ? <EmbeddedLab /> : <ExplainedLab />;
}
