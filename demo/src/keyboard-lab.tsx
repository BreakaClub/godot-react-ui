import { useRef, useState, type RefObject } from 'react';
import { Button, Text, View, type UIFocusEvent, type UIHandle, type UIKeyboardEvent, type UIPointerEvent } from 'godot-react-ui';
import { LabIntro, Readout, useExpectedVisible } from './lab-parts';

/** The log shows this many of the latest events. */
const LOG_LINES = 6;
/** The Activate and Keyup prevented buttons are indigo, and so are the counters of their clicks. */
const BUTTON_COLOUR = '#4f46e5';
/** `event.key` of the space bar, shown by its name in the card. */
const SPACE_KEY = ' ';

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 focus:border-indigo-500';

/** How the card has focus: from a press, or from the keyboard (which also draws the ring and matches `focus-visible:`). */
type CardFocus = 'none' | 'pointer' | 'keyboard';
const CARD_FOCUS_TEXT: Readonly<Record<CardFocus, string>> = {
  none: 'none',
  pointer: 'yes, from a press (no ring)',
  keyboard: 'yes, from the keyboard (ring)',
};

function describeKey(event: UIKeyboardEvent): string {
  return `${event.type} key=${event.key} code=${event.code} repeat=${event.repeat}`;
}

function describeFocus(event: UIFocusEvent): string {
  return `${event.type} related=${event.relatedTarget?.testID ?? 'none'} visible=${event.focusVisible}`;
}

function append(log: readonly string[], line: string): string[] {
  return [...log, line].slice(-LOG_LINES);
}

/**
 * What a group of controls shows and what to try, as one paragraph over them: its name, then the caption, then what to expect. No card
 * around it, because the keyboard verifier's windows (1120 x 800 and 600 x 900) must still hold every control this lab presses.
 */
function Note({ title, children, expected }: { title: string; children: string; expected?: string }) {
  const showExpected = useExpectedVisible();
  return (
    <Text className="text-xs text-slate-600">
      <Text className="text-slate-900">{`${title}. `}</Text>
      {children}
      {expected !== undefined && showExpected ? <Text className="text-indigo-700">{` Expected: ${expected}`}</Text> : null}
    </Text>
  );
}

/** A modal dialog that keeps Tab inside itself, written in JS from `onKeyDown`, `preventDefault()` and `focus()`. */
function Dialog({ onClose, opener }: { onClose: () => void; opener: RefObject<UIHandle | null> }) {
  const first = useRef<UIHandle>(null);
  const last = useRef<UIHandle>(null);
  return (
    <View
      testID="kb-dialog"
      className="rounded-xl border-2 border-indigo-300 bg-white p-3 gap-2"
      onKeyDown={(event: UIKeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          opener.current?.focus();
        } else if (event.key === 'Tab') {
          // `event.target` is the focused element; Tab at either end of the dialog wraps inside it.
          const atEnd = event.shiftKey ? first.current : last.current;
          if (atEnd !== null && event.target.id === atEnd.id) {
            event.preventDefault();
            (event.shiftKey ? last.current : first.current)?.focus();
          }
        }
      }}
    >
      <Text className="text-sm text-slate-900">Dialog: Tab stays in here, Escape closes it.</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button ref={first} testID="dlg-ok" autoFocus className={labButton} onClick={onClose}>OK</Button>
        <Button testID="dlg-cancel" className={labButton} onClick={onClose}>Cancel</Button>
        <Button ref={last} testID="dlg-more" className={labButton}>More</Button>
      </View>
    </View>
  );
}

