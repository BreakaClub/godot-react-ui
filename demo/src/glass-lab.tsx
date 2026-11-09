import { useState } from 'react';
import { Button, Portal, ScrollView, Text, TextInput, View, useRootSize } from 'godot-react-ui';
import { BASE_COLOUR, BLOBS, CARDS, DUAL_DECOR, GLASS, ROWS, SEARCH_PLACEHOLDER, STACK_DECOR, STACK_HEIGHT, TILES, blobRect, glassLayout } from './glass-data';

/** The blobs' test ids: they bleed past the window by design, clipped by the background that holds them. */
export const GLASS_BLOB_IDS = BLOBS.map((_, index) => `glass-blob-${index}`);

/**
 * The crisp circles behind the stacked and the dual panels, in CSS pixels from their panel's left: the last one ends 460 px in, so in a window
 * narrower than that (a phone) it reaches past the page's edge, where the scroll view clips it. They have ids so a check of what runs off a
 * phone's edge can name them as it names the blobs.
 */
export const GLASS_DECOR_IDS = [
  ...STACK_DECOR.map((_, index) => `glass-stack-decor-${index}`),
  ...DUAL_DECOR.map((_, index) => `glass-dual-decor-${index}`),
];

/**
 * Frosted glass as a product developer would write it (plan Phase V1 showcase, `docs/tracks/filters.md`): a colourful
 * background, a glass bar fixed over a scrolling page, glass cards with a button that has a `hover:` state, two glass panels
 * overlapping, and a sheet over a `backdrop-blur-sm` scrim in a `Portal`. Every glass element uses the utilities as written
 * for a browser (`backdrop-blur-xl backdrop-saturate-150 bg-white/20 border border-white/30`).
 *
 * The `glass` verifier section captures it and `scripts/glass-reference.mjs` renders the same markup in Chrome.
 */

function Aurora({ width, height }: { width: number; height: number }) {
  return (
    <View testID="glass-aurora" className="absolute inset-0 overflow-hidden" style={{ backgroundColor: BASE_COLOUR }}>
      {BLOBS.map((blob, index) => {
        const { left, top, size } = blobRect(blob, width, height);
        return (
          <View
            key={blob.colour}
            testID={`glass-blob-${index}`}
            className="absolute rounded-full blur-3xl"
            style={{ left, top, width: size, height: size, backgroundColor: blob.colour }}
          />
        );
      })}
    </View>
  );
}

function TopBar({ wide, onSignIn }: { wide: boolean; onSignIn: () => void }) {
  return (
    <View
      testID="glass-bar"
      className={`fixed inset-x-3 top-3 z-20 h-14 flex-row items-center justify-between rounded-2xl px-4 ${GLASS}`}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-6 w-6 rounded-full bg-white" />
        <Text testID="glass-brand" className="text-lg text-white">Aurora</Text>
      </View>
      {wide ? (
        <View testID="glass-links" className="flex-row gap-8">
          <Text className="text-sm text-white">Discover</Text>
          <Text className="text-sm text-white/80">Library</Text>
          <Text className="text-sm text-white/80">Radio</Text>
        </View>
      ) : null}
      <Button testID="glass-signin" className="rounded-full border border-white/30 bg-white/25 px-4 py-2 hover:bg-white/40" onClick={onSignIn}>
        <Text className="text-sm text-white">Sign in</Text>
      </Button>
    </View>
  );
}

function GlassCard({ index, width, onAdd }: { index: number; width: number; onAdd: () => void }) {
  const card = CARDS[index];
  if (card === undefined) throw new Error(`There is no glass card ${index}`);
  return (
    <View testID={`glass-card-${index}`} draggable className={`gap-3 rounded-3xl p-5 ${GLASS}`} style={{ width }}>
      <View className="h-10 w-10 rounded-full" style={{ backgroundColor: card.icon }} />
      <Text testID={`glass-card-title-${index}`} className="text-xl text-white">{card.title}</Text>
      <Text testID={`glass-card-body-${index}`} className="text-sm text-white">{card.body}</Text>
      <Button
        testID={`glass-card-button-${index}`}
        className="mt-2 self-start rounded-full border border-white/30 bg-white/20 px-5 py-2 hover:bg-white/40"
        onClick={onAdd}
      >
        <Text className="text-sm text-white">Add to playlist</Text>
      </Button>
    </View>
  );
}

