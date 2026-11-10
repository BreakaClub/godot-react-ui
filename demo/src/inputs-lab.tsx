import { useState } from 'react';
import { Button, Checkbox, RadioGroup, Select, Slider, Switch, Text, TextField, View, type UIInputEvent } from 'godot-react-ui';
import { LabIntro } from './lab-parts';

/** Everything the page's controls edit, in one object: the readout is this object as JSON. */
interface InputsState {
  subscribe: boolean;
  notifications: boolean;
  size: string | null;
  volume: number;
  fruit: string | null;
  shipping: string | null;
  nickname: string;
}

const INITIAL_STATE: InputsState = {
  subscribe: false, notifications: false, size: 'medium', volume: 40, fruit: null, shipping: null, nickname: '',
};

/** The nickname is valid from this many characters; fewer, once something is typed, is an error. */
const NICKNAME_MIN_LENGTH = 3;

interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
}

const SIZES: readonly Choice[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'huge', label: 'Huge', disabled: true },
];

const FRUITS: readonly Choice[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'date', label: 'Date' },
];

/** Far more items than the room under the select holds, so its list has to scroll. */
const LONG_LIST_LENGTH = 40;
const LONG_LIST: readonly Choice[] = Array.from({ length: LONG_LIST_LENGTH }, (_, index) => ({
  value: `option-${index + 1}`, label: `Option ${index + 1}`,
}));

const SHIPPING: readonly Choice[] = [
  { value: 'post', label: 'Post' },
  { value: 'courier', label: 'Courier' },
  { value: 'pickup', label: 'Pickup' },
];

/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;
/**
 * The page ends this far above the bottom of the window, so the last of it can be scrolled clear of the card the shipping select is pinned
 * in: the card's own height (its note and the select), its distance from the window's edge, and a gap.
 */
const PINNED_CLEARANCE_PX = 140;

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
const label = 'text-sm text-slate-700';

/**
 * What a group of controls shows and what to try, as one paragraph over them: its name, then the caption. No card around it, because the
 * Controls verifier's windows (1120 x 800 and 600 x 900) must still hold every control it presses above the pinned select.
 */
function Note({ title, children }: { title: string; children: string }) {
  return (
    <Text className="text-xs text-slate-600">
      <Text className="text-slate-900">{`${title}. `}</Text>
      {children}
    </Text>
  );
}

