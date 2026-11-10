import { Engine, Image as GodotImage, Vector2, type Node, type Window } from 'godot';
import type { NativeSnapshotNode } from '../../src/native';
import {
  BLUE_500, EMERALD_500, FITS, FIT_BACKGROUND, FIT_BOX, GREEN_500, INDIGO_100, INDIGO_700, LARGE, LATE, ORANGE_500, PINK_500, PROPORTIONAL_WIDTH,
  QUADRANTS, RED_500, SHOWN, SKY_500, SLICE_BOX, SMALL_BOX, VIOLET_500, WIDE, YELLOW_500, type Rgb,
} from './image-data';
import type { LabName } from './labs';
import { assertionTally } from './verifier-input';
import { grab } from './verify-filters';
import { click } from './verify-text-input';

/**
 * The `images` section of the interaction verifier: the image lab (`image-lab.tsx`) laid out and drawn, read back from the
 * geometry the snapshot reports and from the pixels of the window. Every picture is flat colours (`image-data.ts`), so each
 * probe below is a point well inside one colour of where the picture should have landed, and the probes of each case tell its
 * placement apart from the others' (`cover` shows only the wide picture's middle band, a nine-slice keeps its frame 16 px wide where a
 * stretch would widen it). The same code runs natively and in the Web page (`godotReactVerifyImages`).
 */
export interface ImagesInspection {
  showLab(name: LabName): void;
  find(testID: string): NativeSnapshotNode | undefined;
  /** Register the picture `image-late` names (`demo-images.ts`), and take it away again. */
  registerLateImage(): void;
  unregisterLateImage(): void;
}

export type ImagesCapture = (name: string) => Promise<void>;

const FRAME_POLL_MS = 10;
const SETTLE_FRAMES = 6;
const LEVELS = 255;
/** How far a probe may be from its colour in 8-bit levels: a flat region read back through the texture filter and the render target. */
const SAME_LEVELS = 3;

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

async function frames(count: number): Promise<void> {
  const start = Engine.getProcessFrames();
  while (Engine.getProcessFrames() - start < count) await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
}

function windowOf(owner: Node): Window {
  const found = owner.getWindow();
  assert(found, 'The demo has its window');
  return found;
}

/** A render, and how many of its pixels a logical pixel is. */
interface Shot {
  readonly image: GodotImage;
  readonly ratio: number;
}

function shoot(owner: Node): Shot {
  return { image: grab(owner), ratio: windowOf(owner).contentScaleFactor };
}

