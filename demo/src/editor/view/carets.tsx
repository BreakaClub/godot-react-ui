import { useEffect, useRef, useState } from 'react';
import { View } from 'godot-react-ui';
import { THEME } from '../theme';

/** How long the caret is shown, and hidden, in a blink. */
export const CARET_BLINK_MS = 530;
const CARET_WIDTH_PX = 2;

export interface CaretRect {
  readonly left: number;
  readonly top: number;
  readonly height: number;
  readonly main: boolean;
}

export interface CaretsProps {
  readonly carets: readonly CaretRect[];
  /** The editor has the keyboard focus. Without it there is no caret and no timer. */
  readonly focused: boolean;
  /** Changes when the carets moved or the text changed: a caret that has just moved is shown at once and blinks from there. */
  readonly restart: string;
}

/**
 * The carets, blinking together. The blink is the state of this component alone: a tick re-renders the carets and nothing else,
 * and while the editor is not focused there is no timer at all, so an idle editor asks for no frames.
 */
export function Carets({ carets, focused, restart }: CaretsProps) {
  const [shown, setShown] = useState(true);
  // What `shown` holds, to set it only to something else: setting a state to the value it holds still renders the component again.
  const shownNow = useRef(true);
  useEffect(() => {
    const show = (visible: boolean): void => {
      if (shownNow.current === visible) return;
      shownNow.current = visible;
      setShown(visible);
    };
    show(true);
    if (!focused) return undefined;
    const timer = setInterval(() => show(!shownNow.current), CARET_BLINK_MS);
    return () => clearInterval(timer);
  }, [focused, restart]);
  if (!focused) return null;
  return (
    <>
      {carets.map((caret, index) => (
        <View
          key={index}
          testID={caret.main ? 'code-caret' : `code-caret-${index}`}
          className="absolute pointer-events-none"
          style={{ left: caret.left, top: caret.top, width: CARET_WIDTH_PX, height: caret.height, backgroundColor: THEME.caret, opacity: shown ? 1 : 0 }}
        />
      ))}
    </>
  );
}
