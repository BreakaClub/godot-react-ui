// The `transforms` section of the Web interaction verifier (docs/tracks/transforms.md): the native section's reads of the transforms lab
// (demo/src/verify-transforms.ts), from the real canvas in Chrome at both device pixel ratios, with Chrome's own mouse and keyboard. It
// holds each shape's rectangle to the one Chrome reports for the same CSS (scripts/transform-golden.json, written by
// `node --import tsx scripts/transform-reference.mjs --golden`), drives hit testing, hover, scrolling, anchoring and a text field through
// the matrix, samples the transitions against Chrome's matrices, and captures every shape for the per-channel comparison
// (`node --import tsx scripts/transform-reference.mjs --diff --native=<capture directory>`, see the notes).
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const golden = JSON.parse(await readFile(resolve(import.meta.dirname, 'transform-golden.json'), 'utf8'));

const SETTLE_FRAMES = 4;
const RECT_TOLERANCE_PX = 0.75;
const MATRIX_TOLERANCE = 0.01;
const COLOR_TOLERANCE = 8;
const PROBE_INSET_PX = 3;
/** The label of a centred bar is as far from the bar's middle as the box round its turned text is off the box round the bar (rounding of two bounding boxes). */
const LABEL_CENTRE_TOLERANCE_PX = 2;
const OUTSIDE_PX = 6;
const WHEEL_TICK_PIXELS = 100;
const WHEEL_PAGE_DIVISOR = 8;
// Godot's Web display server turns a DOM wheel delta of `d` CSS pixels into `0.03 * d` wheel ticks (`MOUSE_WHEEL_PIXEL_FACTOR`,
// `DisplayServerWeb::_mouse_wheel_callback`), and a native `ScrollContainer` notch is one tick; docs/INTERACTION_PLAN.md D13.
const WHEEL_PIXEL_FACTOR = 0.03;
// A wheel tick moves the offset by a fraction of a page, so what the offset reaches is exact; this only absorbs the f32 arithmetic and
// the snapshot's rounding. It is well under the 0.51 px that three ticks of a list tilted 8 degrees differ from three ticks along the screen.
const SCROLL_TOLERANCE_PX = 0.25;
const TILT_DEGREES = 8;
// The lab's scroll and input cases clip content in a turned frame on purpose; the library says so once per element, as two console lines
// (the message and where it was raised), and the native section announces the same error before each (demo/src/verify-transforms.ts).
const TURNED_CLIP_REPORT = [/clips its content \(overflow\) in a frame that a transform rotates or skews/, /at: godot_react_ui::.*transform_state/];
const PROGRESS_MIN = 0.02;
const PROGRESS_MAX = 0.98;
const MIN_TRANSITION_SAMPLES = 12;
const TRANSITION_DURATION_MS = 2000;
const CARET_NEAR_PX = 13;
const LEVELS = 255;
const STAGE = { width: 520, height: 320 };
const STAGE_COLOR = [0xf8, 0xfa, 0xfc];
const CARD_FILL = [0xfd, 0xe6, 0x8a];
const CARD = { left: 150, top: 100, width: 220, height: 120 };
// The lab's cases, as `demo/src/transform-data.ts` has them (a plain Node script cannot import TypeScript without tsx).
const SHAPES = ['identity', 'translate', 'rotate', 'rotate-corner', 'scale-up', 'scale-down', 'skew', 'matrix', 'rotate-x', 'rotate-y', 'rotate-xyz', 'percent', 'mirror', 'nested'];
const TRANSITIONS = ['rotate', 'scale', 'mismatch', 'tailwind'];
const BAR = { left: 150, top: 130, width: 220, height: 56 };
const HOVER = { left: 190, top: 110, width: 140, height: 90, scale: 1.25 };

