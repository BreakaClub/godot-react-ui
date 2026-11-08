import { useState, type ReactNode } from 'react';
import { Button, Text, View, type Style } from 'godot-react-ui';
import { LabIntro, Readout } from './lab-parts';

export const MOTION_DURATION_MS = 600;
export const MOTION_BASE_FONT_SIZE = 14;
export const MOTION_LARGE_FONT_SIZE = 18;
const NARROW_WIDTH = '68%';
const FULL_WIDTH = '100%';
const PAINT_SWATCH_WIDTH = 72;
const PAINT_SWATCH_HEIGHT = 40;
const DIMMED_OPACITY = 0.45;

const SHORT_COPY = 'A native layout can make room for its content. The card below stays in the same flow.';
const LONG_COPY = 'A native layout can make room for its content, even while that content changes. Narrow the parent to wrap these words onto more lines, or change the copy before the transition finishes. The card below follows the current height, and the clipped button only receives input where it is visible.';

const heightTransition: NonNullable<Style['transition']> = {
  properties: ['height'],
  durationMs: MOTION_DURATION_MS,
  easing: 'ease-in-out',
};

const paintTransition: NonNullable<Style['transition']> = {
  properties: ['backgroundColor', 'opacity'],
  durationMs: MOTION_DURATION_MS,
  easing: 'ease-in-out',
};

const secondaryButton = 'rounded-lg border border-slate-200 bg-white text-slate-700 px-3 py-2 hover:bg-slate-100 active:bg-slate-200 focus:border-indigo-500 disabled:text-slate-400';

function AccordionContent({ longCopy, largeText }: { longCopy: boolean; largeText: boolean }) {
  const [clicks, setClicks] = useState(0);
  return (
    <View
      testID="motion-content"
      className="rounded-xl border border-indigo-200 bg-white p-4 gap-2 shrink-0"
      style={{ overflow: 'hidden' }}
    >
      <Text className="text-lg text-slate-900">Room to grow.</Text>
      <Text testID="motion-body" className="text-slate-600" style={{ fontSize: largeText ? MOTION_LARGE_FONT_SIZE : MOTION_BASE_FONT_SIZE }}>
        {longCopy ? LONG_COPY : SHORT_COPY}
      </Text>
      <View className="flex-row flex-wrap items-center gap-3">
        <Button
          testID="motion-inside-action"
          className="rounded-lg bg-indigo-50 text-indigo-700 px-3 py-2 border border-transparent hover:bg-indigo-100 focus:border-indigo-500"
          onClick={() => setClicks(value => value + 1)}
        >
          Try this action
        </Button>
        <Text testID="motion-inside-count" className="text-sm text-slate-500">Activated {clicks} {clicks === 1 ? 'time' : 'times'}</Text>
      </View>
    </View>
  );
}

/** A row of controls with the name of what they act on, so the five buttons are not one undifferentiated pile. */
function ControlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Text className="w-16 text-xs text-slate-500">{label}</Text>
      {children}
    </View>
  );
}

/**
 * The native height owns both visible clipping and the following sibling's
 * position. The inner card deliberately remains intrinsic-sized: partial ink
 * clipping inside motion-clip is the expected intermediate presentation, while
 * paint and input outside the clip are forbidden. No JS animation timer, sampled
 * pixel height, max-height approximation, or manual sibling offset participates.
 *
 * The page is also the playground's third tab, and `verify-motion.ts` and `verify-motion-web.mjs` run it in windows 800 and 900 px tall
 * with the panel open and click the buttons by their rectangles: the text above the panel is kept to two lines, and the longer explanation sits
 * under the card that follows the panel, so that the card stays in the window (`flow` asserts it) and the paint button is not pushed far down.
 */
