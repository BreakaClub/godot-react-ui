import { Color, Image as GodotImage, ImageTexture, Rect2I, type ReactUiRoot } from 'godot';
import { registerTexture } from '../../src';
import { LAB_PICTURES, LATE, type Picture } from './image-data';

const LEVELS = 255;

/** A picture of the image lab as a texture: an image of its size, each region filled in its colour. */
function textureOf(picture: Picture): ImageTexture {
  const image = GodotImage.createEmpty(picture.width, picture.height, false, GodotImage.Format.FormatRgba8);
  for (const region of picture.regions) {
    const [r, g, b] = region.colour;
    image.fillRect(new Rect2I(region.x, region.y, region.width, region.height), new Color(r / LEVELS, g / LEVELS, b / LEVELS, 1));
  }
  return ImageTexture.createFromImage(image);
}

/**
 * Register the image lab's pictures with a root (`image-data.ts`), as the owner registers the demo's fonts: the library draws an
 * `Image` only once its `source` is registered on the root it is in.
 */
export function registerDemoImages(root: ReactUiRoot): void {
  for (const picture of LAB_PICTURES) registerTexture(root, picture.id, textureOf(picture));
}

/** Register the picture the lab's late image names, as a picture fetched after the UI that shows it mounted would be. */
export function registerLateImage(root: ReactUiRoot): void {
  registerTexture(root, LATE.id, textureOf(LATE));
}

/** Take it away again, so the late image has no picture the next time the lab is shown. */
export function unregisterLateImage(root: ReactUiRoot): void {
  root.unregisterTexture(LATE.id);
}
