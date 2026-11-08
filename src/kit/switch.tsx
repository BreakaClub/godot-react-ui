import { forwardRef, useMemo, type ReactNode } from 'react';
import { Button, View, type UIHandle } from '../components';
import type { Style, StyleProp, Transition, UIAriaProps } from '../types';
import { joinClassNames, useStyle, type PartProps } from './parts';
import { useControllableState } from './use-controllable-state';

export interface SwitchProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-checked'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  testID?: string;
  /** The label. It is part of the button, so pressing it toggles the switch too. */
  children?: ReactNode;
  /**
   * The geometry, in logical pixels. The thumb moves by the width of a spacer, which must be a pixel
   * value (a pixel/percentage transition is rejected natively), so the kit needs the sizes as numbers:
   * overriding them with `trackClassName` or `thumbClassName` breaks the thumb's travel.
   */
  trackWidth?: number;
  thumbSize?: number;
  /** The gap between the thumb and the track's edge. */
  thumbInset?: number;
  trackClassName?: string;
  trackStyle?: StyleProp;
  thumbClassName?: string;
  thumbStyle?: StyleProp;
}

const DEFAULT_TRACK_WIDTH = 44;
const DEFAULT_THUMB_SIZE = 20;
const DEFAULT_THUMB_INSET = 2;
/** Long enough to read as motion, short enough that the control feels immediate. */
const THUMB_TRAVEL_MS = 150;
const TRACK_FADE_MS = 150;

const THUMB_TRAVEL: Transition = Object.freeze({
  properties: Object.freeze(['width' as const]), durationMs: THUMB_TRAVEL_MS, easing: 'ease-out',
});
const TRACK_FADE: Transition = Object.freeze({
  properties: Object.freeze(['backgroundColor' as const]), durationMs: TRACK_FADE_MS, easing: 'ease-out',
});

const ROOT_CLASS = 'flex-row items-center justify-start gap-2 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';
const TRACK_CLASS = 'flex-row items-center rounded-full';
const TRACK_OFF_CLASS = 'bg-slate-300';
const TRACK_ON_CLASS = 'bg-indigo-600';
const THUMB_CLASS = 'shrink-0 rounded-full bg-white';

/**
 * A switch: a `Button` with `role="switch"` holding a track, a spacer and a thumb. Moving the thumb
 * is a `width` transition of the spacer in front of it, because there are no transforms.
 *
 * Space and Enter both toggle it: they are the button's own activation keys, so the toggle arrives as
 * the button's `click`.
 */
export const Switch = forwardRef<UIHandle, SwitchProps>(function Switch(props, ref) {
  const {
    checked, defaultChecked = false, onCheckedChange, disabled = false, className, style, testID, children,
    trackWidth = DEFAULT_TRACK_WIDTH, thumbSize = DEFAULT_THUMB_SIZE, thumbInset = DEFAULT_THUMB_INSET,
    trackClassName, trackStyle, thumbClassName, thumbStyle, ...aria
  } = props;
  const [on, setOn] = useControllableState<boolean>({
    prop: checked, defaultProp: defaultChecked, onChange: onCheckedChange, name: 'Switch',
  });

  const travel = trackWidth - thumbSize - 2 * thumbInset;
  if (!(travel >= 0)) {
    throw new Error(`Switch trackWidth ${trackWidth} is too narrow for a ${thumbSize}px thumb inset by ${thumbInset}px`);
  }

  const trackOwn = useMemo((): Style => ({
    width: trackWidth, height: thumbSize + 2 * thumbInset, padding: thumbInset, transition: TRACK_FADE,
  }), [trackWidth, thumbSize, thumbInset]);
  const spacerStyle = useMemo((): Style => ({
    width: on ? travel : 0, flexShrink: 0, transition: THUMB_TRAVEL,
  }), [on, travel]);
  const thumbOwn = useMemo((): Style => ({ width: thumbSize, height: thumbSize }), [thumbSize]);
  const track = useStyle(trackOwn, trackStyle);
  const thumb = useStyle(thumbOwn, thumbStyle);

  // A click never reaches a disabled button or anything inside it, so there is nothing to guard.
  const toggle = () => { setOn(!on); };

  return (
    <Button
      {...aria}
      ref={ref}
      testID={testID}
      disabled={disabled}
      className={joinClassNames(ROOT_CLASS, className)}
      style={style}
      role="switch"
      aria-checked={on}
      onClick={toggle}
    >
      <View className={joinClassNames(TRACK_CLASS, on ? TRACK_ON_CLASS : TRACK_OFF_CLASS, trackClassName)} style={track}>
        <View style={spacerStyle} />
        <View className={joinClassNames(THUMB_CLASS, thumbClassName)} style={thumb} />
      </View>
      {children}
    </Button>
  );
});
Switch.displayName = 'Switch';
