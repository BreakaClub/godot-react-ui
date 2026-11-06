import { createContext, forwardRef, useCallback, useContext, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { View, type UIHandle } from '../components';
import type { UIAccessibilityActionEvent, UIKeyboardEvent, UIPointerEvent } from '../events';
import type { Style, UIAriaProps } from '../types';
import { hasShortcutModifier } from './keys';
import { joinClassNames, useComposedRef, useStyle, type PartProps } from './parts';
import {
  clampToBounds, fractionAtPointer, fractionOf, sliderBounds, valueAtFraction, valueForAccessibilityAction, valueForKey,
  type PointerAxis, type SliderBounds,
} from './slider-math';
import { useControllableState } from './use-controllable-state';

export type SliderOrientation = 'horizontal' | 'vertical';

export interface SliderRootProps extends PartProps {
  /** The value. Defining it makes the slider controlled: it shows `value` and the parent decides each change. */
  value?: number;
  /** The starting value of an uncontrolled slider. Defaults to `min`. */
  defaultValue?: number;
  /** Called with each new value while the user drags or presses keys. */
  onValueChange?: (value: number) => void;
  /**
   * Called with the value a drag or key press ended on, if it differs from where it started: once per
   * drag (when the pointer goes up or is cancelled) and once per key press.
   */
  onValueCommit?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** A vertical slider has its minimum at the bottom. */
  orientation?: SliderOrientation;
  disabled?: boolean;
  testID?: string;
  children?: ReactNode;
}

export interface SliderTrackProps extends PartProps {
  testID?: string;
  /** The `Slider.Range` and `Slider.Thumb`, in that order. */
  children?: ReactNode;
}

export interface SliderRangeProps extends PartProps {
  testID?: string;
}

export interface SliderThumbProps extends PartProps, Omit<UIAriaProps, 'role' | 'aria-valuemin' | 'aria-valuemax' | 'aria-valuenow' | 'aria-orientation'> {
  testID?: string;
}

interface SliderContext {
  readonly bounds: SliderBounds;
  /** The value shown: the current value held to the ends. */
  readonly value: number;
  readonly fraction: number;
  readonly orientation: SliderOrientation;
  readonly disabled: boolean;
  readonly track: MutableRefObject<UIHandle | null>;
  readonly thumb: MutableRefObject<UIHandle | null>;
  readonly setValue: (value: number) => void;
  readonly commit: (value: number) => void;
}

const SliderContextValue = createContext<SliderContext | null>(null);

function useSlider(part: string): SliderContext {
  const slider = useContext(SliderContextValue);
  if (slider === null) throw new Error(`<Slider.${part}> must be rendered inside <Slider.Root>`);
  return slider;
}

/** DOM `button` of the primary button, and of a touch contact. */
const PRIMARY_BUTTON = 0;
/**
 * The filled and remaining parts of the track share its free space by flex-grow. Taffy gives them only
 * `sum(flexGrow)` of the free space when the sum is under 1, so the factors are percentages (summing to
 * 100) and not fractions.
 */
const FLEX_GROW_PERCENT = 100;

// `touch-none`: a finger on a slider drags the thumb and never pans a scroll container behind it (the press
// also captures the pointer, which keeps the pan away; the style says it at the element too).
const ROOT_HORIZONTAL_CLASS = 'flex-row items-center h-6 touch-none';
const ROOT_VERTICAL_CLASS = 'flex-col items-center w-6 touch-none';
const TRACK_HORIZONTAL_CLASS = 'flex-1 flex-row items-center h-1.5 rounded-full bg-slate-300';
const TRACK_VERTICAL_CLASS = 'flex-1 flex-col-reverse items-center w-1.5 rounded-full bg-slate-300';
const RANGE_CLASS = 'self-stretch rounded-full bg-indigo-600';
const THUMB_CLASS = 'w-5 h-5 shrink-0 rounded-full border-2 border-indigo-600 bg-white disabled:opacity-50';

/** One drag, from the pointer going down to its going up or being cancelled. */
interface Drag {
  readonly pointerId: number;
  readonly axis: PointerAxis;
  /** How far the pointer was from the thumb's centre when it grabbed the thumb (0 for a press on the track). */
  readonly grabOffset: number;
  readonly startValue: number;
  lastValue: number;
}

/**
 * The slider's state and input. Layout: the track is a flex row of the filled `Slider.Range`, the
 * `Slider.Thumb` and an empty remainder; the range and the remainder grow in proportion to the value
 * and the thumb has a fixed size, so the thumb stays inside the track at both ends and nothing is
 * positioned, transformed or measured after layout.
 *
 * Pointer: pressing the track or the thumb captures the pointer, focuses the thumb, and (on the track)
 * moves the thumb's centre under the pointer; a drag keeps following the pointer anywhere on screen,
 * clamped to the track's ends. A press that grabs the thumb does not move it until the pointer does,
 * and keeps the offset at which it was grabbed. The value comes from `getRect()` of the track and thumb,
 * read when the press begins.
 */
const SliderRoot = forwardRef<UIHandle, SliderRootProps>(function SliderRoot(props, ref) {
  const {
    value, defaultValue, onValueChange, onValueCommit, min = 0, max = 100, step = 1,
    orientation = 'horizontal', disabled = false, className, style, testID, children,
  } = props;
  const vertical = orientation === 'vertical';
  const bounds = useMemo(() => sliderBounds(min, max, step), [min, max, step]);
  const [current, setValue] = useControllableState<number>({
    prop: value, defaultProp: defaultValue ?? bounds.min, onChange: onValueChange, name: 'Slider',
  });
  const shown = clampToBounds(current, bounds);
  const fraction = fractionOf(shown, bounds);
  const track = useRef<UIHandle | null>(null);
  const thumb = useRef<UIHandle | null>(null);
  const drag = useRef<Drag | null>(null);

  const commit = useCallback((committed: number) => { onValueCommit?.(committed); }, [onValueCommit]);

  const follow = (state: Drag, pointer: number) => {
    const next = valueAtFraction(fractionAtPointer(pointer - state.grabOffset, state.axis), bounds);
    state.lastValue = next;
    setValue(next);
  };
  const pointerOf = (event: UIPointerEvent) => (vertical ? event.y : event.x);

  const onPointerDown = (event: UIPointerEvent) => {
    if (disabled || event.button !== PRIMARY_BUTTON || drag.current !== null) return;
    const trackHandle = track.current;
    const thumbHandle = thumb.current;
    if (trackHandle === null || thumbHandle === null) {
      throw new Error('<Slider.Root> needs a <Slider.Track> that contains a <Slider.Thumb>');
    }
    const trackRect = trackHandle.getRect();
    const thumbRect = thumbHandle.getRect();
    if (trackRect === undefined || thumbRect === undefined) {
      throw new Error('The slider track or thumb is not mounted, so the press cannot be mapped to a value');
    }
    const axis: PointerAxis = vertical
      ? { start: trackRect.y, length: trackRect.height, thumbLength: thumbRect.height, reversed: true }
      : { start: trackRect.x, length: trackRect.width, thumbLength: thumbRect.width, reversed: false };
    const pointer = pointerOf(event);
    const onThumb = event.target.id === thumbHandle.id;
    const thumbCentre = vertical ? thumbRect.y + thumbRect.height / 2 : thumbRect.x + thumbRect.width / 2;
    const state: Drag = {
      pointerId: event.pointerId, axis, grabOffset: onThumb ? pointer - thumbCentre : 0, startValue: shown, lastValue: shown,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    // Native would otherwise move focus to the nearest focusable ancestor of the press, which is nothing
    // for a press on the track, after the thumb below has been focused.
    event.preventDefault();
    thumbHandle.focus();
    drag.current = state;
    if (!onThumb) follow(state, pointer);
  };
  const onPointerMove = (event: UIPointerEvent) => {
    const state = drag.current;
    if (state === null || event.pointerId !== state.pointerId) return;
    follow(state, pointerOf(event));
  };
  const endDrag = (event: UIPointerEvent) => {
    const state = drag.current;
    if (state === null || event.pointerId !== state.pointerId) return;
    drag.current = null;
    if (state.lastValue !== state.startValue) commit(state.lastValue);
  };

  const context = useMemo((): SliderContext => ({
    bounds, value: shown, fraction, orientation, disabled, track, thumb, setValue, commit,
  }), [bounds, shown, fraction, orientation, disabled, setValue, commit]);

  return (
    <View
      ref={ref}
      testID={testID}
      disabled={disabled}
      className={joinClassNames(vertical ? ROOT_VERTICAL_CLASS : ROOT_HORIZONTAL_CLASS, className)}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <SliderContextValue.Provider value={context}>{children}</SliderContextValue.Provider>
    </View>
  );
});
SliderRoot.displayName = 'Slider.Root';

/** The bar the range and thumb sit in. It appends the remainder after its children. */
const SliderTrack = forwardRef<UIHandle, SliderTrackProps>(function SliderTrack(props, ref) {
  const { className, style, testID, children } = props;
  const slider = useSlider('Track');
  const setRef = useComposedRef(slider.track, ref);
  const remainder = useMemo((): Style => ({
    flexGrow: FLEX_GROW_PERCENT - slider.fraction * FLEX_GROW_PERCENT, flexBasis: 0, flexShrink: 0,
  }), [slider.fraction]);
  return (
    <View
      ref={setRef}
      testID={testID}
      className={joinClassNames(slider.orientation === 'vertical' ? TRACK_VERTICAL_CLASS : TRACK_HORIZONTAL_CLASS, className)}
      style={style}
    >
      {children}
      <View style={remainder} />
    </View>
  );
});
SliderTrack.displayName = 'Slider.Track';

/** The filled part of the track, from its start to the thumb. */
const SliderRange = forwardRef<UIHandle, SliderRangeProps>(function SliderRange(props, ref) {
  const { className, style, testID } = props;
  const slider = useSlider('Range');
  const own = useMemo((): Style => ({
    flexGrow: slider.fraction * FLEX_GROW_PERCENT, flexBasis: 0, flexShrink: 0,
  }), [slider.fraction]);
  const merged = useStyle(own, style);
  return <View ref={ref} testID={testID} className={joinClassNames(RANGE_CLASS, className)} style={merged} />;
});
SliderRange.displayName = 'Slider.Range';

/**
 * The thumb: focusable, `role="slider"`, and the keyboard's target. Arrow keys move one step (Right and
 * Up increase), PageUp and PageDown ten steps, Home and End go to the ends; each of them prevents the
 * key's default. A screen reader's increment, decrement and set-value actions arrive as
 * `accessibilityaction` events and take the same path as a key: the value moves, then commits once.
 */
const SliderThumb = forwardRef<UIHandle, SliderThumbProps>(function SliderThumb(props, ref) {
  const { className, style, testID, ...aria } = props;
  const slider = useSlider('Thumb');
  const setRef = useComposedRef(slider.thumb, ref);
  const onKeyDown = (event: UIKeyboardEvent) => {
    if (slider.disabled || hasShortcutModifier(event)) return;
    const next = valueForKey(event.key, slider.value, slider.bounds);
    if (next === undefined) return;
    event.preventDefault();
    if (next === slider.value) return;
    slider.setValue(next);
    slider.commit(next);
  };
  const onAccessibilityAction = (event: UIAccessibilityActionEvent) => {
    if (slider.disabled) return;
    const next = valueForAccessibilityAction(event.action, event.value, slider.value, slider.bounds);
    if (next === slider.value) return;
    slider.setValue(next);
    slider.commit(next);
  };
  return (
    <View
      {...aria}
      ref={setRef}
      testID={testID}
      disabled={slider.disabled}
      tabIndex={slider.disabled ? undefined : 0}
      className={joinClassNames(THUMB_CLASS, className)}
      style={style}
      role="slider"
      aria-valuemin={slider.bounds.min}
      aria-valuemax={slider.bounds.max}
      aria-valuenow={slider.value}
      aria-orientation={slider.orientation}
      onKeyDown={onKeyDown}
      onAccessibilityAction={onAccessibilityAction}
    />
  );
});
SliderThumb.displayName = 'Slider.Thumb';

export const Slider = { Root: SliderRoot, Track: SliderTrack, Range: SliderRange, Thumb: SliderThumb } as const;
