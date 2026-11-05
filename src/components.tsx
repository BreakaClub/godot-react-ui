import { Children, createElement, forwardRef, type ReactNode } from 'react';
import type { LayoutRect, NativeEventType } from './native';
import type { StyleProp } from './types';

export interface UIHandle {
  readonly id: number;
  readonly testID: string | undefined;
  getRect(): LayoutRect | undefined;
}

export interface UIEvent {
  readonly type: NativeEventType;
  readonly target: UIHandle;
  readonly currentTarget: UIHandle;
  /** Root-local logical pixel coordinates, independent of device pixel ratio. */
  readonly x: number;
  readonly y: number;
  stopPropagation(): void;
  isPropagationStopped(): boolean;
}

export interface UIProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp;
  testID?: string;
  disabled?: boolean;
  onClick?: (event: UIEvent) => void;
  onPointerDown?: (event: UIEvent) => void;
  onPointerUp?: (event: UIEvent) => void;
  onPointerMove?: (event: UIEvent) => void;
  onPointerEnter?: (event: UIEvent) => void;
  onPointerLeave?: (event: UIEvent) => void;
  onFocus?: (event: UIEvent) => void;
  onBlur?: (event: UIEvent) => void;
}

/** A flex-column element by default; Taffy owns its complete layout. */
export const View = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('view', { ...props, ref }));
View.displayName = 'View';

/** Native Godot-shaped text. Text color, size and alignment inherit from the parent. */
export const Text = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('text', { ...props, ref }));
Text.displayName = 'Text';

/** Native hit testing and keyboard activation; event closures stay in JavaScript. */
export const Button = forwardRef<UIHandle, UIProps>((props, ref) => {
  const children = Children.toArray(props.children);
  // JSX interpolation produces separate string/number children. A button label is
  // one shaped text run, rather than separate flex children for "Add " and 1.
  const textOnly = children.every((child) =>
    typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint');
  return createElement('button', { ...props, ref }, textOnly ? children.join('') : props.children);
});
Button.displayName = 'Button';
