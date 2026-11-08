import { memo } from 'react';
import { Text, View } from 'godot-react-ui';

/** Where a 3D node is on the screen, in the root's own pixels, and whether it is in front of the camera. */
export interface Anchor {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

/** The label's box. Its size is fixed so that its position can be worked out from the anchor alone. */
export const LABEL_WIDTH = 96;
export const LABEL_HEIGHT = 28;
/** The space between the label's bottom edge and the anchored point: the label floats above the node. */
export const LABEL_GAP = 12;
/** The label's colour (`bg-amber-500`), for the verifier's raster probe. */
export const LABEL_COLOR = '#f59e0b';

/**
 * What the scene shows and what to try, in the screen-space root over the 3D view: plain text with no pointer events, so a press on it
 * reaches the panel or the scene behind. It has no props, so it is not rendered again when the label moves every frame. The panel itself has
 * no room for a caption (its card nearly fills it, and the verifier reads its pixels), and the label's own text is fixed.
 */
const WorldCaption = memo(function WorldCaption() {
  return (
    <View testID="world-caption" className="gap-1 p-4">
      <Text className="text-sm text-slate-900">A React panel in a 3D scene</Text>
      <Text className="text-xs text-slate-700">
        The white card is a React page drawn into a SubViewport and shown as a texture on a tilted quad. The camera turns your pointer into a ray, finds where it meets the quad and gives the panel an ordinary pointer event. Try Add 1, Reset and the name field.
      </Text>
      <Text className="text-xs text-slate-700">
        The amber label follows the blue sphere: every frame the scene projects the sphere with Camera3D.unprojectPosition and places the label above that point.
      </Text>
      <Text className="text-xs text-slate-500">
        Known limits: nothing in front of the quad blocks a press, the label is not kept inside the window, and typing through the quad was checked with a keyboard, not an on-screen one.
      </Text>
    </View>
  );
});

/**
 * A 2D label that follows a moving 3D node (plan 3.22, anchored 2D UI). The owner projects the node every frame
 * with `Camera3D.unprojectPosition()` and renders this with the result; the label is one `absolute` element of the
 * main screen-space root, centred over the point and `LABEL_GAP` pixels above it. A node behind the camera projects
 * to a mirrored point, so the owner passes `visible: false` for it (`isPositionBehind`) and the label is not shown.
 *
 * The whole root is `pointer-events-none`: the label never takes a click from the panel on the quad or the game.
 */
export function AnchoredLabel({ anchor, title }: { anchor: Anchor; title: string }) {
  return (
    <View testID="anchor-root" className="w-full h-full pointer-events-none">
      <WorldCaption />
      <View
        testID="anchor-label"
        className={`absolute rounded-full bg-amber-500 items-center justify-center${anchor.visible ? '' : ' hidden'}`}
        style={{
          width: LABEL_WIDTH, height: LABEL_HEIGHT, left: anchor.x - LABEL_WIDTH / 2, top: anchor.y - LABEL_GAP - LABEL_HEIGHT,
        }}
      >
        <Text testID="anchor-title" className="text-xs text-slate-900">{title}</Text>
      </View>
    </View>
  );
}
