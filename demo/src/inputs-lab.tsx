import { useState } from 'react';
import { Button, Checkbox, RadioGroup, Select, Slider, Switch, Text, TextField, View, type UIInputEvent } from 'godot-react-ui';

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

const labButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 text-sm hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500';
const label = 'text-sm text-slate-700';

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
 * Phase I8: the input kit (Checkbox, Switch, RadioGroup, Slider, Select, TextField) bound to one state object, whose JSON is the
 * readout the verifier parses. Locked copies show the `disabled` look; Reverse reorders the radio items, which the
 * group must follow; the first select sits mid-page and the second at the bottom, where its list has to flip. The third has
 * forty items, more than fit under it: its list is capped to the room and scrolls.
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
    <View testID="inputs-lab" className="w-full h-full bg-slate-50 p-6 gap-3">
      <View className="gap-1">
        <Text className="text-2xl text-slate-900">Inputs</Text>
        <Text className="text-sm text-slate-500">Checkbox, Switch, RadioGroup, Slider, Select and TextField, bound to one state object.</Text>
      </View>

      <View className="flex-row gap-6">
        <Checkbox testID="inputs-checkbox" className={label} checked={state.subscribe} onCheckedChange={subscribe => patch({ subscribe })}>
          Subscribe
        </Checkbox>
        <Checkbox testID="inputs-checkbox-locked" className={label} checked disabled>Locked on</Checkbox>
      </View>

      <View className="flex-row gap-6">
        <Switch testID="inputs-switch" className={label} checked={state.notifications} onCheckedChange={notifications => patch({ notifications })}>
          Notifications
        </Switch>
        <Switch testID="inputs-switch-locked" className={label} checked disabled>Locked on</Switch>
      </View>

      <View className="flex-row items-center gap-4">
        <RadioGroup.Root testID="inputs-radio" orientation="horizontal" value={state.size} onValueChange={size => patch({ size })}>
          {sizes.map(size => (
            <RadioGroup.Item key={size.value} testID={`inputs-radio-${size.value}`} className={label} value={size.value} disabled={size.disabled}>
              {size.label}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        <Button testID="inputs-radio-reverse" className={labButton} onClick={() => setReversed(value => !value)}>Reverse</Button>
      </View>

      <View className="flex-row items-center gap-3">
        <Slider.Root testID="inputs-slider" className="w-64" value={state.volume} onValueChange={volume => patch({ volume })}>
          <Slider.Track testID="inputs-slider-track">
            <Slider.Range testID="inputs-slider-range" />
            <Slider.Thumb testID="inputs-slider-thumb" aria-label="Volume" />
          </Slider.Track>
        </Slider.Root>
        <Text className="text-sm text-slate-700">{state.volume}</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <ChoiceSelect id="fruit" value={state.fruit} placeholder="Pick a fruit" choices={FRUITS} onChange={fruit => patch({ fruit })} />
        <Button testID="inputs-next" className={labButton} onClick={() => setNextClicks(value => value + 1)}>{`Next ${nextClicks}`}</Button>
        <ChoiceSelect id="long" value={option} placeholder="Pick an option" choices={LONG_LIST} onChange={setOption} />
      </View>

      <TextField
        testID="inputs-nickname" className="w-64" label="Nickname" helperText={`At least ${NICKNAME_MIN_LENGTH} characters`}
        errorText={state.nickname.length > 0 && state.nickname.length < NICKNAME_MIN_LENGTH ? 'Too short' : undefined}
        value={state.nickname} onChange={(event: UIInputEvent) => patch({ nickname: event.value })}
      />

      <View className="rounded-lg bg-slate-900 p-3">
        <Text testID="inputs-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
      </View>

      <View className="flex-1" />

      <View className="flex-row">
        <ChoiceSelect id="shipping" value={state.shipping} placeholder="Shipping" choices={SHIPPING} onChange={shipping => patch({ shipping })} />
      </View>
    </View>
  );
}
