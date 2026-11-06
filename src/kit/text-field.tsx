import { forwardRef, useRef } from 'react';
import { Text, View, type TextInputHandle } from '../components';
import { TextInput, type TextInputProps } from '../text-input';
import type { StyleProp } from '../types';
import { joinClassNames, useComposedRef, type PartProps } from './parts';

export interface TextFieldProps
  extends PartProps, Omit<TextInputProps, 'className' | 'style' | 'testID' | 'aria-label' | 'aria-description'> {
  /** The visible label above the input. It names the input for assistive technology (`aria-label`) and a press on it focuses the input. */
  label?: string;
  /** A hint under the input. Read as the input's description. */
  helperText?: string;
  /** What is wrong with the value. It takes the helper's place, in rose, and the input's border turns rose. */
  errorText?: string;
  /** The root. The input is `${testID}-input`, the label `${testID}-label` and the message `${testID}-message`. */
  testID?: string;
  /** Overrides the name derived from `label`, for a field with no visible label. */
  'aria-label'?: string;
  /** Overrides the description derived from `errorText` or `helperText`. */
  'aria-description'?: string;
  labelClassName?: string;
  labelStyle?: StyleProp;
  inputClassName?: string;
  inputStyle?: StyleProp;
  messageClassName?: string;
  messageStyle?: StyleProp;
}

const ROOT_CLASS = 'gap-1';
const LABEL_CLASS = 'text-sm text-slate-700';
const INPUT_CLASS = 'rounded-md border bg-white px-3 py-2 text-base text-slate-900 placeholder-slate-400 caret-indigo-600 disabled:opacity-50';
const INPUT_VALID_CLASS = 'border-slate-300 focus:border-indigo-500';
const INPUT_INVALID_CLASS = 'border-rose-500 focus:border-rose-600';
const MESSAGE_CLASS = 'text-xs';
const HELPER_CLASS = 'text-slate-500';
const ERROR_CLASS = 'text-rose-600';

/**
 * A labelled text input: a label `Text`, a `TextInput` and a helper or error `Text` in a column. Every prop of `TextInput`
 * passes through, controlled (`value`) or not (`defaultValue`), single-line or `multiline`.
 *
 * Accessibility. Native has no relationship props (`aria-labelledby`, `aria-describedby`), so the kit does what they would
 * do with the text it has: the label becomes the input's `aria-label` and the error, or else the helper, its
 * `aria-description`. Both can be overridden. A press on the label focuses the input, as a `<label>` does.
 */
export const TextField = forwardRef<TextInputHandle, TextFieldProps>(function TextField(props, forwardedRef) {
  const {
    label, helperText, errorText, testID, className, style, labelClassName, labelStyle, inputClassName, inputStyle,
    messageClassName, messageStyle, 'aria-label': ariaLabel, 'aria-description': ariaDescription, ...input
  } = props;
  const inner = useRef<TextInputHandle | null>(null);
  const ref = useComposedRef(inner, forwardedRef);
  const invalid = errorText !== undefined && errorText !== '';
  const message = invalid ? errorText : helperText;
  const hasMessage = message !== undefined && message !== '';

  return (
    <View testID={testID} className={joinClassNames(ROOT_CLASS, className)} style={style}>
      {label === undefined ? null : (
        <Text
          testID={testID === undefined ? undefined : `${testID}-label`}
          className={joinClassNames(LABEL_CLASS, labelClassName)}
          style={labelStyle}
          onClick={() => { if (!input.disabled) inner.current?.focus(); }}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...input}
        ref={ref}
        testID={testID === undefined ? undefined : `${testID}-input`}
        className={joinClassNames(INPUT_CLASS, invalid ? INPUT_INVALID_CLASS : INPUT_VALID_CLASS, inputClassName)}
        style={inputStyle}
        aria-label={ariaLabel ?? label}
        aria-description={ariaDescription ?? (hasMessage ? message : undefined)}
      />
      {hasMessage ? (
        <Text
          testID={testID === undefined ? undefined : `${testID}-message`}
          className={joinClassNames(MESSAGE_CLASS, invalid ? ERROR_CLASS : HELPER_CLASS, messageClassName)}
          style={messageStyle}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
});
TextField.displayName = 'TextField';
