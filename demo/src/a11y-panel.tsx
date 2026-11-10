import { useState, type ReactNode } from 'react';
import { Button, Checkbox, Combobox, RadioGroup, ScrollView, Slider, Switch, Text, TextInput, View } from 'godot-react-ui';
import { LabCase, LabIntro, LabLimit, Readout } from './lab-parts';

/** The slider's start. The verifier presses the arrow key and reads the value an assistive technology sees. */
export const A11Y_SLIDER_START = 30;
export const A11Y_SLIDER_MIN = 0;
export const A11Y_SLIDER_MAX = 100;
export const A11Y_SIZES = ['Small', 'Medium', 'Large'] as const;
export const A11Y_INITIAL_SIZE = 'medium';
/** The scroll view's rows: more than its height shows, so it has something to scroll. */
export const A11Y_MESSAGE_COUNT = 12;
/** The text fields' starting text: the verifier selects and replaces parts of it, as an assistive technology would. */
export const A11Y_NAME_START = 'Ada';
export const A11Y_NOTES_START = 'first\nsecond';
export const A11Y_READONLY_TEXT = 'Fixed';
/** A text area whose five lines overflow its two rows: it scrolls, so it has a vertical scroll bar. */
export const A11Y_LOG_START = 'one\ntwo\nthree\nfour\nfive';
/**
 * The combobox of the lab: two chips, a list that is open from the start with the first option active, and the options.
 * (`autoHighlight` makes the first enabled option active when the list opens, so no key is needed for the tree to show one.)
 */
export const A11Y_FRUITS = ['Apple', 'Banana', 'Cherry', 'Date'] as const;
export const A11Y_FRUITS_CHOSEN = ['apple', 'banana'] as const;
/** The gallery's rows: more than its height shows, in a column wider than the view, so it scrolls on both axes. */
export const A11Y_PHOTO_COUNT = 6;
/**
 * The room the open option list needs under the combobox's field in the captioned page: the list is drawn in the overlay layer, over
 * whatever follows the field, so the page keeps this much space free while the list is open (four options and the list's padding).
 */
const FRUIT_LIST_ROOM = 'h-[152px]';
/** The widest a control is drawn: the lab's controls were a fixed 320 px, and are now as wide as the window leaves them, up to this. */
const CONTROL_WIDTH = 'w-full max-w-[320px]';

const heading = 'text-xl text-slate-900';
const caption = 'text-sm text-slate-500';
const button = 'self-start rounded-lg border border-slate-300 px-4 py-2 bg-white text-slate-700 focus:border-indigo-500';
/** The hidden case's button: filled, so that it reads as a button and not as a text field showing the word Secret. */
const primaryButton = 'self-start rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500';
const sizeItem = 'rounded-lg border border-slate-300 px-3 py-1 bg-white';
const scroller = `h-24 ${CONTROL_WIDTH} rounded-lg border border-slate-300 bg-white`;
const gallery = `h-[72px] ${CONTROL_WIDTH} overflow-x-auto rounded-lg border border-slate-300 bg-white`;
const field = `${CONTROL_WIDTH} rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-500`;

interface CaseProps {
  /** Whether the page is captioned: without it the controls are the page's own children, laid out as they always were. */
  explained: boolean;
  title: string;
  caption: string;
  expected?: string;
  children: ReactNode;
}

/** One case of the captioned page: a card with its caption round the controls. Uncaptioned (the verifier's page) it is only the controls. */
function Case({ explained, title, caption: text, expected, children }: CaseProps) {
  if (!explained) return <>{children}</>;
  return <LabCase title={title} caption={text} expected={expected} className="w-full">{children}</LabCase>;
}

export interface A11yPanelProps {
  /**
   * Caption every control with what an assistive technology is told about it. The default, and what the navigator shows. The
   * native verifier (`a11y-main.ts`) mounts the controls bare (`false`): its window is a fixed size with no scroll, and the
   * platform tree it reads would otherwise hold the captions, which are not part of what it checks.
   */
  explained?: boolean;
}

