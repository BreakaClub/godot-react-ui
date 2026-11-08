import { useRef, useState } from 'react';
import {
  Button, Text, TextInput, View, useKeyClaims, useRootEvent, type TextInputHandle, type UIHandle, type UIKeyboardEvent,
} from 'godot-react-ui';

/** The log shows this many of the latest keys. */
const LOG_LINES = 8;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 focus:border-indigo-500';
const focusTarget = 'rounded-xl border-2 border-slate-300 bg-white p-3 gap-1 focus:border-indigo-500';

/** The chord the focused panel claims for itself, and the one the whole page claims. */
const PANEL_CHORD = 'Mod+K';
const PAGE_CHORD = 'Mod+J';

/** A key that only holds a modifier down: pressing it is not a key of the log. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta']);

/** The key as the person pressed it: modifiers, then the key (`Cmd+K`, `Shift+A`, `F2`). */
function describeKey(event: UIKeyboardEvent): string {
  const modifiers = [event.ctrlKey ? 'Ctrl' : '', event.altKey ? 'Alt' : '', event.shiftKey ? 'Shift' : '', event.metaKey ? 'Cmd' : ''].filter(name => name !== '');
  return [...modifiers, event.key === ' ' ? 'Space' : event.key].join('+');
}

function isChord(event: UIKeyboardEvent, key: string): boolean {
  return event.key.toLowerCase() === key && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
}

/**
 * Which keys the browser gets (docs/tracks/key-passthrough.md). On the Web a key chord that nothing here claims (Cmd+R, Cmd+F, Cmd+T, F5, F12)
 * goes to the browser and never reaches this page, as on a page that does not prevent it; one a focused element claims stays here. The log
 * lists the keys that reached the page, so a chord that reloads the page, opens the find bar or focuses the address bar is not in it.
 */
export function KeyPassthroughLab() {
  const [log, setLog] = useState<string[]>([]);
  const [panelUses, setPanelUses] = useState(0);
  const [pageUses, setPageUses] = useState(0);
  const input = useRef<TextInputHandle>(null);
  const panel = useRef<UIHandle>(null);
  const plain = useRef<UIHandle>(null);
  const clearer = useRef<UIHandle>(null);

  // The page claims Mod+J wherever focus is, and handles it from the root.
  useKeyClaims([PAGE_CHORD]);
  useRootEvent('keydown', event => {
    if (MODIFIER_KEYS.has(event.key)) return;
    setLog(current => [...current, `${describeKey(event)}${event.repeat ? ' (repeat)' : ''}`].slice(-LOG_LINES));
    if (isChord(event, 'j')) {
      event.preventDefault();
      setPageUses(count => count + 1);
    }
  });

  return (
    <View testID="key-passthrough-lab" className="w-full min-h-full bg-slate-50 p-6 gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Key pass-through</Text>
        <Text className="text-sm text-slate-500">
          Keys this page does not claim go to the browser: with nothing focused Cmd+R reloads, Cmd+F finds and F12 opens the tools. Typing and
          editing stay in the text input, and the panel keeps its own chord.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Button testID="kp-focus-input" className={labButton} onClick={() => input.current?.focus()}>Focus the text input</Button>
        <Button testID="kp-focus-panel" className={labButton} onClick={() => panel.current?.focus()}>Focus the panel</Button>
        <Button testID="kp-focus-plain" className={labButton} onClick={() => plain.current?.focus()}>Focus the plain box</Button>
        {/* The button took focus when it was pressed, so it lets go of it as well: nothing is focused after it. */}
        <Button ref={clearer} testID="kp-clear-focus" className={labButton} onClick={() => { input.current?.blur(); panel.current?.blur(); plain.current?.blur(); clearer.current?.blur(); }}>Focus nothing</Button>
        <Button testID="kp-clear-log" className={labButton} onClick={() => { setLog([]); setPanelUses(0); setPageUses(0); }}>Clear</Button>
      </View>

      <TextInput
        ref={input}
        testID="kp-input"
        defaultValue="Select this and try Cmd+A, Cmd+C, Cmd+Z"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500"
      />

      <View
        ref={panel}
        testID="kp-panel"
        tabIndex={0}
        keyClaims={[PANEL_CHORD]}
        className={focusTarget}
        onKeyDown={(event: UIKeyboardEvent) => {
          if (isChord(event, 'k')) {
            event.preventDefault();
            setPanelUses(count => count + 1);
          }
        }}
      >
        <Text className="text-sm text-slate-900">A panel that claims Cmd+K (Ctrl+K elsewhere) while it has focus.</Text>
        <Text testID="kp-panel-uses" className="text-xs text-slate-600">{`Cmd+K used here ${panelUses} times`}</Text>
      </View>

      <View ref={plain} testID="kp-plain" tabIndex={0} className={focusTarget}>
        <Text className="text-sm text-slate-900">A box that claims nothing: Cmd+K here goes to the browser.</Text>
      </View>

      <Text testID="kp-page-uses" className="text-xs text-slate-600">{`The page claims Cmd+J wherever focus is: used ${pageUses} times`}</Text>

      <View className="rounded-lg border border-slate-200 bg-white p-3 gap-1">
        <Text className="text-xs text-slate-500">Keys that reached the page</Text>
        <Text testID="kp-log" className="text-xs text-slate-800">{log.length === 0 ? 'none yet' : log.join('\n')}</Text>
      </View>
    </View>
  );
}
