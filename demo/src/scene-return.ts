import { Button, CanvasLayer, Callable, Color, Control, GError, SceneTree, StyleBoxFlat } from 'godot';

/**
 * Change scene and leave a way back on screen (the navigator's `world` lab: a scene of its own that knows nothing of the navigator).
 *
 * The way back is a Godot `Button` on a `CanvasLayer` that is a child of the tree's root window, not of the scene, so it survives
 * the change and sits over whatever the new scene draws. It changes back to the scene that was current and frees itself. The scene
 * it opens is untouched: a verifier that starts that scene directly (`--scene`, `?scene=`) never sees the button.
 */

/** Above any layer a scene of the demo uses. */
const BACK_LAYER = 128;
const MARGIN = 16;
const BUTTON_WIDTH = 132;
const BUTTON_HEIGHT = 36;
const CORNER_RADIUS = BUTTON_HEIGHT / 2;
const BORDER_WIDTH = 2;
/** The text and the slate-900 pill the navigator's own `Labs` bar uses, and the library's focus ring (`FOCUS_RING_COLOR`, native/lib.rs). */
const PILL = new Color(0.059, 0.09, 0.165, 0.9);
const PILL_HOVER = new Color(0.118, 0.161, 0.231, 0.95);
const PILL_PRESSED = new Color(0.2, 0.255, 0.333, 1);
const FOCUS_RING = new Color(0.49, 0.66, 1.0);
const BACK_LABEL = 'Back to the labs';

function pill(fill: Color): StyleBoxFlat {
  const box = new StyleBoxFlat();
  box.bgColor = fill;
  box.setCornerRadiusAll(CORNER_RADIUS);
  box.contentMarginLeft = MARGIN;
  box.contentMarginRight = MARGIN;
  return box;
}

function ring(): StyleBoxFlat {
  const box = new StyleBoxFlat();
  box.drawCenter = false;
  box.borderColor = FOCUS_RING;
  box.setBorderWidthAll(BORDER_WIDTH);
  box.setCornerRadiusAll(CORNER_RADIUS);
  return box;
}

/** Change to the scene file `scene` and show the way back to the scene file `back` in its bottom left corner. */
export function openSceneWithBack(tree: SceneTree, scene: string, back: string): void {
  const root = tree.root;
  if (root === null) throw new Error('The scene tree has no root window');
  const result = tree.changeSceneToFile(scene);
  if (result !== GError.Ok) throw new Error(`Cannot open ${scene}: error ${String(result)}`);

  const layer = new CanvasLayer();
  layer.setName('SceneBack');
  layer.layer = BACK_LAYER;
  const button = new Button();
  button.text = BACK_LABEL;
  button.anchorLeft = 0;
  button.anchorRight = 0;
  button.anchorTop = 1;
  button.anchorBottom = 1;
  button.offsetLeft = MARGIN;
  button.offsetRight = MARGIN + BUTTON_WIDTH;
  button.offsetTop = -MARGIN - BUTTON_HEIGHT;
  button.offsetBottom = -MARGIN;
  button.addThemeStyleboxOverride('normal', pill(PILL));
  button.addThemeStyleboxOverride('hover', pill(PILL_HOVER));
  button.addThemeStyleboxOverride('pressed', pill(PILL_PRESSED));
  button.addThemeStyleboxOverride('focus', ring());
  for (const name of ['font_color', 'font_hover_color', 'font_pressed_color', 'font_focus_color']) {
    button.addThemeColorOverride(name, Color.WHITE);
  }
  button.mouseDefaultCursorShape = Control.CursorShape.CursorPointingHand;
  button.pressed.connect(Callable.create(() => {
    const backResult = tree.changeSceneToFile(back);
    if (backResult !== GError.Ok) throw new Error(`Cannot return to ${back}: error ${String(backResult)}`);
    layer.queueFree();
  }));
  layer.addChild(button);
  root.addChild(layer);
}