/**
 * The accessibility lab: one of each element an assistive technology is told about, with the
 * test ids `scripts/verify-a11y.mjs` looks for in the platform's accessibility tree. Nothing here is
 * specific to accessibility except the labels: the roles and states come from `Button`, `Text` and the kit.
 *
 * Captioned, each case says which role, name and state the platform is told and what to try. The elements, their props and their order
 * are the same either way.
 */
export function A11yPanel({ explained = true }: A11yPanelProps) {
  const [size, setSize] = useState<string>(A11Y_INITIAL_SIZE);
  const [saves, setSaves] = useState(0);
  const [volume, setVolume] = useState(A11Y_SLIDER_START);
  const [fruitListOpen, setFruitListOpen] = useState(true);
  const [secretPresses, setSecretPresses] = useState(0);
  const chosenSize = A11Y_SIZES.find(label => label.toLowerCase() === size);

  return (
    <View
      testID="a11y-root"
      className={explained ? 'w-full max-w-[640px] bg-slate-50 p-4 gap-4 text-slate-700' : 'w-full h-full bg-slate-50 p-4 gap-3 text-slate-700'}
    >
      {explained ? (
        <LabIntro
          title="What assistive technology is told"
          paragraphs={[
            'One of each kind of control. A card says what the platform is told about it (its role, its name and its state) and what to try. The cards look like any other page: the accessibility tree is not drawn anywhere on screen.',
            'The tree is read natively: start the demo with --accessibility always, on a Godot built with AccessKit, and read it with the platform\'s own tools. pnpm verify:a11y does that on macOS and checks these controls against what the cards say.',
            'On the Web there is nothing to read. The engine has no accessibility code on its Web platform, so a browser\'s accessibility tree holds none of this page (not measured in a browser).',
          ]}
        />
      ) : (
        <>
          <Text testID="a11y-title" className={heading}>Accessibility lab</Text>
          <Text testID="a11y-caption" className={caption}>Read by VoiceOver and the verifier alike.</Text>
        </>
      )}
      <Case
        explained={explained}
        title="Buttons"
        caption="A button is told as a button, named by its label, and it can be pressed. Delete is disabled: it is told as not enabled and offers no press. The two sit in a group that is named Actions. Press Save: the count under it goes up. An assistive technology's press action on Save does the same."
      >
        <View testID="a11y-actions" role="group" aria-label="Actions" className="flex-row gap-2">
          <Button testID="a11y-save" className={button} onClick={() => setSaves(count => count + 1)}>Save</Button>
          <Button testID="a11y-delete" disabled className={`${button} opacity-50`}>Delete</Button>
        </View>
        <Text testID="a11y-saves" className={caption}>Saved {saves} times</Text>
      </Case>
      <Case
        explained={explained}
        title="Checkboxes"
        caption="A checkbox is told as a checkbox, named by its text, with a checked state. Subscribe is checked (value 1). Select all is mixed, the state a checkbox has when only some of a group is selected. Press one, or focus it and press Space."
      >
        <Checkbox testID="a11y-subscribe" defaultChecked>Subscribe to updates</Checkbox>
        <Checkbox testID="a11y-select-all" defaultChecked="indeterminate">Select all</Checkbox>
        {explained ? <LabLimit>the engine can only set a checkbox to checked or unchecked, so the macOS tree tells Select all as unchecked and has no text for mixed.</LabLimit> : null}
      </Case>
      <Case
        explained={explained}
        title="A switch with no text"
        caption="Nothing on screen names this switch, so a sighted person sees a bare toggle. Its name is only its aria-label, Sound, and that is what a screen reader says. The platform tells a switch as a checkbox, value 0 for off and 1 for on. Press it, or focus it and press Space."
      >
        <Switch testID="a11y-sound" aria-label="Sound" />
      </Case>
      <Case
        explained={explained}
        title="A radio group"
        caption="A radio group named Size holds three radio buttons, each named by its text. The chosen one (Medium) is told as value 1 and the others as 0. Press a size, or use the arrow keys."
      >
        <RadioGroup.Root testID="a11y-size" aria-label="Size" orientation="horizontal" value={size} onValueChange={setSize} className="flex-row flex-wrap gap-2">
          {A11Y_SIZES.map(label => (
            <RadioGroup.Item key={label} testID={`a11y-size-${label.toLowerCase()}`} value={label.toLowerCase()} className={sizeItem}>
              {label}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        {explained ? <Readout label="Size chosen:" value={chosenSize ?? size} testID="a11y-size-chosen" /> : null}
        {explained ? <LabLimit>the engine has no group role and the macOS adapter leaves out the generic container it has, so the macOS tree has no group named Size (or Actions); the radio buttons and buttons are in it.</LabLimit> : null}
      </Case>
      <Case
        explained={explained}
        title="A slider"
        caption="A slider named Volume is told its value, its range and that it can be increased and decreased. Drag it, or focus the thumb and press an arrow key: the value told changes, and an assistive technology's adjust action moves it the same way."
      >
        <Slider.Root
          testID="a11y-volume" defaultValue={A11Y_SLIDER_START} min={A11Y_SLIDER_MIN} max={A11Y_SLIDER_MAX} className={CONTROL_WIDTH}
          onValueChange={explained ? setVolume : undefined}
        >
          <Slider.Track>
            <Slider.Range />
            <Slider.Thumb testID="a11y-volume-thumb" aria-label="Volume" />
          </Slider.Track>
        </Slider.Root>
        {explained ? <Readout label="Volume told as:" value={`${volume}, from ${A11Y_SLIDER_MIN} to ${A11Y_SLIDER_MAX}`} testID="a11y-volume-told" /> : null}
      </Case>
      <Case
        explained={explained}
        title="A text field"
        caption="A text field named Name (from its aria-label). Its text, Ada, and the selection and caret in it are told, and an assistive technology can select and replace text. The placeholder is only drawn while the field is empty: clear it to see it."
      >
        <TextInput testID="a11y-name" aria-label="Name" placeholder="Your name" defaultValue={A11Y_NAME_START} className={field} />
      </Case>
      <Case
        explained={explained}
        title="A multi-line text field"
        caption="A field with several lines is told as a text area, named Notes. A text area has no single value: its text is read by character range, and the line the caret is on is told. This one is two rows tall."
      >
        <TextInput testID="a11y-notes" aria-label="Notes" multiline rows={2} defaultValue={A11Y_NOTES_START} className={`${field} h-auto`} />
      </Case>
      <Case
        explained={explained}
        title="A text area that scrolls"
        caption="Five lines in two rows, so it scrolls, and the platform tree gives it a vertical scroll bar element whose value is the scroll offset. Scroll it with the wheel or by dragging."
      >
        <TextInput testID="a11y-log" aria-label="Log" multiline rows={2} defaultValue={A11Y_LOG_START} className={`${field} h-auto`} />
      </Case>
      <Case
        explained={explained}
        title="A read-only field"
        caption="Its text, Fixed, can be selected and copied but not edited. It is named Reference. Try typing in it: nothing changes."
      >
        <TextInput testID="a11y-readonly" aria-label="Reference" readOnly defaultValue={A11Y_READONLY_TEXT} className={field} />
        {explained ? <LabLimit>the platform has no attribute for read-only, so an assistive technology is not told this field is read-only (Godot's own LineEdit is the same).</LabLimit> : null}
      </Case>
      <Case
        explained={explained}
        title="A field with no label"
        caption="This field has a placeholder and no aria-label, so it is named by its placeholder: the platform tells it as Search. Type in it and the placeholder goes, but the name stays."
      >
        <TextInput testID="a11y-search" placeholder="Search" className={field} />
      </Case>
      <Case
        explained={explained}
        title="A combobox"
        caption="A combobox named Fruits, with two chips (Apple and Banana) that each have a remove button. The field is marked expanded, with the list it controls (Fruit options) and the active option (Apple), and the options are options of a list. The platform tree for it has not been read, so how a screen reader announces it is not checked. The list starts open so the active option can be seen: choose an option to add a chip, and Escape closes the list."
      >
        <Combobox.Root multiple defaultValue={A11Y_FRUITS_CHOSEN} defaultOpen autoHighlight onOpenChange={setFruitListOpen}>
          <Combobox.Control testID="a11y-fruits" className={CONTROL_WIDTH}>
            <Combobox.Chips
              renderChip={(value, label) => (
                <Combobox.Chip key={value} value={value} testID={`a11y-fruit-chip-${value}`}>
                  {label}
                  <Combobox.ChipRemove testID={`a11y-fruit-remove-${value}`} />
                </Combobox.Chip>
              )}
            >
              <Combobox.Input testID="a11y-fruit-input" aria-label="Fruits" placeholder="Add a fruit" />
            </Combobox.Chips>
          </Combobox.Control>
          <Combobox.Content testID="a11y-fruit-list" aria-label="Fruit options">
            {A11Y_FRUITS.map(label => (
              <Combobox.Item key={label} value={label.toLowerCase()} testID={`a11y-fruit-item-${label.toLowerCase()}`}>
                <Combobox.ItemText>{label}</Combobox.ItemText>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Root>
        {explained && fruitListOpen ? <View className={FRUIT_LIST_ROOM} /> : null}
      </Case>
      <Case
        explained={explained}
        title="A scroll view"
        caption="A scroll view named Messages, taller inside than it shows. Each message is static text, and each child offers a scroll into view action. Scroll it: the tree's positions follow."
      >
        <ScrollView testID="a11y-scroller" aria-label="Messages" className={scroller} contentClassName="p-2 gap-1">
          {Array.from({ length: A11Y_MESSAGE_COUNT }, (_, index) => (
            <Text key={index} testID={`a11y-message-${index + 1}`} className={caption}>{`Message ${index + 1}`}</Text>
          ))}
          <Button testID="a11y-scroll-end" className={button}>Mark all read</Button>
        </ScrollView>
        {explained ? <LabLimit>the macOS adapter has no scroll area role, so the view is told as an unknown element, and it gives the view no scroll position of its own: the position is the scroll bar element inside it.</LabLimit> : null}
      </Case>
      <Case
        explained={explained}
        title="A scroll view that pans sideways"
        caption="A gallery named Gallery, drawn 640 px wide in a view half that, and taller than it shows. It scrolls on both axes, so the tree gives it two scroll bar elements, horizontal first. Drag or swipe it sideways to pan."
      >
        <ScrollView testID="a11y-gallery" aria-label="Gallery" className={gallery} contentClassName="w-[640px] p-2 gap-1">
          {Array.from({ length: A11Y_PHOTO_COUNT }, (_, index) => (
            <Text key={index} testID={`a11y-photo-${index + 1}`} className={caption}>{`Photo ${index + 1}`}</Text>
          ))}
        </ScrollView>
      </Case>
      <Case
        explained={explained}
        title="Hidden from assistive technology"
        caption="The tinted box is marked aria-hidden. It is drawn and works as usual (read the text, press Secret), but it is left out of the platform tree, so a screen reader never meets it; pnpm verify:a11y checks that neither Hidden text nor Secret is in the tree. Use it for decoration or for content a screen reader already gets another way, not for a real control."
        expected="a sighted person sees and presses Secret and the count below goes up; a screen reader never hears it."
      >
        <View testID="a11y-hidden" aria-hidden className={explained ? 'gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3' : 'gap-2'}>
          <Text testID="a11y-hidden-text">Hidden text</Text>
          <Button testID="a11y-hidden-button" className={primaryButton} onClick={() => setSecretPresses(count => count + 1)}>Secret</Button>
        </View>
        {explained ? <Readout label="Presses counted on the hidden button:" value={String(secretPresses)} testID="a11y-hidden-presses" /> : null}
      </Case>
    </View>
  );
}
