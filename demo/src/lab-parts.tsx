import { createContext, useContext, type ReactNode } from 'react';
import { Text, View } from 'godot-react-ui';

export const ExpectedVisibleContext = createContext<boolean>(false);

export function ExpectedVisibleProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <ExpectedVisibleContext.Provider value={value}>{children}</ExpectedVisibleContext.Provider>;
}

export function useExpectedVisible(): boolean {
  return useContext(ExpectedVisibleContext);
}

/**
 * The parts the labs explain themselves with: an introduction that says what the lab shows and which part of the
 * library and which web behaviour it is about, a card for each case with a caption (what it shows, what to try) and the outcome to expect, a
 * labelled result, and a note for a limit the case shows. They are plain `View`s and `Text`s in the demo's slate and indigo, so a lab reads the
 * same everywhere and wraps at the window's width: nothing here has a fixed width.
 */

/** The narrowest a case card gets before a row of cards wraps: a phone's 412 px less the page's padding fits one. */
const CASE_MIN_WIDTH = 260;

interface LabIntroProps {
  title: string;
  /** One paragraph each: what the lab shows, then why it matters (the part of the library, the web behaviour it matches). */
  paragraphs: readonly string[];
  testID?: string;
}

/** The lab's heading and its introduction. The navigator's header already names the lab, so these paragraphs say more than its one sentence does. */
export function LabIntro({ title, paragraphs, testID }: LabIntroProps) {
  return (
    <View testID={testID} className="gap-1">
      <Text className="text-2xl text-slate-900">{title}</Text>
      {paragraphs.map(paragraph => <Text key={paragraph} className="text-sm text-slate-600">{paragraph}</Text>)}
    </View>
  );
}

interface LabCaseProps {
  title: string;
  /** What the case shows and what to try, in one to three plain sentences. */
  caption: string;
  /** What should happen, when it is not obvious from the caption. */
  expected?: string;
  testID?: string;
  /** Extra classes for the card, such as `w-full`; the card is `min-w-0` and wraps its text. */
  className?: string;
  children?: ReactNode;
}

/** A card for one case: its title, its caption, the live controls and results, then the outcome to expect. */
export function LabCase({ title, caption, expected, testID, className, children }: LabCaseProps) {
  const showExpected = useExpectedVisible();
  return (
    <View testID={testID} className={`min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 ${className ?? ''}`}>
      <Text className="text-sm text-slate-900">{title}</Text>
      <Text className="text-sm text-slate-600">{caption}</Text>
      {children}
      {expected !== undefined && showExpected ? <Text className="text-xs text-indigo-700">{`Expected: ${expected}`}</Text> : null}
    </View>
  );
}

/** Cards side by side while they fit the width, and one under another when they do not. Give each card `LAB_CARD_CLASS`. */
export function LabGrid({ children, testID }: { children: ReactNode; testID?: string }) {
  return <View testID={testID} className="flex-row flex-wrap gap-4">{children}</View>;
}

/** The classes that make a `LabCase` in a `LabGrid` share the row and wrap under the others once it would be narrower than a phone leaves it. */
export const LAB_CARD_CLASS = `min-w-[${CASE_MIN_WIDTH}px] flex-1`;

interface ReadoutProps {
  label: string;
  value: string;
  testID?: string;
  /** The label is a name and the value what it counts or reads: `Taps` `3`. A colour matches the result to the thing it counts. */
  colour?: `#${string}`;
}

/** A named result, shown where the person acts: `label` in grey, `value` in dark text, wrapping as one line. */
export function Readout({ label, value, testID, colour }: ReadoutProps) {
  return (
    <View className="flex-row flex-wrap items-center gap-x-1.5">
      {colour === undefined ? null : <View className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colour }} />}
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text testID={testID} className="text-xs text-slate-900">{value}</Text>
    </View>
  );
}

/** A limit of the library the case shows, in a tinted box, so it is not mistaken for a bug in the lab or a result to expect. */
export function LabLimit({ children }: { children: string }) {
  return (
    <View className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
      <Text className="text-xs text-amber-900">{`Known limit: ${children}`}</Text>
    </View>
  );
}
