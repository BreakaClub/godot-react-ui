import type { ReactNode } from 'react';
import { Text, View } from 'godot-react-ui';

/**
 * What the text labs explain themselves with, beside `lab-parts.tsx`. `LabCase` is a card that stacks its caption
 * above and below the control, which is more height than the verifiers' windows give these labs (they drive each control at its place in a
 * 600 x 900 or 1120 x 800 window), so `CaseRow` puts the caption beside the control while the window is wide enough and under it when it is not.
 */

/** The narrowest the caption beside a control gets before it wraps under the control: a phone's width less a field's cannot hold it. */
const CAPTION_MIN_WIDTH = 160;

interface CaseRowProps {
  /** What the control is and what to try, in plain sentences: one paragraph, or several for a case that has more than one thing to try. */
  caption: string | readonly string[];
  /** Classes of the box that holds the control, such as `w-full max-w-[520px]`: its width. Without them the box is as wide as its control, up to the row. */
  controlClassName?: string;
  /** `beside` (the default): the caption shares the row while it fits and wraps under the control when it does not. `below`: always under it. */
  placement?: 'beside' | 'below';
  /** Named results of the control, shown under the caption where the person acts. */
  result?: ReactNode;
  testID?: string;
  children: ReactNode;
}

/** A control with its caption and results, laid out as a row that wraps, or as a column. */
export function CaseRow({ caption, controlClassName, placement = 'beside', result, testID, children }: CaseRowProps) {
  const rowClassName = placement === 'beside' ? 'flex-row flex-wrap items-start gap-x-4 gap-y-1' : 'gap-1';
  const captionClassName = placement === 'beside' ? `min-w-[${CAPTION_MIN_WIDTH}px] flex-1 gap-0.5` : 'gap-0.5';
  return (
    <View testID={testID} className={rowClassName}>
      <View className={`min-w-0 ${controlClassName ?? 'max-w-full'}`}>{children}</View>
      <View className={captionClassName}>
        {(typeof caption === 'string' ? [caption] : caption).map(paragraph => <Text key={paragraph} className="text-xs text-slate-600">{paragraph}</Text>)}
        {result}
      </View>
    </View>
  );
}

/** Named results in a row that wraps: `Readout`s from `lab-parts.tsx`. */
export function Results({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-x-3">{children}</View>;
}

/** A small heading over a result or a readout that is not a case's own: what the thing under it is. */
export function ReadoutHeading({ children }: { children: string }) {
  return <Text className="text-xs text-slate-500">{children}</Text>;
}
