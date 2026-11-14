import { useState, type ReactNode } from 'react';
import { Button, Image, Text, View, type ImageFit } from 'godot-react-ui';
import {
  BLANK, BORDER_IMAGE_WIDTH, FITS, FIT_BOX, LARGE, LATE, PANEL, PANEL_MARGIN, PROPORTIONAL_WIDTH, QUADRANTS, SCROLLER_HEIGHT, SHOWN, SLICE_BOX, SMALL_BOX,
  VIOLET_500_HEX, WIDE,
} from './image-data';
import { LAB_CARD_CLASS, LabCase, LabGrid, LabIntro } from './lab-parts';

/**
 * The `Image` primitive: pictures the demo's owner registers on the root (`demo-images.ts`, from `image-data.ts`) placed by
 * `object-fit`, cut from an atlas, flipped, tinted, nine-sliced, sized from the picture, arriving late, and inside a scroll container.
 * Each picture is flat colours, so the `images` verifier section (`verify-images.ts`) reads where it landed from the pixels. The page
 * fits the verifier's portrait window (600 x 900) without scrolling.
 */

/** One example: the image, and a label under it naming what it shows. */
function Example({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="items-start gap-1">
      {children}
      <Text className="text-xs text-slate-500">{label}</Text>
    </View>
  );
}

const FIT_LABELS: Readonly<Record<(typeof FITS)[number], string>> = {
  fill: 'fill', contain: 'contain', cover: 'cover', none: 'none', 'scale-down': 'scale-down',
};

/** An image whose `source` arrives in a later commit than the one that mounted it, as a picture fetched later is named. */
function LateSource() {
  const [source, setSource] = useState<string | undefined>(undefined);
  return (
    <View className="flex-row items-start gap-2">
      <View className="h-[66px] w-[66px] items-start rounded border border-slate-300">
        <Image testID="image-late-source" source={source} />
      </View>
      <Button testID="image-late-source-button" className="rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white" onClick={() => setSource(QUADRANTS.id)}>
        Name it
      </Button>
    </View>
  );
}

export function ImageLab() {
  return (
    <View testID="image-lab" className="gap-3 p-4">
      <LabIntro
        title="Images"
        paragraphs={['Textures the root registered, drawn as replaced elements: each one is flat colours, so you can see where it landed.']}
      />
      <LabGrid>
        <LabCase testID="image-fits" className={LAB_CARD_CLASS} title="Fit" caption="One 2:1 picture in square boxes, placed as CSS object-fit places it.">
          <View className="flex-row flex-wrap gap-2">
            {FITS.map(fit => (
              <Example key={fit} label={FIT_LABELS[fit]}>
                <Image testID={`image-fit-${fit}`} source={WIDE.id} fit={fit satisfies ImageFit} className="bg-slate-100" style={{ width: FIT_BOX, height: FIT_BOX }} />
              </Example>
            ))}
          </View>
        </LabCase>
        <LabCase testID="image-regions" className={LAB_CARD_CLASS} title="Atlas, flip, tint, nine-slice" caption="A quadrant of a picture, mirror images, a tint, a stretched frame and the same picture as a border image.">
          <View className="flex-row flex-wrap items-start gap-2">
            <Example label="region">
              <Image testID="image-region" source={QUADRANTS.id} sourceRect={{ x: 32, y: 0, width: 32, height: 32 }} style={{ width: SMALL_BOX, height: SMALL_BOX }} />
            </Example>
            <Example label="flip x">
              <Image testID="image-flip-x" source={QUADRANTS.id} flipX style={{ width: SMALL_BOX, height: SMALL_BOX }} />
            </Example>
            <Example label="flip y">
              <Image testID="image-flip-y" source={QUADRANTS.id} flipY style={{ width: SMALL_BOX, height: SMALL_BOX }} />
            </Example>
            <Example label="tint">
              <Image testID="image-tint" source={BLANK.id} tintColor={VIOLET_500_HEX} style={{ width: SMALL_BOX, height: SMALL_BOX }} />
            </Example>
            <Example label="nine-slice">
              <Image
                testID="image-slice" source={PANEL.id}
                slice={{ top: PANEL_MARGIN, right: PANEL_MARGIN, bottom: PANEL_MARGIN, left: PANEL_MARGIN }}
                style={{ width: SLICE_BOX.width, height: SLICE_BOX.height }}
              />
            </Example>
            <Example label="border-image">
              <View
                testID="image-border" className="border-red-500"
                style={{
                  width: SLICE_BOX.width, height: SLICE_BOX.height, borderWidth: BORDER_IMAGE_WIDTH,
                  borderImageSource: `url(${PANEL.id})`, borderImageSlice: `${PANEL_MARGIN} fill`,
                }}
              />
            </Example>
          </View>
        </LabCase>
        <LabCase testID="image-sizes" className={LAB_CARD_CLASS} title="Size from the picture" caption="No size takes the picture's; a width alone keeps its proportions; a picture can come later.">
          <View className="flex-row flex-wrap items-start gap-2">
            <Example label="no size">
              <Image testID="image-natural" source={QUADRANTS.id} />
            </Example>
            <Example label="width only">
              <Image testID="image-proportional" source={WIDE.id} style={{ width: PROPORTIONAL_WIDTH }} />
            </Example>
            <Example label="registered late">
              <View className="h-[66px] w-[66px] items-start rounded border border-slate-300">
                <Image testID="image-late" source={LATE.id} />
              </View>
            </Example>
            <Example label="named late">
              <LateSource />
            </Example>
          </View>
        </LabCase>
        <LabCase testID="image-scroll" className={LAB_CARD_CLASS} title="In a scroll container" caption="A 528 px picture shown smaller: only its box counts, so nothing scrolls.">
          <View testID="image-scroller" className="overflow-y-auto rounded border border-slate-200" style={{ height: SCROLLER_HEIGHT }}>
            <View className="items-start gap-1 p-2">
              <Image testID="image-large" source={LARGE.id} fit="contain" style={{ width: SHOWN, height: SHOWN }} />
            </View>
          </View>
        </LabCase>
      </LabGrid>
    </View>
  );
}
