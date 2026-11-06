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
