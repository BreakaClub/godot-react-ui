import { useState } from 'react';
import { Button, Checkbox, RadioGroup, ScrollView, Slider, Switch, Text, TextInput, View } from 'godot-react-ui';

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
/** The gallery's rows: more than its height shows, in a column wider than the view, so it scrolls on both axes. */
export const A11Y_PHOTO_COUNT = 6;

const heading = 'text-xl text-slate-900';
const caption = 'text-sm text-slate-500';
const button = 'rounded-lg border border-slate-300 px-4 py-2 bg-white text-slate-700 focus:border-indigo-500';
const sizeItem = 'rounded-lg border border-slate-300 px-3 py-1 bg-white';
const scroller = 'h-24 w-[320px] rounded-lg border border-slate-300 bg-white';
const gallery = 'h-[72px] w-[320px] overflow-x-auto rounded-lg border border-slate-300 bg-white';
const field = 'w-[320px] rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-500';

/**
 * The accessibility lab (Phase I10): one of each element an assistive technology is told about, with the
 * test ids `scripts/verify-a11y.mjs` looks for in the platform's accessibility tree. Nothing here is
 * specific to accessibility except the labels: the roles and states come from `Button`, `Text` and the kit.
 */
export function A11yPanel() {
  const [size, setSize] = useState<string>(A11Y_INITIAL_SIZE);
  const [saves, setSaves] = useState(0);

  return (
    <View testID="a11y-root" className="w-full h-full bg-slate-50 p-4 gap-3">
      <Text testID="a11y-title" className={heading}>Accessibility lab</Text>
      <Text testID="a11y-caption" className={caption}>Read by VoiceOver and the verifier alike.</Text>
      <View testID="a11y-actions" role="group" aria-label="Actions" className="flex-row gap-2">
        <Button testID="a11y-save" className={button} onClick={() => setSaves(count => count + 1)}>Save</Button>
        <Button testID="a11y-delete" disabled className={`${button} opacity-50`}>Delete</Button>
      </View>
      <Text testID="a11y-saves" className={caption}>Saved {saves} times</Text>
      <Checkbox testID="a11y-subscribe" defaultChecked>Subscribe to updates</Checkbox>
      <Checkbox testID="a11y-select-all" defaultChecked="indeterminate">Select all</Checkbox>
      <Switch testID="a11y-sound" aria-label="Sound" />
      <RadioGroup.Root testID="a11y-size" aria-label="Size" orientation="horizontal" value={size} onValueChange={setSize} className="flex-row gap-2">
        {A11Y_SIZES.map(label => (
          <RadioGroup.Item key={label} testID={`a11y-size-${label.toLowerCase()}`} value={label.toLowerCase()} className={sizeItem}>
            {label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <Slider.Root testID="a11y-volume" defaultValue={A11Y_SLIDER_START} min={A11Y_SLIDER_MIN} max={A11Y_SLIDER_MAX} className="w-[320px]">
        <Slider.Track>
          <Slider.Range />
          <Slider.Thumb testID="a11y-volume-thumb" aria-label="Volume" />
        </Slider.Track>
      </Slider.Root>
      <TextInput testID="a11y-name" aria-label="Name" placeholder="Your name" defaultValue={A11Y_NAME_START} className={field} />
      <TextInput testID="a11y-notes" aria-label="Notes" multiline rows={2} defaultValue={A11Y_NOTES_START} className={`${field} h-auto`} />
      <TextInput testID="a11y-log" aria-label="Log" multiline rows={2} defaultValue={A11Y_LOG_START} className={`${field} h-auto`} />
      <TextInput testID="a11y-readonly" aria-label="Reference" readOnly defaultValue={A11Y_READONLY_TEXT} className={field} />
      <TextInput testID="a11y-search" placeholder="Search" className={field} />
      <ScrollView testID="a11y-scroller" aria-label="Messages" className={scroller} contentClassName="p-2 gap-1">
        {Array.from({ length: A11Y_MESSAGE_COUNT }, (_, index) => (
          <Text key={index} testID={`a11y-message-${index + 1}`} className={caption}>{`Message ${index + 1}`}</Text>
        ))}
        <Button testID="a11y-scroll-end" className={button}>Mark all read</Button>
      </ScrollView>
      <ScrollView testID="a11y-gallery" aria-label="Gallery" className={gallery} contentClassName="w-[640px] p-2 gap-1">
        {Array.from({ length: A11Y_PHOTO_COUNT }, (_, index) => (
          <Text key={index} testID={`a11y-photo-${index + 1}`} className={caption}>{`Photo ${index + 1}`}</Text>
        ))}
      </ScrollView>
      <View testID="a11y-hidden" aria-hidden className="gap-2">
        <Text testID="a11y-hidden-text">Hidden text</Text>
        <Button testID="a11y-hidden-button" className={button}>Secret</Button>
      </View>
    </View>
  );
}
