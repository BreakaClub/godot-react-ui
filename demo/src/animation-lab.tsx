import { useState, useSyncExternalStore } from 'react';
import { Button, Text, View, defineKeyframes, type Animation, type AnimationPlayState } from 'godot-react-ui';
import { LAB_CARD_CLASS, LabCase, LabGrid, LabIntro, LabLimit } from './lab-parts';

/**
 * Keyframe animations, conic gradients and rounded clips, and the composition they were added for: a light that runs round a rounded
 * button's border with no JavaScript timer. The light is a square larger than the button, painted with a conic gradient that is bright in
 * one narrow wedge, spun by a keyframe animation inside the button, which clips it to its rounded corners; a panel inset by the border's
 * width covers all of it but the ring.
 *
 * The verifiers read the parts by test id (`verify-animations.ts`, `verify-animations-web.mjs`) and pause the animations through
 * `setAnimationsPlaying` (or `godotReactAnimationLab.setPlaying` on the Web), which the Pause button also does.
 */

let playing = true;
const listeners = new Set<() => void>();
/** Presses the stripes inside the rounded clip took: a press outside the curve must not be one. */
let stripePresses = 0;

export function clipStripePresses(): number {
  return stripePresses;
}

export function setAnimationsPlaying(value: boolean): void {
  playing = value;
  for (const listener of listeners) listener();
}

Reflect.set(globalThis, 'godotReactAnimationLab', { setPlaying: setAnimationsPlaying });

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The glimmer button's size, its border's width, and the light's square: wider than the button's diagonal, so it covers the button at any turn. */
export const GLIMMER = { width: 240, height: 56, border: 3, radius: 16, light: 260 } as const;
/** How long the light takes to go round. */
export const GLIMMER_TURN_MS = 3000;
/** The glow's colours and how long one way takes. */
const GLOW_MS = 1600;
/** The steps animation: four quarter turns a second. */
const STEPS_MS = 1000;
const STEP_COUNT = 4;

const glow = defineKeyframes('glow', {
  from: { backgroundColor: '#6366f1', boxShadow: '0 0 0px 0px #6366f100' },
  to: { backgroundColor: '#ec4899', boxShadow: '0 0 18px 4px #ec4899aa' },
});
const turn = defineKeyframes('turn', { to: { transform: 'rotate(360deg)' } });

function animation(base: Omit<Animation, 'playState'>, playState: AnimationPlayState): Animation {
  return { ...base, playState };
}

function GlimmerButton({ playState, testID }: { playState: AnimationPlayState; testID: string }) {
  const { width, height, border, radius, light } = GLIMMER;
  return (
    <View
      testID={testID}
      className="relative overflow-hidden bg-slate-700"
      style={{ width, height, borderRadius: radius }}
    >
      <View
        testID={`${testID}-light`}
        className="absolute bg-conic from-transparent from-70% via-sky-300 via-90% to-transparent"
        style={{
          left: (width - light) / 2,
          top: (height - light) / 2,
          width: light,
          height: light,
          animation: animation({ keyframes: turn, durationMs: GLIMMER_TURN_MS, easing: 'linear', iterations: 'infinite' }, playState),
        }}
      />
      <View
        testID={`${testID}-panel`}
        className="absolute items-center justify-center bg-slate-900"
        style={{ left: border, top: border, right: border, bottom: border, borderRadius: radius - border }}
      >
        <Text className="text-base text-white">Play</Text>
      </View>
    </View>
  );
}

