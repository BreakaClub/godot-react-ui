import { useState } from 'react';
import { Text, TextField, TextInput, View, type UIBeforeInputEvent, type UIInputEvent, type UIKeyboardEvent } from 'godot-react-ui';

/** Everything the page's fields edit, in one object: the readout is this object as JSON. */
interface ExtraState {
  chat: string;
  sent: number;
  digits: string;
  picky: string;
  locked: boolean;
  narrow: boolean;
  /** How many insertions the picky field refused. */
  refused: number;
}

const INITIAL_STATE: ExtraState = { chat: '', sent: 0, digits: '', picky: '', locked: false, narrow: false, refused: 0 };

/** The picky field refuses an insertion that starts with this, in `beforeinput`. */
export const PICKY_REFUSES = 'no';
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;

const field = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 caret-indigo-600 focus:border-indigo-500';
const labelClass = 'text-sm text-slate-700';

/**
 * Phase I7 fixes (docs/tracks/text-input-fixes.md): the fields that a review found misbehaving, each one the smallest
 * page that shows it. Chat is cleared by its submit, the way a message box is, and digits refuses any edit that is not a
 * number, so a soft keyboard (which holds the whole text itself) shows whether native tells it when the text changed
 * under it. Picky refuses some insertions in `beforeinput` and can be made read-only with F7, to see what happens to a
 * composition that is committed on blur, and to one that is under way when the input stops taking text. Resize changes
 * its width with F6 while it has the focus, to see where its caret goes. The kit field is the one whose label focuses it
 * and which selects its text when it is focused.
 */
export function FormsExtraLab() {
  const [state, setState] = useState<ExtraState>(INITIAL_STATE);
  const patch = (change: Partial<ExtraState>) => setState(current => ({ ...current, ...change }));
  const toggleOnKey = (key: string, field: 'locked' | 'narrow') => (event: UIKeyboardEvent) => {
    if (event.key === key) setState(current => ({ ...current, [field]: !current[field] }));
  };

  return (
    <View testID="forms-extra-lab" className="w-full h-full bg-slate-50 p-4 gap-2 overflow-y-auto">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Forms, extra</Text>
        <Text className="text-sm text-slate-500">Fields that the text input review found misbehaving.</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Chat</Text>
        <TextInput
          testID="extra-chat" className={`w-64 ${field}`} placeholder="Cleared by Enter" value={state.chat}
          onChange={(event: UIInputEvent) => patch({ chat: event.value })}
          onSubmit={() => setState(current => ({ ...current, chat: '', sent: current.sent + 1 }))}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Digits</Text>
        <TextInput
          testID="extra-digits" className={`w-64 ${field}`} placeholder="Numbers only" value={state.digits}
          onChange={(event: UIInputEvent) => { if (/^[0-9]*$/.test(event.value)) patch({ digits: event.value }); }}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Picky</Text>
        <TextInput
          testID="extra-picky" className={`w-64 ${field}`} placeholder="Refuses no..." value={state.picky}
          readOnly={state.locked}
          onBeforeInput={(event: UIBeforeInputEvent) => {
            if (event.inputType !== 'insertText' || !event.data?.startsWith(PICKY_REFUSES)) return;
            event.preventDefault();
            setState(current => ({ ...current, refused: current.refused + 1 }));
          }}
          onKeyDown={toggleOnKey('F7', 'locked')}
          onChange={(event: UIInputEvent) => patch({ picky: event.value })}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Resize</Text>
        <TextInput
          testID="extra-resize" className={`${state.narrow ? 'w-24' : 'w-64'} ${field}`} placeholder="F6 narrows"
          onKeyDown={toggleOnKey('F6', 'narrow')}
        />
      </View>

      <TextField
        testID="extra-kit" label="Pick me" selectTextOnFocus defaultValue="Selected when focused"
        helperText="The label focuses the field."
      />

      <View className="rounded-lg bg-slate-900 p-3">
        <Text testID="extra-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
      </View>
    </View>
  );
}
