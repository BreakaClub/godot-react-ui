import { useState, type ReactNode } from 'react';
import { Combobox, Select, Text, View } from 'godot-react-ui';

/** Everything the page's dropdowns hold, in one object: the readout is this object as JSON. */
interface DropdownState {
  select: string | null;
  combobox: string | null;
  chips: readonly string[];
}

const INITIAL_STATE: DropdownState = { select: null, combobox: null, chips: [] };

interface Choice {
  value: string;
  label: string;
}

/** More options than any window shows below a control, so every list is capped to the room it has and has to scroll. */
const OPTION_COUNT = 40;
const OPTIONS: readonly Choice[] = Array.from({ length: OPTION_COUNT }, (_, index) => ({
  value: `option-${index + 1}`, label: `Option ${index + 1}`,
}));

/** How much page there is below the dropdowns, so that the page scrolls and the lists hang from a page that has moved. */
const PAGE_TAIL_PX = 700;
/** Spaces in the JSON readout's indentation. */
const JSON_INDENT = 2;

/** The controls are 320 px wide, so that chips wrap after a few, and fill a narrower page. */
const CONTROL_WIDTH = 'w-full max-w-80';
const caption = 'text-sm text-slate-600';

function SelectDropdown(props: { value: string | null; onChange: (value: string) => void }): ReactNode {
  const { value, onChange } = props;
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger testID="dd-select" aria-label="Pick an option" className={CONTROL_WIDTH}>
        <Select.Value testID="dd-select-value" placeholder="Pick an option" />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content testID="dd-select-list">
        {OPTIONS.map(option => (
          <Select.Item key={option.value} value={option.value} testID={`dd-select-item-${option.value}`}>
            <Select.ItemText>{option.label}</Select.ItemText>
            <Select.ItemIndicator />
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

function ComboboxItems(props: { id: string }): ReactNode {
  return OPTIONS.map(option => (
    <Combobox.Item key={option.value} value={option.value} testID={`dd-${props.id}-item-${option.value}`}>
      <Combobox.ItemText>{option.label}</Combobox.ItemText>
      <Combobox.ItemIndicator />
    </Combobox.Item>
  ));
}

function SingleCombobox(props: { value: string | null; onChange: (value: string | null) => void }): ReactNode {
  const { value, onChange } = props;
  return (
    <Combobox.Root value={value} onValueChange={onChange}>
      <Combobox.Control testID="dd-combobox" className={CONTROL_WIDTH}>
        <Combobox.Input testID="dd-combobox-input" aria-label="Pick an option, or type" placeholder="Pick an option, or type" />
        <Combobox.Clear testID="dd-combobox-clear" />
        <Combobox.Trigger testID="dd-combobox-trigger" />
      </Combobox.Control>
      <Combobox.Content testID="dd-combobox-list">
        <ComboboxItems id="combobox" />
        <Combobox.Empty testID="dd-combobox-empty">No matches</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

function ChipsCombobox(props: { value: readonly string[]; onChange: (value: readonly string[]) => void }): ReactNode {
  const { value, onChange } = props;
  return (
    <Combobox.Root multiple value={value} onValueChange={onChange}>
      <Combobox.Control testID="dd-chips" className={CONTROL_WIDTH}>
        <Combobox.Chips
          testID="dd-chips-chips"
          renderChip={(chipValue, chipLabel) => (
            <Combobox.Chip key={chipValue} value={chipValue} testID={`dd-chips-chip-${chipValue}`}>
              {chipLabel}
              <Combobox.ChipRemove testID={`dd-chips-remove-${chipValue}`} />
            </Combobox.Chip>
          )}
        >
          <Combobox.Input testID="dd-chips-input" aria-label="Add options" placeholder="Add options" />
        </Combobox.Chips>
        <Combobox.Clear testID="dd-chips-clear" />
        <Combobox.Trigger testID="dd-chips-trigger" />
      </Combobox.Control>
      <Combobox.Content testID="dd-chips-list">
        <ComboboxItems id="chips" />
        <Combobox.Empty testID="dd-chips-empty">No matches</Combobox.Empty>
      </Combobox.Content>
    </Combobox.Root>
  );
}

/**
 * The dropdown lists of the kit under a finger (`docs/tracks/dropdown-touch.md`): a `Select`, a single `Combobox` and a `Combobox`
 * with chips, each with forty options, so each list is capped to the room it has and has to be panned. They sit in a page that
 * scrolls, so a list can be panned with the page at rest or already scrolled, and the page must stay where it is. The state of all
 * three is the JSON readout the verifiers parse.
 */
export function DropdownTouchLab(): ReactNode {
  const [state, setState] = useState<DropdownState>(INITIAL_STATE);
  const patch = (change: Partial<DropdownState>) => setState(current => ({ ...current, ...change }));

  return (
    <View testID="dropdown-touch-lab" className="w-full h-full bg-slate-50 relative">
      <View testID="dropdown-touch-page" className="absolute inset-0 overflow-y-auto">
        <View className="p-6 gap-3">
          <View className="gap-1">
            <Text testID="dd-title" className="text-2xl text-slate-900">Dropdown lists</Text>
            <Text className={caption}>Open a list and pan it with a finger: the list moves, the page behind it does not.</Text>
          </View>

          <SelectDropdown value={state.select} onChange={select => patch({ select })} />
          <SingleCombobox value={state.combobox} onChange={combobox => patch({ combobox })} />
          <ChipsCombobox value={state.chips} onChange={chips => patch({ chips })} />

          <View className="rounded-lg bg-slate-900 p-3">
            <Text testID="dd-json" className="text-xs text-emerald-300">{JSON.stringify(state, null, JSON_INDENT)}</Text>
          </View>

          <View testID="dd-page-tail" style={{ height: PAGE_TAIL_PX }} />
        </View>
      </View>
    </View>
  );
}