/** Phase I3: Tab order, the focus ring, key events, keyboard activation, a focus trap and `focus()`. */
export function KeyboardLab() {
  const [keyLog, setKeyLog] = useState<string[]>([]);
  const [focusLog, setFocusLog] = useState<string[]>([]);
  const [cardFocus, setCardFocus] = useState<CardFocus>('none');
  const [lastKey, setLastKey] = useState('none');
  const [activation, setActivation] = useState({ clicks: 0, pointerDowns: 0, last: 'none' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [focusStatus, setFocusStatus] = useState('not tried');
  const [swapped, setSwapped] = useState(false);
  const [vetoClicks, setVetoClicks] = useState(0);
  const card = useRef<UIHandle>(null);
  const plainView = useRef<UIHandle>(null);
  const opener = useRef<UIHandle>(null);

  return (
    <View testID="keyboard-lab" className="w-full min-h-full bg-slate-50 p-6 gap-3">
      <LabIntro
        title="Focus and key events"
        paragraphs={[
          'This lab is for a keyboard: Tab and the key presses need one attached to a phone, though every button still answers a tap.',
          'It checks the focus model against the browser\'s: Tab visits buttons and tabIndex 0 elements in document order, the ring and :focus-visible show for keyboard focus only, and key events carry the DOM\'s key, code and repeat.',
        ]}
      />

      <Note title="Tab order and activation">
        Tab walks the buttons in document order and wraps; Shift+Tab goes back; Disabled is skipped. The ring marks keyboard focus only, and Plain has no focus style, so the ring is all it shows. Enter or Space on Activate clicks it with no pointerdown; a mouse click or a tap adds one.
      </Note>
      <View className="flex-row flex-wrap gap-2">
        <Button testID="kb-first" className={labButton}>First</Button>
        <Button testID="kb-disabled" disabled className={`${labButton} disabled:opacity-50`}>Disabled</Button>
        <Button
          testID="kb-activate"
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 text-sm"
          onPointerDown={() => setActivation(value => ({ ...value, pointerDowns: value.pointerDowns + 1 }))}
          onClick={(event: UIPointerEvent) => setActivation(value => ({
            ...value, clicks: value.clicks + 1, last: `type "${event.pointerType}" id ${event.pointerId} d${event.detail}`,
          }))}
        >
          Activate
        </Button>
        {/* No `focus:` class: only the ring shows it has focus. */}
        <Button testID="kb-plain" className="rounded-lg bg-white border border-slate-200 text-slate-700 px-3 py-2 text-sm">Plain</Button>
      </View>
      <Readout
        label="Activate counts" colour={BUTTON_COLOUR} testID="kb-activate-status"
        value={`clicks ${activation.clicks}, pointerdowns ${activation.pointerDowns}, last click ${activation.last}`}
      />

      {/* A parent that prevents every keyup: the button's press must still end with its key, though it does not click. */}
      <Note title="A parent that cancels keyup">
        A parent of the next button prevents every keyup. Focus it and press Space: it looks pressed and then released, but no click is counted, as in a browser. A mouse click or a tap still counts.
      </Note>
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1" onKeyUp={(event: UIKeyboardEvent) => event.preventDefault()}>
        <Button
          testID="kb-vetoed"
          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3 py-2 text-sm"
          onClick={() => setVetoClicks(value => value + 1)}
        >
          Keyup prevented
        </Button>
        <Readout label="Clicks counted" colour={BUTTON_COLOUR} testID="kb-veto-status" value={`clicks ${vetoClicks}`} />
      </View>

      {/* Two keyed buttons that trade places: Tab follows the document, not the order they were created in. */}
      <Note title="Tab follows the document">
        Tab follows the order of the elements in the tree, not the order they were made in. Press Trade places: A and B swap places on screen, and Tab now visits them in the new order.
      </Note>
      <View className="flex-row flex-wrap gap-2">
        {(swapped ? ['b', 'a'] : ['a', 'b']).map(name => (
          <Button key={name} testID={`kb-swap-${name}`} className={labButton}>{`Swap ${name.toUpperCase()}`}</Button>
        ))}
        <Button testID="kb-swap" className={labButton} onClick={() => setSwapped(value => !value)}>Trade places</Button>
      </View>

      <Note title="Focusable cards" expected="a click on Card gives it an indigo border and no ring or tint; Tab onto it adds the ring and the amber tint.">
        Card has tabIndex 0, so Tab stops on it. Skipped has tabIndex -1: a press focuses it, Tab never does. Both change their border on any focus, but only Card tints when the focus came from the keyboard (focus-visible:). Card shows its focus and the last key pressed on it.
      </Note>
      <View className="flex-row gap-3">
        <View
          ref={card}
          testID="kb-card"
          tabIndex={0}
          className="flex-1 min-w-0 rounded-xl border-2 border-slate-300 bg-white p-3 gap-1 focus:border-indigo-500 focus-visible:bg-amber-100"
          onKeyDown={(event: UIKeyboardEvent) => {
            setKeyLog(current => append(current, describeKey(event)));
            setLastKey(event.key === SPACE_KEY ? 'Space' : event.key);
          }}
          onKeyUp={(event: UIKeyboardEvent) => setKeyLog(current => append(current, describeKey(event)))}
          onFocus={(event: UIFocusEvent) => {
            setFocusLog(current => append(current, describeFocus(event)));
            setCardFocus(event.focusVisible ? 'keyboard' : 'pointer');
          }}
          onBlur={(event: UIFocusEvent) => {
            setFocusLog(current => append(current, describeFocus(event)));
            setCardFocus('none');
          }}
        >
          <Text className="text-sm text-slate-900">Card (tabIndex 0)</Text>
          <Text className="text-xs text-slate-500">{`Focus: ${CARD_FOCUS_TEXT[cardFocus]}`}</Text>
          <Text className="text-xs text-slate-500">{`Last key: ${lastKey}`}</Text>
        </View>
        <View
          testID="kb-skip"
          tabIndex={-1}
          className="flex-1 min-w-0 rounded-xl border-2 border-slate-300 bg-white p-3 gap-1 focus:border-indigo-500"
        >
          <Text className="text-sm text-slate-900">Skipped (tabIndex -1)</Text>
          <Text className="text-xs text-slate-500">A press focuses it; Tab never stops here.</Text>
        </View>
      </View>

      <Note title="A dialog that traps Tab, and focus() from code">
        Open dialog shows a dialog written in JS: Tab and Shift+Tab stay inside it, and Escape closes it and gives focus back to Open dialog. Focus card calls focus() from a click, so it is a pointer focus with no ring; Focus card (ring) asks for the ring. Focus a plain view calls focus() on a view that has no tabIndex, which throws: the message is the result.
      </Note>
      <View className="flex-row flex-wrap gap-2">
        <Button ref={opener} testID="kb-open" className={labButton} onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Button testID="kb-focus-card" className={labButton} onClick={() => card.current?.focus()}>Focus card</Button>
        <Button testID="kb-focus-card-visible" className={labButton} onClick={() => card.current?.focus({ focusVisible: true })}>Focus card (ring)</Button>
        <Button
          testID="kb-focus-bad"
          className={labButton}
          onClick={() => {
            try {
              plainView.current?.focus();
              setFocusStatus('focused');
            } catch (error) {
              setFocusStatus(error instanceof Error ? error.message : String(error));
            }
          }}
        >
          Focus a plain view
        </Button>
      </View>
      <View ref={plainView} testID="kb-plain-view" className="rounded-lg bg-slate-100 p-2">
        <Text className="text-xs text-slate-500">A plain view: no tabIndex, so it cannot take focus.</Text>
      </View>
      <Readout label="Result of focus() on the plain view" testID="kb-focus-status" value={focusStatus} />

      {dialogOpen && <Dialog onClose={() => setDialogOpen(false)} opener={opener} />}

      <View className="gap-1">
        <Text className="text-xs text-slate-900">{`Events on Card, the last ${LOG_LINES}`}</Text>
        <Text className="text-xs text-slate-500">
          Each key line is the event, the key, the code and repeat. Each focus line is the event, the element focus came from (focus) or goes to (blur) and whether it is a keyboard focus (visible).
        </Text>
        <Text testID="kb-log" className="text-xs text-slate-600">{keyLog.join('\n')}</Text>
        <Text testID="kb-focus-log" className="text-xs text-slate-500">{focusLog.join('\n')}</Text>
      </View>
    </View>
  );
}