/** Two glass panels, the second over the first's corner: it frosts what the first already frosted. */
function GlassStack() {
  return (
    <View testID="glass-stack" className="relative" style={{ height: STACK_HEIGHT }}>
      {STACK_DECOR.map((shape, index) => (
        <View key={shape.colour} testID={`glass-stack-decor-${index}`} className="absolute rounded-full" style={{ left: shape.left, top: shape.top, width: shape.size, height: shape.size, backgroundColor: shape.colour }} />
      ))}
      <View testID="glass-stack-back" className={`absolute left-0 top-0 h-44 w-3/4 gap-2 rounded-3xl p-5 ${GLASS}`}>
        <Text className="text-xl text-white">Weekend mixes</Text>
        <Text className="text-sm text-white/80">Twelve playlists that follow your pace, from a slow start to a long evening.</Text>
      </View>
      <View testID="glass-stack-front" className="absolute bottom-0 right-0 h-28 w-2/3 gap-1 rounded-3xl border border-white/30 bg-white/20 p-4 backdrop-blur-2xl backdrop-saturate-150">
        <Text className="text-sm text-white/80">Now playing</Text>
        <Text testID="glass-stack-title" className="text-lg text-white">Glasshouse</Text>
      </View>
    </View>
  );
}

/** The row of the dual card's decor the verifier reads: below its text, across two of the circles behind it. */
export const DUAL_ROW_PX = 145;

/** A glass card that also has a drop shadow, as `backdrop-blur-xl ... drop-shadow-lg` is written: both properties on one element. */
function GlassDual() {
  return (
    <View testID="glass-dual" className="relative" style={{ height: STACK_HEIGHT }}>
      {DUAL_DECOR.map((shape, index) => (
        <View key={shape.colour} testID={`glass-dual-decor-${index}`} className="absolute rounded-full" style={{ left: shape.left, top: shape.top, width: shape.size, height: shape.size, backgroundColor: shape.colour }} />
      ))}
      <View testID="glass-dual-card" className={`absolute left-0 top-6 h-44 w-3/4 gap-2 rounded-3xl p-5 drop-shadow-lg ${GLASS}`}>
        <Text testID="glass-dual-title" className="text-xl text-white">Frost and shadow</Text>
        <Text className="text-sm text-white/80">Blur and drop shadow on one card.</Text>
      </View>
    </View>
  );
}

/** A glass card with a text input in it: its caret, selection and placeholder must read on the glass. */
function GlassSearch() {
  return (
    <View testID="glass-search-card" className={`gap-3 rounded-3xl p-5 ${GLASS}`}>
      <Text className="text-xl text-white">Find a mix</Text>
      <TextInput
        testID="glass-search" placeholder={SEARCH_PLACEHOLDER}
        className="w-full rounded-xl border border-white/30 bg-black/20 px-4 py-3 text-base text-white placeholder-white/80 caret-white"
      />
    </View>
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  return (
    <Portal>
      <View testID="glass-scrim" className="fixed inset-0 z-50 items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
        <View testID="glass-sheet" className="w-full max-w-md gap-4 rounded-3xl border border-white/30 bg-white/20 p-6 backdrop-blur-2xl backdrop-saturate-150">
          <Text testID="glass-sheet-title" className="text-xl text-white">Add to playlist</Text>
          <Text className="text-sm text-white/80">Night drive will be saved to Weekend mixes and shared with the people you listen with.</Text>
          <View className="flex-row justify-end gap-3">
            <Button testID="glass-sheet-cancel" className="rounded-full border border-white/30 bg-white/20 px-5 py-2 hover:bg-white/40" onClick={onClose}>
              <Text className="text-sm text-white">Cancel</Text>
            </Button>
            <Button testID="glass-sheet-add" className="rounded-full bg-indigo-500 px-5 py-2 hover:bg-indigo-400" onClick={onClose}>
              <Text className="text-sm text-white">Add</Text>
            </Button>
          </View>
        </View>
      </View>
    </Portal>
  );
}

export function GlassLab() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { width, height } = useRootSize();
  const { wide, cardWidth } = glassLayout(width);
  const open = () => setSheetOpen(true);
  const close = () => setSheetOpen(false);
  return (
    <View testID="glass-root" className="absolute inset-0 overflow-hidden">
      <Aurora width={width} height={height} />
      <ScrollView testID="glass-scroll" className="absolute inset-0" contentClassName="gap-6 px-4 pb-10 pt-20">
        <View className="gap-1">
          <Text className="text-3xl text-white">Good evening, Maya</Text>
          <Text className="text-base text-white/80">Fresh mixes tuned to your week.</Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          {TILES.map((tile, index) => (
            <View key={tile.name} testID={`glass-tile-${index}`} className="h-28 w-28 justify-end rounded-2xl p-3" style={{ backgroundColor: tile.colour }}>
              <Text className="text-sm text-white">{tile.name}</Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap gap-4">
          {CARDS.map((card, index) => <GlassCard key={card.title} index={index} width={cardWidth} onAdd={open} />)}
        </View>
        <GlassStack />
        <GlassDual />
        <GlassSearch />
        <View className="gap-3">
          {ROWS.map(row => (
            <View key={row.name} className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-full" style={{ backgroundColor: row.colour }} />
              <View>
                <Text className="text-base text-white">{row.name}</Text>
                <Text className="text-sm text-white/80">{row.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <TopBar wide={wide} onSignIn={open} />
      {sheetOpen ? <Sheet onClose={close} /> : null}
    </View>
  );
}