function ChoiceSelect(props: {
  id: string; value: string | null; placeholder: string; choices: readonly Choice[]; onChange: (value: string) => void;
}) {
  const { id, value, placeholder, choices, onChange } = props;
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger testID={`inputs-${id}`} aria-label={placeholder} className="w-48">
        <Select.Value testID={`inputs-${id}-value`} placeholder={placeholder} />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content testID={`inputs-${id}-list`}>
        {choices.map(choice => (
          <Select.Item key={choice.value} value={choice.value} disabled={choice.disabled} testID={`inputs-${id}-item-${choice.value}`}>
            <Select.ItemText>{choice.label}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

/**
 * The input kit (Checkbox, Switch, RadioGroup, Slider, Select, TextField) bound to one state object, whose JSON is the
 * readout the verifier parses. Locked copies show the `disabled` look; Reverse reorders the radio items, which the
 * group must follow; the selects head the second column (beside the first in a wide window, under it in a narrow one) and one more is pinned at
 * the bottom of the window, where its list has to flip. The one with forty items has more than fit under it: its list is capped to the room and
 * scrolls. The order of the groups is the tab order the verifier holds the page to.
 *
 * The page is a scroll container of its own with the last select pinned over its bottom edge, so that a window too short for the
 * page (a phone) scrolls it and the select stays where there is no room below it.
 */
export function InputsLab() {
  const [state, setState] = useState<InputsState>(INITIAL_STATE);
  const [reversed, setReversed] = useState(false);
  const [nextClicks, setNextClicks] = useState(0);
  // Its own state: the readout is the lab's, and a long list adds nothing to what it proves.
  const [option, setOption] = useState<string | null>(null);
  const patch = (change: Partial<InputsState>) => setState(current => ({ ...current, ...change }));
  const sizes = reversed ? [...SIZES].reverse() : SIZES;

  return (
    <View testID="inputs-lab" className="relative w-full h-full bg-slate-50">
      <View testID="inputs-page" className="absolute inset-0 overflow-y-auto">
        <View className="gap-3 p-6" style={{ paddingBottom: PINNED_CLEARANCE_PX }}>
          <LabIntro
            title="The input kit"
            paragraphs={[
              'The kit\'s form controls, each bound to the one state object shown as JSON: Checkbox, Switch, RadioGroup, Slider, Select and TextField.',
              'They are React components built from the library\'s own parts, with the keyboard behaviour of their HTML counterparts: Space toggles a checkbox, arrows move a radio group or a slider, and a select\'s list opens over the page.',
            ]}
          />

          <View className="flex-row flex-wrap items-start gap-x-6 gap-y-3">
            <View className="min-w-[320px] flex-1 gap-3">
              <View className="gap-1.5">
                <Note title="Checkbox">
                  Click it or press Space to toggle it; Enter does not. Locked on is disabled: it is dimmed and ignores presses.
                </Note>
                <View className="flex-row flex-wrap gap-x-6 gap-y-2">
                  <Checkbox testID="inputs-checkbox" className={label} checked={state.subscribe} onCheckedChange={subscribe => patch({ subscribe })}>
                    Subscribe
                  </Checkbox>
                  <Checkbox testID="inputs-checkbox-locked" className={label} checked disabled>Locked on</Checkbox>
                </View>
              </View>

              <View className="gap-1.5">
                <Note title="Switch">
                  Click, Space or Enter flips it and the thumb slides across. Locked on is disabled as well.
                </Note>
                <View className="flex-row flex-wrap gap-x-6 gap-y-2">
                  <Switch testID="inputs-switch" className={label} checked={state.notifications} onCheckedChange={notifications => patch({ notifications })}>
                    Notifications
                  </Switch>
                  <Switch testID="inputs-switch-locked" className={label} checked disabled>Locked on</Switch>
                </View>
              </View>

              <View className="gap-1.5">
                <Note title="Radio group">
                  One item is the Tab stop. The arrow keys move and select, wrap round and skip Huge, which is disabled. Reverse reorders the items and the group follows.
                </Note>
                <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
                  <RadioGroup.Root testID="inputs-radio" orientation="horizontal" className="flex-wrap gap-y-2" value={state.size} onValueChange={size => patch({ size })}>
                    {sizes.map(size => (
                      <RadioGroup.Item key={size.value} testID={`inputs-radio-${size.value}`} className={label} value={size.value} disabled={size.disabled}>
                        {size.label}
                      </RadioGroup.Item>
                    ))}
                  </RadioGroup.Root>
                  <Button testID="inputs-radio-reverse" className={labButton} onClick={() => setReversed(value => !value)}>Reverse</Button>
                </View>
              </View>

              <View className="gap-1.5">
                <Note title="Slider">
                  Drag the thumb, which sticks out of the track, click the track to jump, or use the arrow, Page Up, Home and End keys.
                </Note>
                <View className="flex-row items-center gap-3">
                  <Slider.Root testID="inputs-slider" className="min-w-0 max-w-64 flex-1" value={state.volume} onValueChange={volume => patch({ volume })}>
                    <Slider.Track testID="inputs-slider-track">
                      <Slider.Range testID="inputs-slider-range" />
                      <Slider.Thumb testID="inputs-slider-thumb" aria-label="Volume" />
                    </Slider.Track>
                  </Slider.Root>
                  <Text className="text-sm text-slate-700">{state.volume}</Text>
                </View>
              </View>
            </View>

            <View className="min-w-[260px] flex-1 gap-3">
              <View className="gap-1.5">
                <Note title="Selects">
                  Pick a fruit has a disabled item. Pick an option has forty, so its list is capped to the room under it and scrolls with the wheel, the keys or its scrollbar. Press Next with a list open: the press only closes the list.
                </Note>
                <View className="flex-row flex-wrap items-center gap-3">
                  <ChoiceSelect id="fruit" value={state.fruit} placeholder="Pick a fruit" choices={FRUITS} onChange={fruit => patch({ fruit })} />
                  <Button testID="inputs-next" className={labButton} onClick={() => setNextClicks(value => value + 1)}>{`Next ${nextClicks}`}</Button>
                  <ChoiceSelect id="long" value={option} placeholder="Pick an option" choices={LONG_LIST} onChange={setOption} />
                </View>
              </View>

              <View className="gap-1.5">
                <Note title="Text field">
                  {`Pressing the label focuses the field. The helper text gives way to an error once something is typed and it is still under ${NICKNAME_MIN_LENGTH} characters.`}
                </Note>
                <TextField
                  testID="inputs-nickname" className="w-full max-w-64" label="Nickname" helperText={`At least ${NICKNAME_MIN_LENGTH} characters`}
                  errorText={state.nickname.length > 0 && state.nickname.length < NICKNAME_MIN_LENGTH ? 'Too short' : undefined}
                  value={state.nickname} onChange={(event: UIInputEvent) => patch({ nickname: event.value })}
                />
              </View>

              <View className="gap-1.5">
                <Note title="State, as JSON">Every control on this page edits this one object.</Note>
                <View className="rounded-lg bg-slate-900 p-3">
                  <Text testID="inputs-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="absolute bottom-6 left-6 right-6 max-w-80 gap-1.5 rounded-xl border border-slate-200 bg-white p-3">
        <Note title="A select with no room below">
          Pinned to the bottom of the window, so its list opens above it.
        </Note>
        <View className="flex-row">
          <ChoiceSelect id="shipping" value={state.shipping} placeholder="Shipping" choices={SHIPPING} onChange={shipping => patch({ shipping })} />
        </View>
      </View>
    </View>
  );
}
