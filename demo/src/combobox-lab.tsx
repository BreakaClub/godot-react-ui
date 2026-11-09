import { useState, type ReactNode } from 'react';
import { Button, Combobox, Text, View } from 'godot-react-ui';
import { LabIntro, useExpectedVisible } from './lab-parts';

/** Everything the page's comboboxes hold, in one object: the readout is this object as JSON. */
interface ComboboxState {
  fruit: string | null;
  tags: readonly string[];
  bottom: string | null;
}

const INITIAL_STATE: ComboboxState = { fruit: null, tags: ['apple', 'banana'], bottom: null };

interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
}

export const FRUITS: readonly Choice[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'date', label: 'Date' },
  { value: 'fig', label: 'Fig' },
  { value: 'grape', label: 'Grape' },
  { value: 'kiwi', label: 'Kiwi' },
  { value: 'lemon', label: 'Lemon' },
  { value: 'mango', label: 'Mango' },
  { value: 'orange', label: 'Orange' },
  { value: 'papaya', label: 'Papaya' },
];

/** Far more options than the room above the bottom combobox holds, so its list is capped and scrolls. */
const LONG_LIST_LENGTH = 60;
const LONG_LIST: readonly Choice[] = Array.from({ length: LONG_LIST_LENGTH }, (_, index) => ({
  value: `option-${index + 1}`, label: `Option ${index + 1}`,
}));

/** How much page there is below the comboboxes, so that the lab scrolls and a wheel over the page moves it. */
const PAGE_TAIL_PX = 700;
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;

/** The controls are 320 px wide, so that chips wrap after a few, and fill a narrower page. */
const CONTROL_WIDTH = 'w-full max-w-80';
/** The single combobox shares its row with the Next button: it takes what the button leaves, up to the same 320 px. */
const ROW_CONTROL_WIDTH = 'min-w-0 max-w-80 flex-1';

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';

function Items(props: { choices: readonly Choice[]; id: string }): ReactNode {
  const { choices, id } = props;
  return choices.map(choice => (
    <Combobox.Item key={choice.value} value={choice.value} disabled={choice.disabled} testID={`cb-${id}-item-${choice.value}`}>
      <Combobox.ItemText>{choice.label}</Combobox.ItemText>
      <Combobox.ItemIndicator />
    </Combobox.Item>
  ));
}

