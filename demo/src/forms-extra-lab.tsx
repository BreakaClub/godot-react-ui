import { useRef, useState, type ReactNode } from 'react';
import {
  Text, TextField, TextInput, View, type TextInputHandle, type UIBeforeInputEvent, type UICompositionEvent, type UIInputEvent,
  type UIKeyboardEvent,
} from 'godot-react-ui';
import { LabIntro, Readout } from './lab-parts';
import { CaseRow, ReadoutHeading, Results } from './text-lab-parts';

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
/** The picky field makes itself read-only when a composition reaches this text (`compositionupdate`). */
export const PICKY_LOCKS_AT = 'lock';
/** The picky field moves the focus to the resize field when a composition ends in this (`compositionupdate`). */
export const PICKY_LEAVES_AT = '!';
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;

const field = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 caret-indigo-600 focus:border-indigo-500';
const labelClass = 'text-sm text-slate-700';

const INTRO = [
  'Each field is the smallest page that shows a defect the text input review found and fixed; the verifier drives them as a standing check.',
  'Each caption says what a pass looks like. Two cases need a desktop keyboard or an input method editor (Japanese, Chinese or Korean input).',
];

interface FieldRowProps {
  label: string;
  caption: string | readonly string[];
  result?: ReactNode;
  children: ReactNode;
}

/** A labelled field with its caption under it, and the results the field counts. */
function FieldRow({ label, caption, result, children }: FieldRowProps) {
  return (
    <CaseRow caption={caption} result={result} placement="below">
      <View className="flex-row items-center gap-3">
        <Text className={`w-24 ${labelClass}`}>{label}</Text>
        {children}
      </View>
    </CaseRow>
  );
}

const CHAT_CAPTION = 'Type a message and press Enter (Enter on a phone keyboard): the field clears and Messages sent goes up. '
  + 'Pass: the next text you type starts empty. The bug was the soft keyboard bringing the sent message back.';
const DIGITS_CAPTION = 'Only digits are accepted: React ignores any edit whose text is not all digits and the field puts back what it had. '
  + 'Pass: type 12, then a letter, and the field still reads 12; then type 3 and it reads 123. The bug was the refused letter coming back with the next key.';
const PICKY_CAPTION = [
  `Refuses an insertion that starts with "${PICKY_REFUSES}" and counts it. A keyboard inserts one letter at a time, so typing ${PICKY_REFUSES} does not trip it; an input method committing "${PICKY_REFUSES}!" does.`,
  `Needs a desktop input method editor: compose text that ends in "${PICKY_LEAVES_AT}" and the focus moves to Resize. Pass: the unfinished text lands in Picky, not in Resize.`,
  `Compose "${PICKY_LOCKS_AT}" and Picky turns read-only. Pass: the composition ends, its unfinished text is dropped and Picky takes no more.`,
];
const RESIZE_CAPTION = 'Needs a keyboard with an F6 key (a laptop may want Fn). Click the field, type a few words, then press F6: the field narrows and widens. '
  + 'Pass: the caret stays inside the box and in view, in the narrow box as well as the wide one.';
const KIT_CAPTION = 'The kit TextField: its label focuses the field and selectTextOnFocus selects the text. Click or tap the label "Pick me": the field takes focus with all its text selected. '
  + 'Pass: a press inside the text then places the caret where you pressed. The bug was that press being ignored.';

/**
 * The fields that a review found misbehaving, each one the smallest
 * page that shows it. Chat is cleared by its submit, the way a message box is, and digits refuses any edit that is not a
 * number, so a soft keyboard (which holds the whole text itself) shows whether native tells it when the text changed
 * under it. Picky refuses some insertions in `beforeinput` and makes itself read-only at a composition of its own, to see what happens to a
 * composition that is committed on blur, and to one that is under way when the input stops taking text. Resize changes
 * its width with F6 while it has the focus, to see where its caret goes. The kit field is the one whose label focuses it
 * and which selects its text when it is focused.
 */
export function FormsExtraLab() {
  const [state, setState] = useState<ExtraState>(INITIAL_STATE);
  const resize = useRef<TextInputHandle | null>(null);
  const patch = (change: Partial<ExtraState>) => setState(current => ({ ...current, ...change }));
  const narrowOnF6 = (event: UIKeyboardEvent) => {
    if (event.key === 'F6') setState(current => ({ ...current, narrow: !current.narrow }));
  };

  return (
    <View testID="forms-extra-lab" className="w-full h-full bg-slate-50 p-4 gap-2 overflow-y-auto">
      <LabIntro title="Defects the review found" paragraphs={INTRO} />

      <FieldRow label="Chat" caption={CHAT_CAPTION} result={<Readout label="Messages sent" value={String(state.sent)} />}>
        <TextInput
          testID="extra-chat" className={`w-64 ${field}`} placeholder="Cleared by Enter" value={state.chat}
          onChange={(event: UIInputEvent) => patch({ chat: event.value })}
          onSubmit={() => setState(current => ({ ...current, chat: '', sent: current.sent + 1 }))}
        />
      </FieldRow>

      <FieldRow label="Digits" caption={DIGITS_CAPTION}>
        <TextInput
          testID="extra-digits" className={`w-64 ${field}`} placeholder="Numbers only" value={state.digits}
          onChange={(event: UIInputEvent) => { if (/^[0-9]*$/.test(event.value)) patch({ digits: event.value }); }}
        />
      </FieldRow>

      <FieldRow
        label="Picky" caption={PICKY_CAPTION}
        result={(
          <Results>
            <Readout label="Insertions refused" value={String(state.refused)} />
            <Readout label="Read-only" value={state.locked ? 'yes' : 'no'} />
          </Results>
        )}
      >
        <TextInput
          testID="extra-picky" className={`w-64 ${field}`} placeholder="Refuses no..." value={state.picky}
          readOnly={state.locked}
          onCompositionUpdate={(event: UICompositionEvent) => {
            if (event.data === PICKY_LOCKS_AT) patch({ locked: true });
            else if (event.data.endsWith(PICKY_LEAVES_AT)) resize.current?.focus();
          }}
          onBeforeInput={(event: UIBeforeInputEvent) => {
            if (event.inputType !== 'insertText' || !event.data?.startsWith(PICKY_REFUSES)) return;
            event.preventDefault();
            setState(current => ({ ...current, refused: current.refused + 1 }));
          }}
          onChange={(event: UIInputEvent) => patch({ picky: event.value })}
        />
      </FieldRow>

      <FieldRow label="Resize" caption={RESIZE_CAPTION} result={<Readout label="The field is" value={state.narrow ? 'narrow' : 'wide'} />}>
        <TextInput
          testID="extra-resize" ref={resize} className={`${state.narrow ? 'w-24' : 'w-64'} ${field}`} placeholder="F6 narrows"
          onKeyDown={narrowOnF6}
        />
      </FieldRow>

      <CaseRow caption={KIT_CAPTION} placement="below">
        <TextField
          testID="extra-kit" label="Pick me" selectTextOnFocus defaultValue="Selected when focused"
          helperText="The label focuses the field."
        />
      </CaseRow>

      <ReadoutHeading>React state the fields write to</ReadoutHeading>
      <View className="rounded-lg bg-slate-900 p-3">
        <Text testID="extra-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
      </View>
    </View>
  );
}