const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export async function runTransformsScenario(context) {
  const { demo, page, frames, snapshot, find, check, capture, decodePng, moveTo, waitUntil, expectedConsoleErrors, actionTimeoutMs } = context;
  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const showCase = async (name) => {
    await page.evaluate((value) => globalThis.godotReactTransformLab.setCase(value), name);
    await settle();
  };
  // A case that provokes the turned-clip report: it is expected, and a case that does not provoke it fails, since the report is what is checked.
  const showCaseReportingTurnedClip = async (name) => {
    expectedConsoleErrors.push(...TURNED_CLIP_REPORT);
    await showCase(name);
    await waitUntil(`the turned clip of the ${name} case to be reported`, () => expectedConsoleErrors.length === 0);
  };
  const dpr = await page.evaluate(() => globalThis.devicePixelRatio);
  const suffix = dpr === 1 ? 'dpr1' : 'web-dpr2';
  const grab = async () => {
    const canvas = await page.$('canvas');
    const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: actionTimeoutMs })));
    await canvas.dispose();
    return { image, ratio: image.width / (await snapshot()).width };
  };
  const pixel = ({ image, ratio }, x, y) => {
    const px = Math.min(image.width - 1, Math.max(0, Math.round(x * ratio)));
    const py = Math.min(image.height - 1, Math.max(0, Math.round(y * ratio)));
    const at = (py * image.width + px) * image.channels;
    return [image.pixels[at], image.pixels[at + 1], image.pixels[at + 2]];
  };
  const apart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  const hoverAt = async (x, y) => {
    await moveTo({ x, y });
    await settle();
    return (await snapshot()).hovered;
  };
  const rectApart = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width), Math.abs(a.height - b.height));
  const goldenAt = (name, progress) => {
    const table = golden.matrices[name];
    const steps = Object.keys(table).map(Number).sort((a, b) => a - b);
    const upper = steps.find((step) => step >= progress) ?? steps.at(-1);
    const lower = [...steps].reverse().find((step) => step <= progress) ?? 0;
    const mix = upper === lower ? 0 : (progress - lower) / (upper - lower);
    return table[String(lower)].map((value, index) => value + (table[String(upper)][index] - value) * mix);
  };

  await demo('showLab', 'transforms');
  await settle();

  // The shape cases: the card's rectangle is the one Chrome reports, its fill is where the matrix puts it, nothing is drawn outside its box.
  for (const name of SHAPES) {
    await showCase(`shape:${name}`);
    const card = await find('transform-card');
    check(`${name}: the card's rectangle is the box round it, as getBoundingClientRect reports it`, rectApart(card.rect, golden.rects[name]) <= RECT_TOLERANCE_PX, { rect: card.rect, golden: golden.rects[name] });
    const shot = await grab();
    const local = apply(card.transform ?? [1, 0, 0, 1, 0, 0], CARD.width - 28, CARD.height - 28);
    const fill = pixel(shot, CARD.left + local[0], CARD.top + local[1]);
    check(`${name}: the card's fill is at its own point`, apart(fill, CARD_FILL) <= COLOR_TOLERANCE, { fill });
    const box = golden.rects[name];
    const outside = [[box.x - OUTSIDE_PX, box.y + box.height / 2], [box.x + box.width + OUTSIDE_PX, box.y + box.height / 2], [box.x + box.width / 2, box.y - OUTSIDE_PX], [box.x + box.width / 2, box.y + box.height + OUTSIDE_PX]]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < STAGE.width && y < STAGE.height);
    check(`${name}: nothing is drawn outside the box round the card`, outside.every(([x, y]) => apart(pixel(shot, x, y), STAGE_COLOR) <= COLOR_TOLERANCE), outside.map(([x, y]) => pixel(shot, x, y)));
    await capture(`transforms-${name}-${suffix}`, { geometry: false });
  }

  // A click in a turned frame: the bar is hit where it is drawn and the empty corners of the box round it are not.
  await showCase('hit');
  const bar = await find('hit-bar');
  check('The bar under rotate(30deg): its rectangle is the box round it', rectApart(bar.rect, golden.bar) <= RECT_TOLERANCE_PX, { rect: bar.rect, golden: golden.bar });
  // A bare `Button` centres its label, as a browser's `<button>` does (docs/tracks/button-centre.md): the lab's bar sets no alignment.
  const label = (await snapshot()).nodes.find((entry) => entry.parent === bar.id && entry.kind === 'text');
  const middleOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const labelApart = label === undefined ? Infinity : Math.hypot(middleOf(label.rect).x - middleOf(bar.rect).x, middleOf(label.rect).y - middleOf(bar.rect).y);
  check('The turned bar is a bare Button and its label is in its middle', labelApart <= LABEL_CENTRE_TOLERANCE_PX, { labelApart, label: label?.rect, bar: bar.rect });
  const barMatrix = bar.transform;
  const inBar = [[PROBE_INSET_PX, PROBE_INSET_PX], [BAR.width - PROBE_INSET_PX, PROBE_INSET_PX], [PROBE_INSET_PX, BAR.height - PROBE_INSET_PX], [BAR.width - PROBE_INSET_PX, BAR.height - PROBE_INSET_PX], [BAR.width / 2, BAR.height / 2]];
  let hits = 0;
  for (const [x, y] of inBar) {
    const [wx, wy] = apply(barMatrix, x, y);
    if (await hoverAt(BAR.left + wx, BAR.top + wy) === bar.id) hits += 1;
  }
  check('The turned bar is hit at four corners and the middle where it is drawn', hits === inBar.length, { hits });
  const corners = [[golden.bar.x + PROBE_INSET_PX, golden.bar.y + PROBE_INSET_PX], [golden.bar.x + golden.bar.width - PROBE_INSET_PX, golden.bar.y + PROBE_INSET_PX],
    [golden.bar.x + PROBE_INSET_PX, golden.bar.y + golden.bar.height - PROBE_INSET_PX], [golden.bar.x + golden.bar.width - PROBE_INSET_PX, golden.bar.y + golden.bar.height - PROBE_INSET_PX]];
  let misses = 0;
  for (const [x, y] of corners) if (await hoverAt(x, y) !== bar.id) misses += 1;
  check('The empty corners of the box round a turned bar are not the bar', misses === corners.length, { misses });
  const collapsed = await find('hit-collapsed');
  check('An element scaled to nothing is hit nowhere', await hoverAt(430, 70) !== collapsed.id);
  const parent = await find('hit-parent');
  check('A scaled parent is hit past its layout box', await hoverAt(6, 6) === parent.id);

  // A card that scales on hover stays hovered where its scaled box reaches past the layout one.
  await showCase('hover');
  const card = await find('hover-card');
  const centre = { x: HOVER.left + HOVER.width / 2, y: HOVER.top + HOVER.height / 2 };
  check('The hover card is hovered', await hoverAt(centre.x, centre.y) === card.id);
  const reach = (HOVER.scale - 1) / 2 * HOVER.width;
  check('and scaled', Math.abs((await find('hover-card')).transform?.[0] - HOVER.scale) <= MATRIX_TOLERANCE);
  check('It stays hovered between the layout edge and the scaled one', await hoverAt(HOVER.left - reach / 2, centre.y) === card.id);
  check('and is not past the scaled box', await hoverAt(HOVER.left - reach - PROBE_INSET_PX, centre.y) !== card.id && (await find('hover-card')).transform === null);

  // A popover anchors to getRect().
  await showCase('anchor');
  await settle();
  const anchor = await find('anchor-marker');
  check('A marker placed from getRect() sits at the bottom right of the box round a turned trigger',
    Math.abs(anchor.rect.x - (golden.anchor.x + golden.anchor.width)) <= RECT_TOLERANCE_PX && Math.abs(anchor.rect.y - (golden.anchor.y + golden.anchor.height)) <= RECT_TOLERANCE_PX, anchor.rect);

  // Scrolling inside a rotation.
  await showCaseReportingTurnedClip('scroll');
  const tilted = await find('scroll-tilted');
  await moveTo({ x: tilted.rect.x + tilted.rect.width / 2, y: tilted.rect.y + tilted.rect.height / 2 });
  // A CDP wheel notch of WHEEL_TICK_PIXELS arrives as that many CSS pixels at device pixel ratio 1 and as half as many at 2 (the
  // same measurement as notchTicks() in verify-interaction-web.mjs), so it is `notch` ticks, not one.
  const notch = WHEEL_TICK_PIXELS / dpr * WHEEL_PIXEL_FACTOR;
  await page.mouse.wheel({ deltaY: WHEEL_TICK_PIXELS });
  await settle();
  const top = (await find('scroll-tilted')).scroll.scrollTop;
  const tick = 140 / WHEEL_PAGE_DIVISOR;
  // The ticks are in screen axes and the list takes them along its own, turned by the tilt: down the screen is cos(tilt) down the list.
  const expectedTop = notch * tick * Math.cos(TILT_DEGREES * Math.PI / 180);
  check('A wheel notch over a vertical list tilted 8 degrees scrolls it by its ticks, along its own y', Math.abs(top - expectedTop) <= SCROLL_TOLERANCE_PX, { top, expectedTop, notch, tick });
  const quarter = await find('scroll-quarter');
  await moveTo({ x: quarter.rect.x + quarter.rect.width / 2, y: quarter.rect.y + quarter.rect.height / 2 });
  await page.mouse.wheel({ deltaY: WHEEL_TICK_PIXELS });
  await settle();
  const state = (await find('scroll-quarter')).scroll;
  const expectedLeft = notch * 160 / WHEEL_PAGE_DIVISOR;
  check('A wheel notch down the screen over a row turned a quarter scrolls it along its own x', Math.abs(state.scrollLeft - expectedLeft) <= SCROLL_TOLERANCE_PX && state.scrollTop === 0, { state, expectedLeft, notch });

  // A field in a turned, scaled card: a click lands where it is drawn and the caret is drawn there.
  await showCaseReportingTurnedClip('input');
  const field = await find('input-field');
  const cardMatrix = (await find('input-card')).transform;
  const centreOf = (rect) => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const fieldCentre = centreOf(field.rect);
  const linear = [cardMatrix[0], cardMatrix[1], cardMatrix[2], cardMatrix[3], 0, 0];
  const offsets = [];
  let nearest = 0;
  for (const localX of [20, 60, 100]) {
    const [dx, dy] = apply(linear, localX - field.presentation.width / 2, 0);
    const target = { x: fieldCentre.x + dx, y: fieldCentre.y + dy };
    await moveTo(target);
    await page.mouse.down();
    await page.mouse.up();
    await settle();
    const input = (await find('input-field')).textInput;
    const caret = input.caret;
    nearest = Math.max(nearest, Math.hypot(caret.x + caret.width / 2 - target.x, caret.y + caret.height / 2 - target.y));
    offsets.push(input.selectionStart);
  }
  check('Clicks along a turned field put the caret where they landed', nearest <= CARET_NEAR_PX && offsets[0] < offsets[1] && offsets[1] < offsets[2], { nearest, offsets });

  // Transitions, sampled against Chrome's matrices.
  for (const name of TRANSITIONS) {
    await showCase(`transition:${name}`);
    const target = await find('transform-card');
    const before = (await snapshot()).stats;
    await page.evaluate(() => globalThis.godotReactTransformLab.sendTransition('to'));
    const samples = [];
    let midway;
    const started = Date.now();
    while (Date.now() - started < TRANSITION_DURATION_MS + 800) {
      const data = await snapshot();
      const record = data.transitions.find((entry) => entry.id === target.id && entry.property === 'transform');
      const matrix = data.nodes.find((entry) => entry.id === target.id)?.transform;
      if (record === undefined || !matrix) continue;
      const progress = (data.clockMs - record.startedAtMs) / record.durationMs;
      if (progress < PROGRESS_MIN || progress > PROGRESS_MAX) continue;
      samples.push({ progress, matrix });
      if (midway === undefined && progress >= 0.5) midway = data.stats;
    }
    let worstMatrix = 0;
    let worstOffset = 0;
    for (const { progress, matrix } of samples) {
      const expected = goldenAt(name, progress);
      matrix.forEach((value, index) => {
        const distance = Math.abs(value - expected[index]);
        if (index < 4) worstMatrix = Math.max(worstMatrix, distance);
        else worstOffset = Math.max(worstOffset, distance);
      });
    }
    check(`${name}: the sampled transition is Chrome's (${samples.length} samples)`, samples.length >= MIN_TRANSITION_SAMPLES && worstMatrix <= MATRIX_TOLERANCE && worstOffset <= RECT_TOLERANCE_PX, { worstMatrix, worstOffset, samples: samples.length });
    check(`${name}: nothing is re-recorded or laid out while it animates`, midway !== undefined && midway.boxRecords === before.boxRecords && midway.contentRecords === before.contentRecords && midway.layoutPasses === before.layoutPasses, { before, midway });
    await waitUntil(`${name} settles`, async () => (await snapshot()).transitions.every((entry) => entry.property !== 'transform'));
  }
  void LEVELS;
}
