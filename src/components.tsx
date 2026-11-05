import { Children, createElement, forwardRef, useContext, type ReactNode } from 'react';
import type { UIFocusEvent, UIPointerEvent } from './events';
import type { LayoutRect } from './native';
import { createOverlayPortal, OverlayContext } from './renderer';
import type { StyleProp } from './types';

export interface UIHandle {
  readonly id: number;
  readonly testID: string | undefined;
  /** The element's root-local rectangle, from a native query, or `undefined` once it is gone. */
  getRect(): LayoutRect | undefined;
}

export interface UIProps {
  children?: ReactNode;
  className?: string;
  style?: StyleProp;
  testID?: string;
  disabled?: boolean;
  onClick?: (event: UIPointerEvent) => void;
  onClickCapture?: (event: UIPointerEvent) => void;
  onPointerDown?: (event: UIPointerEvent) => void;
  onPointerDownCapture?: (event: UIPointerEvent) => void;
  onPointerUp?: (event: UIPointerEvent) => void;
  onPointerUpCapture?: (event: UIPointerEvent) => void;
  onPointerMove?: (event: UIPointerEvent) => void;
  onPointerMoveCapture?: (event: UIPointerEvent) => void;
  /** Does not bubble: runs for each element the pointer enters, outermost first. */
  onPointerEnter?: (event: UIPointerEvent) => void;
  /** Does not bubble: runs for each element the pointer leaves, deepest first. */
  onPointerLeave?: (event: UIPointerEvent) => void;
  onFocus?: (event: UIFocusEvent) => void;
  onBlur?: (event: UIFocusEvent) => void;
}

/** A flex-column element by default; Taffy owns its complete layout. */
export const View = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('view', { ...props, ref }));
View.displayName = 'View';

/**
 * Native Godot-shaped text. Its children must be strings or numbers; React Native's rule is that
 * raw strings only appear inside `<Text>`. Text color, size and alignment inherit from the parent.
 */
export const Text = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('text', { ...props, ref }));
Text.displayName = 'Text';

/**
 * A button's label is its own `Text` child: JSX interpolation produces separate string and number
 * children, and a run of them is one shaped text run, rather than separate flex children for
 * "Add " and 1. Elements between the runs pass through.
 */
function withLabels(children: ReactNode): ReactNode[] {
  const labelled: ReactNode[] = [];
  let run: string[] = [];
  const endRun = () => {
    if (run.length === 0) return;
    labelled.push(createElement(Text, { key: `label-${labelled.length}` }, run.join('')));
    run = [];
  };
  for (const child of Children.toArray(children)) {
    if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
      run.push(String(child));
    } else {
      endRun();
      labelled.push(child);
    }
  }
  endRun();
  return labelled;
}

/** Native hit testing and keyboard activation; event closures stay in JavaScript. */
export const Button = forwardRef<UIHandle, UIProps>((props, ref) =>
  createElement('button', { ...props, ref }, withLabels(props.children)));
Button.displayName = 'Button';

/**
 * Render `children` into the overlay layer, which always draws above the main layer and is
 * hit-tested first: popovers, menus, dialogs and toasts. React state and context flow through it
 * as usual.
 */
export function Portal({ children }: { children?: ReactNode }): ReactNode {
  const overlay = useContext(OverlayContext);
  if (overlay === null) throw new Error('<Portal> must be rendered inside a root created by createRoot');
  return createOverlayPortal(children, overlay);
}
