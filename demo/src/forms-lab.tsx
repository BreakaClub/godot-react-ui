import { useState } from 'react';
import { Button, Text, TextInput, View, type UICompositionEvent, type UIInputEvent } from 'godot-react-ui';

/** Everything the page's fields edit, in one object: the readout is this object as JSON. */
interface FormState {
  name: string;
  password: string;
  code: string;
  shout: string;
  notes: string;
  comments: string;
  submitted: number;
}

const INITIAL_STATE: FormState = { name: '', password: '', code: '', shout: '', notes: '', comments: '', submitted: 0 };

/** The `maxLength` of the code field, in UTF-16 units. */
const CODE_MAX_LENGTH = 6;
/** The notes field is this many lines tall. */
const NOTES_ROWS = 3;
/** The comments field, below the readout, is this many. */
const COMMENTS_ROWS = 4;
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;
/** How many of the name field's latest events the log keeps. */
const LOG_LENGTH = 12;

const field = 'w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 caret-indigo-600 focus:border-indigo-500';
const labelClass = 'text-sm text-slate-700';
const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

/**
 * Phase I7: the text fields, bound to one state object whose JSON is the readout the verifier parses. Name is
 * controlled and stores what is typed; password is secure; code stops at six characters; shout is controlled and stores
 * the text in capitals, so native has to be told; the read-only field can be focused and copied from; notes is a text
 * area; free is uncontrolled. Enter in a single-line field counts a submit. The page scrolls, and a comments area below
 * the readout is reached by scrolling: a wheel over notes scrolls the text first and the page after it.
 */
export function FormsLab() {
  const [state, setState] = useState<FormState>(INITIAL_STATE);
  const [free, setFree] = useState('');
  // The name field's composition and input events, in order: what an IME or a virtual keyboard did to it.
  const [log, setLog] = useState<readonly string[]>([]);
  const note = (entry: string) => setLog(current => [...current, entry].slice(-LOG_LENGTH));
  const patch = (change: Partial<FormState>) => setState(current => ({ ...current, ...change }));
  const submit = () => setState(current => ({ ...current, submitted: current.submitted + 1 }));

  return (
    <View testID="forms-lab" className="w-full h-full bg-slate-50 p-4 gap-2 overflow-y-auto">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Forms</Text>
        <Text className="text-sm text-slate-500">Single-line and multi-line text inputs bound to one state object.</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Name</Text>
        <TextInput
          testID="form-name" className={field} placeholder="Your name" value={state.name} onSubmit={submit}
          onChange={(event: UIInputEvent) => { patch({ name: event.value }); note(`input:${event.inputType}`); }}
          onCompositionStart={() => note('compositionstart')}
          onCompositionUpdate={(event: UICompositionEvent) => note(`compositionupdate:${event.data}`)}
          onCompositionEnd={() => note('compositionend')}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Password</Text>
        <TextInput
          testID="form-password" className={field} placeholder="Password" secure value={state.password}
          onChange={(event: UIInputEvent) => patch({ password: event.value })}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Code</Text>
        <TextInput
          testID="form-code" className={field} placeholder="At most six" maxLength={CODE_MAX_LENGTH} value={state.code}
          onChange={(event: UIInputEvent) => patch({ code: event.value })}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Shout</Text>
        <TextInput
          testID="form-shout" className={field} placeholder="Always capitals" value={state.shout}
          onChange={(event: UIInputEvent) => patch({ shout: event.value.toUpperCase() })}
        />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Read-only</Text>
        <TextInput testID="form-readonly" className={field} readOnly defaultValue="Copy me, you cannot edit me" />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Select all</Text>
        <TextInput testID="form-select" className={field} selectTextOnFocus defaultValue="Selected when focused" />
      </View>

      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>Free</Text>
        <TextInput
          testID="form-free" className={field} placeholder="Uncontrolled"
          onChange={(event: UIInputEvent) => setFree(event.value)}
        />
        <Text testID="form-free-echo" className={labelClass}>{`${free.length} typed`}</Text>
      </View>

      <View className="flex-row items-start gap-3">
        <Text className={`w-24 ${labelClass}`}>Notes</Text>
        <TextInput
          testID="form-notes" className={`${field} h-auto`} multiline rows={NOTES_ROWS} placeholder="Notes" value={state.notes}
          onChange={(event: UIInputEvent) => patch({ notes: event.value })}
        />
      </View>

      <View className="flex-row gap-3">
        <Button testID="form-reset" className={labButton} onClick={() => { setState(INITIAL_STATE); setFree(''); setLog([]); }}>Reset</Button>
      </View>

      <Text testID="form-log" className="text-xs text-slate-500">{log.join(' ')}</Text>

      <View className="rounded-lg bg-slate-900 p-3">
        <Text testID="form-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
      </View>

      <View className="flex-row items-start gap-3">
        <Text className={`w-24 ${labelClass}`}>Comments</Text>
        <TextInput
          testID="form-comments" className={`${field} h-auto`} multiline rows={COMMENTS_ROWS} placeholder="Comments"
          value={state.comments} onChange={(event: UIInputEvent) => patch({ comments: event.value })}
        />
      </View>
    </View>
  );
}