function apart(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function name(colour: Rgb): string {
  return `rgb(${colour.join(', ')})`;
}

export async function verifyImages(owner: Node, api: ImagesInspection, capture: ImagesCapture): Promise<Record<string, unknown>> {
  const facts: Record<string, unknown> = {};
  api.unregisterLateImage();
  api.showLab('images');
  await frames(SETTLE_FRAMES);

  const node = (testID: string): NativeSnapshotNode => {
    const found = api.find(testID);
    assert(found, `The image lab has ${testID}`);
    return found;
  };
  const sized = (testID: string, width: number, height: number, why: string): NativeSnapshotNode => {
    const found = node(testID);
    assert(found.rect.width === width && found.rect.height === height, `${testID} is ${width} x ${height} (${why}): ${found.rect.width} x ${found.rect.height}`);
    return found;
  };
  const viewport = windowOf(owner).getVisibleRect().size;

  // ---- Geometry: a replaced element takes its authored size, the picture's, or the picture's proportions -------------------------------
  for (const fit of FITS) sized(`image-fit-${fit}`, FIT_BOX, FIT_BOX, 'its authored size, whatever the fit');
  for (const testID of ['image-region', 'image-flip-x', 'image-flip-y', 'image-tint']) sized(testID, SMALL_BOX, SMALL_BOX, 'its authored size');
  sized('image-slice', SLICE_BOX.width, SLICE_BOX.height, 'its authored size');
  sized('image-natural', QUADRANTS.width, QUADRANTS.height, "with no size of its own, the picture's");
  sized('image-proportional', PROPORTIONAL_WIDTH, PROPORTIONAL_WIDTH * WIDE.height / WIDE.width, "with a width alone, the picture's proportions");
  sized('image-late', 0, 0, 'with its picture not registered, no size, as an <img> that has not loaded');
  sized('image-late-source', 0, 0, 'with no source, no size');
  sized('image-large', SHOWN, SHOWN, 'its authored size, far smaller than its picture');
  for (const testID of ['image-fits', 'image-regions', 'image-sizes', 'image-scroll']) {
    const card = node(testID).rect;
    assert(card.x >= 0 && card.y >= 0 && card.x + card.width <= viewport.x && card.y + card.height <= viewport.y,
      `The ${testID} card is inside the ${viewport.x} x ${viewport.y} window, so its pixels can be read: ${JSON.stringify(card)}`);
  }

  // ---- The scroll container: an image counts with its box, not its picture's size ------------------------------------------------------
  const scroller = node('image-scroller');
  assert(scroller.scroll !== null, 'image-scroller is a scroll container');
  facts.scroller = scroller.scroll;
  assert(scroller.scroll.scrollHeight === scroller.scroll.clientHeight && scroller.scroll.scrollWidth === scroller.scroll.clientWidth,
    `A ${LARGE.width} px picture shown at ${SHOWN} px does not make its container scroll: ${JSON.stringify(scroller.scroll)}`);

  // ---- Pixels -------------------------------------------------------------------------------------------------------------------------------
  let shot = shoot(owner);
  const probes: { testID: string; at: readonly [number, number]; colour: Rgb; read: Rgb }[] = [];
  const probe = (testID: string, x: number, y: number, colour: Rgb, what: string): void => {
    const rect = node(testID).rect;
    const pixel = shot.image.getPixel(Math.floor((rect.x + x) * shot.ratio), Math.floor((rect.y + y) * shot.ratio));
    const read: Rgb = [Math.round(pixel.r * LEVELS), Math.round(pixel.g * LEVELS), Math.round(pixel.b * LEVELS)];
    probes.push({ testID, at: [x, y], colour, read });
    assert(apart(read, colour) <= SAME_LEVELS, `${testID} at (${x}, ${y}) is ${name(colour)}, ${what}: ${name(read)}`);
  };

  // `WIDE` (pink, with a sky band from x 32 to 96 of its 128) in an 80 x 80 box on a slate background.
  probe('image-fit-fill', 8, 40, PINK_500, 'the squeezed pink edge');
  probe('image-fit-fill', 40, 6, SKY_500, 'the band, from top to bottom: fill stretches the picture over the whole box');
  probe('image-fit-contain', 40, 6, FIT_BACKGROUND, 'the background above the letterboxed picture (80 x 40 at y 20)');
  probe('image-fit-contain', 8, 40, PINK_500, 'the pink edge');
  probe('image-fit-contain', 40, 40, SKY_500, 'the band');
  probe('image-fit-cover', 8, 40, SKY_500, 'the band: cover scales the picture to 160 x 80 and shows only its middle');
  probe('image-fit-cover', 72, 6, SKY_500, 'the band again, at the far corner');
  probe('image-fit-none', 40, 4, FIT_BACKGROUND, 'the background above the picture at its own size (64 px tall, at y 8)');
  probe('image-fit-none', 4, 40, PINK_500, 'the pink edge, cut at the box');
  probe('image-fit-none', 40, 40, SKY_500, 'the band');
  probe('image-fit-scale-down', 40, 6, FIT_BACKGROUND, 'the background: a picture larger than the box is scaled down as contain scales it');
  probe('image-fit-scale-down', 8, 40, PINK_500, 'the pink edge');

  // `QUADRANTS`: red top left, green top right, blue bottom left, yellow bottom right.
  probe('image-region', 24, 24, GREEN_500, 'the top right quadrant alone, the atlas region it names');
  probe('image-flip-x', 12, 12, GREEN_500, 'the top right quadrant, mirrored to the left');
  probe('image-flip-x', 36, 12, RED_500, 'the top left quadrant, mirrored to the right');
  probe('image-flip-y', 12, 12, BLUE_500, 'the bottom left quadrant, mirrored to the top');
  probe('image-flip-y', 12, 36, RED_500, 'the top left quadrant, mirrored to the bottom');
  probe('image-tint', 24, 24, VIOLET_500, 'white multiplied by the tint');
  probe('image-natural', 16, 16, RED_500, 'the top left quadrant at the picture\'s own size');
  probe('image-natural', 48, 48, YELLOW_500, 'the bottom right quadrant');
  probe('image-proportional', 16, 32, PINK_500, 'the pink edge');
  probe('image-proportional', 64, 32, SKY_500, 'the band');

  // `PANEL`: a 16 px indigo frame round a pale middle, nine-sliced over 160 x 64. A plain stretch would widen the frame to 53 px across and
  // 21 px down, which (32, 32) and (80, 20) would read as frame.
  probe('image-slice', 8, 32, INDIGO_700, 'the left frame');
  probe('image-slice', 32, 32, INDIGO_100, 'the middle, just inside the frame, which keeps its 16 px');
  probe('image-slice', 80, 20, INDIGO_100, 'the middle, just below the top frame');
  probe('image-slice', 80, 8, INDIGO_700, 'the top frame');
  probe('image-slice', 152, 56, INDIGO_700, 'the bottom right corner');
  probe('image-large', SHOWN / 2, SHOWN / 2, EMERALD_500, `the ${LARGE.width} px picture, shown at ${SHOWN} px`);
  await capture('images-01-lab');

  // ---- A picture that comes later -----------------------------------------------------------------------------------------------------------
  // Registered after the image mounted: the image takes the picture's size and draws it, with no commit.
  api.registerLateImage();
  await frames(SETTLE_FRAMES);
  sized('image-late', LATE.width, LATE.height, 'the size of the picture registered after it mounted');
  shot = shoot(owner);
  probe('image-late', LATE.width / 2, LATE.height / 2, ORANGE_500, 'the picture registered after the image mounted');
  // Named in a later commit (its `source` prop arrives after it mounted): the commit lays it out and draws it.
  const button = node('image-late-source-button').rect;
  await click(new Vector2((button.x + button.width / 2) * shot.ratio, (button.y + button.height / 2) * shot.ratio));
  await frames(SETTLE_FRAMES);
  sized('image-late-source', QUADRANTS.width, QUADRANTS.height, 'the size of the picture its new source names');
  shot = shoot(owner);
  probe('image-late-source', 16, 16, RED_500, 'the picture its source names, drawn by the commit that named it');
  await capture('images-02-late');
  // Unregistered, the picture goes and the image has no size again.
  api.unregisterLateImage();
  await frames(SETTLE_FRAMES);
  sized('image-late', 0, 0, 'no size again once its picture is unregistered');

  facts.probes = probes.length;
  facts.ratio = shot.ratio;
  return facts;
}
