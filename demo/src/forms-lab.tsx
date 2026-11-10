import { useState, type ReactNode } from 'react';
import { Button, Text, TextInput, View, type UICompositionEvent, type UIInputEvent } from 'godot-react-ui';
import { LabIntro, Readout } from './lab-parts';
import { CaseRow, ReadoutHeading, Results } from './text-lab-parts';

/** Everything the page's fields edit, in one object: the readout is this object as JSON. */
interface FormState {
  name: string;
  password: string;
  code: string;
  shout: string;
  notes: string;
  comments: string;
  submitted: number;
  /** `click`s the name field received: a tap on it must be one, whatever the soft keyboard does to the window's focus. */
  nameClicks: number;
}

const INITIAL_STATE: FormState = { name: '', password: '', code: '', shout: '', notes: '', comments: '', submitted: 0, nameClicks: 0 };

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

const INTRO = [
  'TextInput is the library\'s editable field. It does caret, selection, undo, clipboard and input methods itself and sends the events an HTML input does.',
  'Each row is one behaviour of a browser\'s input or textarea; the JSON is the React state the fields write to. On a phone a tap raises the soft keyboard.',
];

interface FieldRowProps {
  label: string;
  caption: string;
  /** A multi-line field is taller than its label: the label stays at its top. */
  tall?: boolean;
  result?: ReactNode;
  children: ReactNode;
}

/** A labelled field with its caption beside it (under it on a phone) and the results of the field. */
function FieldRow({ label, caption, tall = false, result, children }: FieldRowProps) {
  return (
    <CaseRow caption={caption} result={result}>
      <View className={`flex-row ${tall ? 'items-start' : 'items-center'} gap-3`}>
        <Text className={`w-24 ${labelClass}`}>{label}</Text>
        {children}
      </View>
    </CaseRow>
  );
}

/**
 * The text fields, bound to one state object whose JSON is the readout the verifier parses. Name is
 * controlled and stores what is typed; password is secure; code stops at six characters; shout is controlled and stores
 * the text in capitals, so native has to be told; the read-only field can be focused and copied from; notes is a text
 * area; free is uncontrolled. Enter in a single-line field counts a submit. The page scrolls, and a comments area below
 * the readout is reached by scrolling: a wheel over notes scrolls the text first and the page after it.
 *
 * Each field has a caption beside it, or under it where the window is narrow. The verifier drives the fields at
 * their places in a 600 x 900 and a 1120 x 800 window, so what the page adds above the notes area is kept short: the captions are one line
 * each, and the intro is two paragraphs.
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
      <LabIntro title="Fields bound to React state" paragraphs={INTRO} />

      <FieldRow
        label="Name" caption="Controlled: React keeps the text and passes it back as value. Enter counts a submit."
        result={(
          <Results>
            <Readout label="Clicks on the field" value={String(state.nameClicks)} />
            <Readout label="Submits" value={String(state.submitted)} />
          </Results>
        )}
      >
        <TextInput
          testID="form-name" className={field} placeholder="Your name" value={state.name} onSubmit={submit}
          onClick={() => setState(current => ({ ...current, nameClicks: current.nameClicks + 1 }))}
          onChange={(event: UIInputEvent) => { patch({ name: event.value }); note(`input:${event.inputType}`); }}
          onCompositionStart={() => note('compositionstart')}
          onCompositionUpdate={(event: UICompositionEvent) => note(`compositionupdate:${event.data}`)}
          onCompositionEnd={() => note('compositionend')}
        />
      </FieldRow>

      <FieldRow label="Password" caption="secure: bullets are drawn, React holds the real text, and copy and cut are off.">
        <TextInput
          testID="form-password" className={field} placeholder="Password" secure value={state.password}
          onChange={(event: UIInputEvent) => patch({ password: event.value })}
        />
      </FieldRow>

      <FieldRow label="Code" caption="maxLength 6, counted in UTF-16 units: an emoji takes two. A longer paste is cut to fit.">
        <TextInput
          testID="form-code" className={field} placeholder="At most six" maxLength={CODE_MAX_LENGTH} value={state.code}
          onChange={(event: UIInputEvent) => patch({ code: event.value })}
        />
      </FieldRow>

      <FieldRow label="Shout" caption="Controlled with a transform: React stores capitals, so lower case typed comes out upper case.">
        <TextInput
          testID="form-shout" className={field} placeholder="Always capitals" value={state.shout}
          onChange={(event: UIInputEvent) => patch({ shout: event.value.toUpperCase() })}
        />
      </FieldRow>

      <FieldRow label="Read-only" caption="readOnly: you can focus, select and copy, but typing, cut and paste change nothing.">
        <TextInput testID="form-readonly" className={field} readOnly defaultValue="Copy me, you cannot edit me" />
      </FieldRow>

      <FieldRow label="Select all" caption="selectTextOnFocus: a press selects all the text; a second press places the caret.">
        <TextInput testID="form-select" className={field} selectTextOnFocus defaultValue="Selected when focused" />
      </FieldRow>

      <FieldRow
        label="Free" caption="Uncontrolled: no value prop, the field keeps its own text. React only counts what was typed."
        result={<Readout label="Typed so far" value={`${free.length} characters`} testID="form-free-echo" />}
      >
        <TextInput
          testID="form-free" className={field} placeholder="Uncontrolled"
          onChange={(event: UIInputEvent) => setFree(event.value)}
        />
      </FieldRow>

      <FieldRow label="Notes" tall caption="multiline, 3 rows: Enter makes a line break, long lines wrap, and the wheel scrolls the text, then the page.">
        <TextInput
          testID="form-notes" className={`${field} h-auto`} multiline rows={NOTES_ROWS} placeholder="Notes" value={state.notes}
          onChange={(event: UIInputEvent) => patch({ notes: event.value })}
        />
      </FieldRow>

      <CaseRow caption="Reset clears every field, the counters and the event list.">
        <Button testID="form-reset" className={labButton} onClick={() => { setState(INITIAL_STATE); setFree(''); setLog([]); }}>Reset</Button>
      </CaseRow>

      <Readout label={log.length === 0 ? 'Name field events: none yet' : 'Name field events, latest last:'} value={log.join(' ')} testID="form-log" />

      <ReadoutHeading>React state the fields write to</ReadoutHeading>
      <View className="rounded-lg bg-slate-900 p-3">
        <Text testID="form-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
      </View>

      <FieldRow
        label="Comments" tall caption="The same multi-line field, below the JSON, so the page has to scroll to reach it."
      >
        <TextInput
          testID="form-comments" className={`${field} h-auto`} multiline rows={COMMENTS_ROWS} placeholder="Comments"
          value={state.comments} onChange={(event: UIInputEvent) => patch({ comments: event.value })}
        />
      </FieldRow>
    </View>
  );
}
