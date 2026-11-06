import { useRef, useState, type RefObject } from 'react';
import { Button, Text, View, type UIFocusEvent, type UIHandle, type UIKeyboardEvent, type UIPointerEvent } from 'godot-react-ui';

/** The log shows this many of the latest events. */
const LOG_LINES = 6;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 focus:border-indigo-500';

function describeKey(event: UIKeyboardEvent): string {
  return `${event.type} key=${event.key} code=${event.code} repeat=${event.repeat}`;
}

function describeFocus(event: UIFocusEvent): string {
  return `${event.type} related=${event.relatedTarget?.testID ?? 'none'} visible=${event.focusVisible}`;
}

function append(log: readonly string[], line: string): string[] {
  return [...log, line].slice(-LOG_LINES);
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
      <View className="flex-row gap-2">
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
  const [activation, setActivation] = useState({ clicks: 0, pointerDowns: 0, last: 'none' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [focusStatus, setFocusStatus] = useState('not tried');
  const [swapped, setSwapped] = useState(false);
  const card = useRef<UIHandle>(null);
  const plainView = useRef<UIHandle>(null);
  const opener = useRef<UIHandle>(null);

  return (
    <View testID="keyboard-lab" className="w-full min-h-full bg-slate-50 p-6 gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Keyboard</Text>
        <Text className="text-sm text-slate-500">Tab order, the focus ring, key events and a focus trap.</Text>
      </View>

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
      <Text testID="kb-activate-status" className="text-xs text-slate-600">
        {`clicks ${activation.clicks}, pointerdowns ${activation.pointerDowns}, last click ${activation.last}`}
      </Text>

      {/* Two keyed buttons that trade places: Tab follows the document, not the order they were created in. */}
      <View className="flex-row flex-wrap gap-2">
        {(swapped ? ['b', 'a'] : ['a', 'b']).map(name => (
          <Button key={name} testID={`kb-swap-${name}`} className={labButton}>{`Swap ${name.toUpperCase()}`}</Button>
        ))}
        <Button testID="kb-swap" className={labButton} onClick={() => setSwapped(value => !value)}>Trade places</Button>
      </View>

      <View className="flex-row gap-3">
        <View
          ref={card}
          testID="kb-card"
          tabIndex={0}
          className="flex-1 min-w-0 rounded-xl border-2 border-slate-300 bg-white p-3 gap-1 focus:border-indigo-500 focus-visible:bg-amber-100"
          onKeyDown={(event: UIKeyboardEvent) => setKeyLog(current => append(current, describeKey(event)))}
          onKeyUp={(event: UIKeyboardEvent) => setKeyLog(current => append(current, describeKey(event)))}
          onFocus={(event: UIFocusEvent) => setFocusLog(current => append(current, describeFocus(event)))}
          onBlur={(event: UIFocusEvent) => setFocusLog(current => append(current, describeFocus(event)))}
        >
          <Text className="text-sm text-slate-900">Card (tabIndex 0)</Text>
          <Text className="text-xs text-slate-500">Keys pressed while it has focus are logged.</Text>
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
      <Text testID="kb-log" className="text-xs text-slate-600">{keyLog.join('\n')}</Text>
      <Text testID="kb-focus-log" className="text-xs text-slate-500">{focusLog.join('\n')}</Text>

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
      <Text testID="kb-focus-status" className="text-xs text-slate-500">{focusStatus}</Text>

      {dialogOpen && <Dialog onClose={() => setDialogOpen(false)} opener={opener} />}
    </View>
  );
}