export function AnimationLab() {
  const running = useSyncExternalStore(subscribe, () => playing);
  const playState: AnimationPlayState = running ? 'running' : 'paused';
  const [mounted, setMounted] = useState(true);
  return (
    <View testID="animation-lab" className="gap-4">
      <LabIntro
        title="Keyframe animations"
        paragraphs={[
          'Animations declared as keyframes run on the native clock through Stylo, as transitions do: no JavaScript timer, no React render, and a transform or opacity animation moves one canvas item a frame.',
          'They pause while the root is outside the scene tree, stop when the element unmounts, and cost nothing while none runs (a paused one included).',
        ]}
      />
      <View className="flex-row flex-wrap items-center gap-2">
        <Button
          testID="animation-toggle"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 active:bg-indigo-800"
          onClick={() => setAnimationsPlaying(!running)}
        >
          {running ? 'Pause' : 'Play'}
        </Button>
        <Button
          testID="animation-mount-toggle"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          onClick={() => setMounted(value => !value)}
        >
          {mounted ? 'Remove the animated cards' : 'Put them back'}
        </Button>
      </View>
      <LabCase
        title="A light round a rounded border"
        caption="A rounded button with overflow-hidden, a spinning bg-conic square inside it and a panel inset by the border's width. Only the ring shows the light."
        expected="A bright wedge runs round the border once every three seconds; the corners stay round."
        className="w-full"
      >
        {/* Centred: the turning light reaches past the button's corners (clipped), and it must not reach the window's edge on a phone. */}
        <View className="flex-row justify-center">
          <GlimmerButton playState={playState} testID="glimmer" />
        </View>
      </LabCase>
      <LabCase
        title="Rounded clipping"
        caption="overflow-hidden rounded-3xl clips the stripes inside to the rounded padding box, for drawing and for the pointer."
        expected="The stripes stop at the curve; a press in a corner, outside the curve, reaches the card and not the stripe."
        className="w-full"
      >
        <View testID="clip-card" className="h-24 w-60 overflow-hidden rounded-3xl border-4 border-slate-800 bg-white">
          <View testID="clip-stripes" onPointerDown={() => { stripePresses += 1; }} className="h-full w-full bg-[linear-gradient(90deg,#f97316_0%,#f97316_25%,#10b981_25%,#10b981_50%,#3b82f6_50%,#3b82f6_75%,#a855f7_75%,#a855f7_100%)]" />
        </View>
        <LabLimit>A rounded clip inside another rounded clip or a filter, or one that holds a filter, is drawn as its rectangle (Godot's canvas groups do not nest); the pointer is still clipped round.</LabLimit>
      </LabCase>
      {mounted ? (
        <LabGrid testID="animation-cards">
          <LabCase title="Tailwind's animate utilities" caption="animate-spin, animate-ping, animate-pulse and animate-bounce, with Tailwind's keyframes and timings." className={LAB_CARD_CLASS}>
            <View className="h-16 flex-row items-center justify-around">
              <View testID="anim-spin" className="size-8 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
              <View className="relative size-4">
                <View testID="anim-ping" className="absolute inset-0 rounded-full bg-sky-400 opacity-75 animate-ping" />
                <View className="absolute inset-0 rounded-full bg-sky-500" />
              </View>
              <View testID="anim-pulse" className="h-4 w-16 rounded bg-slate-300 animate-pulse" />
              <View testID="anim-bounce" className="size-6 rounded-md bg-amber-400 animate-bounce" />
            </View>
            <Text className="text-xs text-slate-500">These run whether or not the lab is paused: their play state is the utilities' own.</Text>
          </LabCase>
          <LabCase title="Your own keyframes" caption="defineKeyframes with a colour and a box shadow, alternating; and steps(4) of a quarter turn each." className={LAB_CARD_CLASS}>
            <View className="h-16 flex-row items-center justify-around">
              <View
                testID="anim-glow"
                className="h-8 w-20 rounded-lg"
                style={{ animation: animation({ keyframes: glow, durationMs: GLOW_MS, easing: 'ease-in-out', iterations: 'infinite', direction: 'alternate' }, playState) }}
              />
              <View
                testID="anim-steps"
                className="size-8 rounded-sm bg-emerald-500"
                style={{ animation: animation({ keyframes: turn, durationMs: STEPS_MS, easing: { steps: STEP_COUNT }, iterations: 'infinite' }, playState) }}
              />
            </View>
          </LabCase>
        </LabGrid>
      ) : null}
    </View>
  );
}

/** What the `animations-cost` section draws: `count` cards of `CARD_SIZE`, each clipping a striped child, rounded or square, with a spinning square or not. */
export interface AnimationCostProps {
  count: number;
  rounded: boolean;
  spinning: boolean;
}

export const COST_CARD = { width: 200, height: 120, radius: 24 } as const;
/** The cards are laid in rows of this many. */
const COST_COLUMNS = 5;

export function AnimationCostScene({ count, rounded, spinning }: AnimationCostProps) {
  return (
    <View testID="animation-cost" className="absolute inset-0 flex-row flex-wrap content-start bg-slate-100" style={{ width: COST_CARD.width * COST_COLUMNS }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          testID={`cost-card-${index}`}
          className="overflow-hidden bg-white"
          style={{ width: COST_CARD.width, height: COST_CARD.height, borderRadius: rounded ? COST_CARD.radius : 0 }}
        >
          <View className="h-full w-full bg-[linear-gradient(90deg,#f97316_0%,#f97316_50%,#3b82f6_50%,#3b82f6_100%)]" />
          {spinning ? (
            <View
              testID={`cost-spin-${index}`}
              className="absolute size-16 bg-emerald-500"
              style={{ left: COST_CARD.width / 2 - 32, top: COST_CARD.height / 2 - 32, animation: { keyframes: turn, durationMs: GLIMMER_TURN_MS, easing: 'linear', iterations: 'infinite' } }}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}