function SingleCombobox(props: {
  id: string; label: string; value: string | null; choices: readonly Choice[]; onChange: (value: string | null) => void; className?: string;
}): ReactNode {
  const { id, label, value, choices, onChange, className } = props;
  return (
    <Combobox.Root value={value} onValueChange={onChange}>
      <Combobox.Control testID={`cb-${id}`} className={className}>
        <Combobox.Input testID={`cb-${id}-input`} aria-label={label} placeholder={label} />
        <Combobox.Clear testID={`cb-${id}-clear`} />
        <Combobox.Trigger testID={`cb-${id}-trigger`} />
      </Combobox.Control>
      <Combobox.Content testID={`cb-${id}-list`}>
        <Items choices={choices} id={id} />
        <Combobox.Empty testID={`cb-${id}-empty`}>No matches</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

function TagsCombobox(props: {
  id: string; label: string; value?: readonly string[]; onChange?: (value: readonly string[]) => void; disabled?: boolean;
  defaultValue?: readonly string[]; className?: string;
}): ReactNode {
  const { id, label, value, onChange, disabled, defaultValue, className } = props;
  return (
    <Combobox.Root multiple allowCustomValue disabled={disabled} value={value} defaultValue={defaultValue} onValueChange={onChange}>
      <Combobox.Control testID={`cb-${id}`} className={className}>
        <Combobox.Chips
          testID={`cb-${id}-chips`}
          renderChip={(chipValue, chipLabel) => (
            <Combobox.Chip key={chipValue} value={chipValue} testID={`cb-${id}-chip-${chipValue}`}>
              {chipLabel}
              <Combobox.ChipRemove testID={`cb-${id}-remove-${chipValue}`} />
            </Combobox.Chip>
          )}
        >
          <Combobox.Input testID={`cb-${id}-input`} aria-label={label} placeholder={label} />
        </Combobox.Chips>
        <Combobox.Clear testID={`cb-${id}-clear`} />
        <Combobox.Trigger testID={`cb-${id}-trigger`} />
      </Combobox.Control>
      <Combobox.Content testID={`cb-${id}-list`}>
        <Items choices={FRUITS} id={id} />
        <Combobox.Empty testID={`cb-${id}-empty`}>No matches</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

/**
 * The combobox kit part: a single combobox beside a button the list does not cover, a multiple one whose chips wrap, a disabled
 * one, and one fixed to the bottom of the window with a long list, so that it opens upwards and has to scroll. The page itself
 * scrolls, so a wheel over it moves the page the lists hang from. The state of all of them is the JSON readout the verifier parses.
 */
/**
 * What a control does and what to try, under the control: the name, the caption, and what to expect when Show Expected is on. Captions go under
 * their controls, not over them, so that the controls stay near the top of the page: the combobox verifier works the page in windows as short as
 * 400 logical pixels (1120 x 800 at a pixel ratio of two) without scrolling it, and the box pinned at the bottom must not cover the chips control.
 */
function Caption({ title, children, expected }: { title: string; children: string; expected?: string }) {
  const showExpected = useExpectedVisible();
  return (
    <Text className="text-xs text-slate-600">
      <Text className="text-slate-900">{`${title}. `}</Text>
      {children}
      {expected !== undefined && showExpected ? <Text className="text-indigo-700">{` Expected: ${expected}`}</Text> : null}
    </Text>
  );
}

export function ComboboxLab(): ReactNode {
  const [state, setState] = useState<ComboboxState>(INITIAL_STATE);
  const [nextClicks, setNextClicks] = useState(0);
  const patch = (change: Partial<ComboboxState>) => setState(current => ({ ...current, ...change }));

  return (
    <View testID="combobox-lab" className="w-full h-full bg-slate-50 relative">
      <View testID="combobox-page" className="absolute inset-0 overflow-y-auto">
        <View className="p-6 gap-3">
          {/* The verifier presses and wheels on this, as bare page: no list opens over it except the bottom one, which it closes first. */}
          <LabIntro
            testID="cb-title"
            title="Editable comboboxes"
            paragraphs={[
              'The kit\'s Combobox, single and multiple (the WAI-ARIA editable combobox): a text input whose list filters as you type, drawn in the overlay layer while the focus stays in the input.',
            ]}
          />

          <View className="gap-1.5">
            <View className="flex-row items-start gap-3">
              <SingleCombobox
                id="fruit" label="Pick a fruit" value={state.fruit} choices={FRUITS} onChange={fruit => patch({ fruit })} className={ROW_CONTROL_WIDTH}
              />
              <Button testID="cb-next" className={labButton} onClick={() => setNextClicks(count => count + 1)}>{`Next ${nextClicks}`}</Button>
            </View>
            <Caption title="Single combobox" expected="Next, pressed with the list open, closes it and counts too.">
              Type to filter the list; arrows move, Enter chooses, Escape closes.
            </Caption>
          </View>

          <View className="gap-1.5">
            <TagsCombobox id="tags" label="Add a fruit" value={state.tags} onChange={tags => patch({ tags })} className={CONTROL_WIDTH} />
            <Caption title="Chips (multiple)" expected="as chips are added the box wraps onto more lines and its list follows it.">
              Choosing an option adds a chip and keeps the list open. Enter or a comma adds your own text. Backspace twice removes the last chip.
            </Caption>
          </View>

          <View className="gap-1.5">
            <TagsCombobox id="locked" label="Locked" disabled defaultValue={['fig', 'grape']} className={CONTROL_WIDTH} />
            <Caption title="Disabled">
              Locked keeps its chips but takes no focus, opens no list and has no remove buttons.
            </Caption>
          </View>

          <View className="gap-1.5">
            <Caption title="Values">What the comboboxes hold, as one JSON object.</Caption>
            <View className="rounded-lg bg-slate-900 p-3">
              <Text testID="cb-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
            </View>
          </View>

          <View testID="cb-page-tail" style={{ height: PAGE_TAIL_PX }} />
        </View>
      </View>
      <View className="absolute bottom-6 left-6 right-6 max-w-80 gap-1">
        <Caption title="At the bottom of the window">Sixty options: the list opens above the box and scrolls.</Caption>
        <SingleCombobox
          id="bottom" label="Pick an option" value={state.bottom} choices={LONG_LIST} onChange={bottom => patch({ bottom })} className={CONTROL_WIDTH}
        />
      </View>
    </View>
  );
}
