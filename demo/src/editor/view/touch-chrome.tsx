import { Text, View, type UIPointerEvent } from 'godot-react-ui';
import {
  HANDLE_BALL_RADIUS_PX, HANDLE_COLOR, HANDLE_RING_COLOR, HANDLE_RING_WIDTH_PX, HANDLE_STEM_WIDTH_PX, HANDLE_TOUCH_TARGET_PX, MENU_BACKGROUND,
  MENU_BORDER, MENU_BORDER_WIDTH_PX, MENU_FONT_SIZE_PX, MENU_LABEL, MENU_RADIUS_PX,
} from '../../../../src/touch-selection';
import { MENU_LABELS, type Edge, type MenuAction, type MenuPlacement } from '../touch-selection';

/**
 * The handles and the edit menu of a touch selection in the code editor (plan D71), drawn from the numbers of the root's own
 * (`src/touch-selection.ts`, `native/touch_selection.rs`): the editor's selection is CodeMirror's, so the root cannot draw them. They are
 * children of the scrolling content, so they scroll with the text and the scroller clips them; a press on either is prevented, so it
 * neither pans the page nor takes the keyboard from the editor's input.
 */

export type HandleEnd = 'start' | 'end';

export interface SelectionHandleProps {
  readonly end: HandleEnd;
  /** Where the selection's end is, in the content's frame. */
  readonly edge: Edge;
  readonly onGrab: (end: HandleEnd, event: UIPointerEvent) => void;
  readonly onDrag: (event: UIPointerEvent) => void;
  readonly onRelease: (event: UIPointerEvent) => void;
}

/** One handle: a stem along the selection's edge, a ball past its end (above the first line, below the last) and a 44 px square to grab it by. */
export function SelectionHandle({ end, edge, onGrab, onDrag, onRelease }: SelectionHandleProps) {
  const ballY = end === 'start' ? edge.top - HANDLE_BALL_RADIUS_PX : edge.bottom + HANDLE_BALL_RADIUS_PX;
  return (
    <>
      <View
        testID={`code-handle-${end}-stem`}
        className="absolute pointer-events-none"
        style={{ left: edge.x - HANDLE_STEM_WIDTH_PX / 2, top: edge.top, width: HANDLE_STEM_WIDTH_PX, height: edge.bottom - edge.top, backgroundColor: HANDLE_COLOR }}
      />
      <View
        testID={`code-handle-${end}`}
        className="absolute"
        style={{ left: edge.x - HANDLE_TOUCH_TARGET_PX / 2, top: ballY - HANDLE_TOUCH_TARGET_PX / 2, width: HANDLE_TOUCH_TARGET_PX, height: HANDLE_TOUCH_TARGET_PX }}
        onPointerDown={event => {
          if (event.pointerType !== 'touch') return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          onGrab(end, event);
        }}
        onClick={event => { event.stopPropagation(); }}
        onPointerMove={event => { if (event.pointerType === 'touch') onDrag(event); }}
        onPointerUp={event => { if (event.pointerType === 'touch') onRelease(event); }}
        onPointerCancel={event => { if (event.pointerType === 'touch') onRelease(event); }}
      >
        <View
          testID={`code-handle-${end}-ball`}
          className="absolute pointer-events-none rounded-full"
          style={{
            left: HANDLE_TOUCH_TARGET_PX / 2 - HANDLE_BALL_RADIUS_PX, top: HANDLE_TOUCH_TARGET_PX / 2 - HANDLE_BALL_RADIUS_PX,
            width: 2 * HANDLE_BALL_RADIUS_PX, height: 2 * HANDLE_BALL_RADIUS_PX, backgroundColor: HANDLE_COLOR,
            borderWidth: HANDLE_RING_WIDTH_PX, borderColor: HANDLE_RING_COLOR,
          }}
        />
      </View>
    </>
  );
}

export interface SelectionMenuProps {
  readonly placement: MenuPlacement;
  readonly onAction: (action: MenuAction) => void;
}

/** The menu: a dark bar of segments, each a label. A press on a segment is prevented (the editor keeps its focus) and its click acts. */
export function SelectionMenu({ placement, onAction }: SelectionMenuProps) {
  const { box, items } = placement;
  return (
    <View
      testID="code-touch-menu"
      className="absolute flex-row overflow-hidden shadow-lg"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height, backgroundColor: MENU_BACKGROUND, borderRadius: MENU_RADIUS_PX, borderWidth: MENU_BORDER_WIDTH_PX, borderColor: MENU_BORDER }}
    >
      {items.map(({ action, box: item }, index) => (
        <View
          key={action}
          testID={`code-touch-menu-${action}`}
          className={`items-center justify-center active:bg-slate-700 ${index > 0 ? 'border-l border-slate-600' : ''}`}
          style={{ width: item.width, height: item.height }}
          onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }}
          onClick={event => { event.stopPropagation(); onAction(action); }}
        >
          <Text className="pointer-events-none select-none" style={{ color: MENU_LABEL, fontSize: MENU_FONT_SIZE_PX }}>{MENU_LABELS[action]}</Text>
        </View>
      ))}
    </View>
  );
}