export function MotionLab() {
  const [open, setOpen] = useState(false);
  const [longCopy, setLongCopy] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [painted, setPainted] = useState(false);

  return (
    <View testID="motion-lab" className="gap-2">
      <LabIntro
        title="Motion, in the flow."
        paragraphs={["The panel grows from 0 to its natural height (height: auto) and the card below follows, animated natively with no JavaScript timer."]}
      />

      <ControlRow label="Panel">
        <Button
          testID="motion-toggle"
          className="rounded-lg border border-transparent bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500 disabled:bg-slate-200 disabled:text-slate-400"
          disabled={!mounted}
          onClick={() => setOpen(value => !value)}
        >
          {open ? 'Collapse panel' : 'Expand panel'}
        </Button>
        <Button testID="motion-mount-toggle" className={secondaryButton} onClick={() => setMounted(value => !value)}>
          {mounted ? 'Remove panel' : 'Remount panel'}
        </Button>
      </ControlRow>

      <ControlRow label="Content">
        <Button testID="motion-copy-toggle" className={secondaryButton} onClick={() => setLongCopy(value => !value)}>
          {longCopy ? 'Shorter copy' : 'Longer copy'}
        </Button>
        <Button testID="motion-width-toggle" className={secondaryButton} onClick={() => setNarrow(value => !value)}>
          {narrow ? 'Full width' : 'Narrow width'}
        </Button>
        <Button testID="motion-font-toggle" className={secondaryButton} onClick={() => setLargeText(value => !value)}>
          {largeText ? 'Smaller text' : 'Larger text'}
        </Button>
      </ControlRow>
      <View testID="motion-width-owner" className="gap-3 shrink-0" style={{ width: narrow ? NARROW_WIDTH : FULL_WIDTH }}>
        {mounted && (
          <View
            testID="motion-clip"
            style={{
              height: open ? 'auto' : 0,
              minHeight: 0,
              flexShrink: 0,
              overflow: 'hidden',
              interpolateSize: 'allow-keywords',
              transition: heightTransition,
            }}
          >
            <AccordionContent longCopy={longCopy} largeText={largeText} />
          </View>
        )}
        <View testID="motion-following-sibling" className="rounded-xl border border-slate-200 bg-slate-100 p-4 gap-1 shrink-0">
          <Text className="text-base text-slate-700">The next card moves with the layout.</Text>
          <Text className="text-xs text-slate-500">Its position comes from ordinary document flow.</Text>
        </View>
      </View>

      {/* Under the card that follows the panel, so that nothing the text adds moves the panel or that card (the verifiers read both). */}
      <View className="gap-1">
        <Text className="text-sm text-slate-600">
          Press Expand panel, then again part-way: it reverses from where it is. Change the content while it moves and the height retargets instead of jumping. Every control works with a tap.
        </Text>
        <Readout
          label="Now" testID="motion-status"
          value={`${mounted ? 'Mounted' : 'Removed'} · ${narrow ? 'Narrow' : 'Full width'} · ${longCopy ? 'Long copy' : 'Short copy'}`}
        />
      </View>

      <View className="rounded-xl border border-slate-200 bg-white p-4 flex-row flex-wrap items-center gap-3">
        <View
          testID="motion-paint-swatch"
          className="rounded-lg shrink-0"
          style={{
            width: PAINT_SWATCH_WIDTH,
            height: PAINT_SWATCH_HEIGHT,
            backgroundColor: painted ? '#059669' : '#4f46e5',
            opacity: painted ? DIMMED_OPACITY : 1,
            transition: paintTransition,
          }}
        />
        <View className="flex-1 gap-1 min-w-[160px]">
          <Text className="text-base text-slate-700">Colour and opacity</Text>
          <Text className="text-xs text-slate-500">{`Press Change paint: the swatch turns green and dims over ${MOTION_DURATION_MS} ms, and nothing around it moves.`}</Text>
        </View>
        <Button testID="motion-paint-toggle" className={secondaryButton} onClick={() => setPainted(value => !value)}>Change paint</Button>
      </View>
    </View>
  );
}
