/**
 * The pictures of the image lab (`image-lab.tsx`), as data: what each texture holds, which the demo's owner builds and registers
 * (`demo-images.ts`) and which the verifier reads back from the pixels (`verify-images.ts`). Each picture is made of flat colours,
 * so a pixel well inside a region is that region's colour whatever the filtering, and an edge says where the picture was placed.
 * No Godot import: the lab is compiled by the code editor too.
 */

export type Rgb = readonly [number, number, number];

/** Tailwind v3 colours the pictures are painted in. */
export const PINK_500: Rgb = [236, 72, 153];
export const SKY_500: Rgb = [14, 165, 233];
export const RED_500: Rgb = [239, 68, 68];
export const GREEN_500: Rgb = [34, 197, 94];
export const BLUE_500: Rgb = [59, 130, 246];
export const YELLOW_500: Rgb = [234, 179, 8];
export const INDIGO_700: Rgb = [67, 56, 202];
export const INDIGO_100: Rgb = [224, 231, 255];
export const EMERALD_500: Rgb = [16, 185, 129];
export const ORANGE_500: Rgb = [249, 115, 22];
export const WHITE: Rgb = [255, 255, 255];
/** The tint the tint example multiplies its white picture by, as a class would name it (`violet-500`). */
export const VIOLET_500: Rgb = [139, 92, 246];
export const VIOLET_500_HEX = '#8b5cf6';

/** A rectangle of a picture painted in one colour, in the texture's pixels. */
export interface PictureRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly colour: Rgb;
}

/** A texture the lab names: its id, its size in pixels, and the regions it is painted with, later ones over earlier ones. */
export interface Picture {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly regions: readonly PictureRegion[];
}

/**
 * Twice as wide as it is tall: pink, with a sky band down the middle half (`WIDE_BAND`). Each `object-fit` puts a different part of
 * it at the same place in a square box: `cover` shows only the band, `fill` squeezes the pink edges into the box's sides.
 */
export const WIDE_BAND = { from: 32, to: 96 } as const;
export const WIDE: Picture = {
  id: 'lab-wide', width: 128, height: 64,
  regions: [
    { x: 0, y: 0, width: 128, height: 64, colour: PINK_500 },
    { x: WIDE_BAND.from, y: 0, width: WIDE_BAND.to - WIDE_BAND.from, height: 64, colour: SKY_500 },
  ],
};

/** Four quadrants, so an atlas region and a flip show in which colour is where. */
export const QUADRANTS: Picture = {
  id: 'lab-quadrants', width: 64, height: 64,
  regions: [
    { x: 0, y: 0, width: 32, height: 32, colour: RED_500 },
    { x: 32, y: 0, width: 32, height: 32, colour: GREEN_500 },
    { x: 0, y: 32, width: 32, height: 32, colour: BLUE_500 },
    { x: 32, y: 32, width: 32, height: 32, colour: YELLOW_500 },
  ],
};

/** The margin of the nine-slice panel, in the picture's pixels and on screen. */
export const PANEL_MARGIN = 16;

/** A panel for a nine-slice: an indigo frame `PANEL_MARGIN` wide round a pale middle. */
export const PANEL: Picture = {
  id: 'lab-panel', width: 48, height: 48,
  regions: [
    { x: 0, y: 0, width: 48, height: 48, colour: INDIGO_700 },
    { x: PANEL_MARGIN, y: PANEL_MARGIN, width: 48 - 2 * PANEL_MARGIN, height: 48 - 2 * PANEL_MARGIN, colour: INDIGO_100 },
  ],
};

/** White, for the tint. */
export const BLANK: Picture = { id: 'lab-blank', width: 32, height: 32, regions: [{ x: 0, y: 0, width: 32, height: 32, colour: WHITE }] };

/** Much larger than the box it is shown in (`SHOWN`), which must not make its scroll container scroll. */
export const LARGE: Picture = { id: 'lab-large', width: 528, height: 528, regions: [{ x: 0, y: 0, width: 528, height: 528, colour: EMERALD_500 }] };

/** Registered only when the verifier asks (`registerLateImage`): an image that names it mounts with no picture and no size. */
export const LATE: Picture = { id: 'lab-late', width: 64, height: 64, regions: [{ x: 0, y: 0, width: 64, height: 64, colour: ORANGE_500 }] };

/** The pictures the owner registers when it mounts the root; `LATE` is not among them. */
export const LAB_PICTURES: readonly Picture[] = [WIDE, QUADRANTS, PANEL, BLANK, LARGE];

/** The `object-fit` examples: each shows `WIDE` in a square box of this side, on the box's own background. */
export const FIT_BOX = 80;
export const FIT_BACKGROUND: Rgb = [241, 245, 249];
export const FITS = ['fill', 'contain', 'cover', 'none', 'scale-down'] as const;

/** The side of the atlas, flip and tint examples' boxes. */
export const SMALL_BOX = 48;

/** The nine-slice example's box. */
export const SLICE_BOX = { width: 160, height: 64 } as const;

/** The border width of the border image example: the frame on screen is this wide, where the picture's slice (`PANEL_MARGIN`) is wider. */
export const BORDER_IMAGE_WIDTH = 8;

/** The scroll example: `LARGE` shown at `SHOWN` in a scroll container `SCROLLER_HEIGHT` tall, whose content fits in it. */
export const SHOWN = 96;
export const SCROLLER_HEIGHT = 128;

/** The width the proportions example sets on `WIDE`; its height comes from the picture's proportions. */
export const PROPORTIONAL_WIDTH = 128;
