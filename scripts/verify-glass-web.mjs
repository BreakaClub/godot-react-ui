// The `glass` section of the Web interaction verifier (plan Phase V1 showcase): the native section's reads of the showcase lab, taken
// from the real canvas in Chrome at both device pixel ratios, with Chrome's own mouse for the hover and the clicks. Mirrors
// demo/src/verify-glass.ts (without its scroll-stability run, which only repeats the native renderer's); what differs is only how
// pixels are read (a canvas screenshot, decoded here).

const NORMAL_TEXT_CONTRAST = 4.5;
const LARGE_TEXT_CONTRAST = 3;
const BLURRED_STEP_LEVELS = 6;
const CRISP_STEP_LEVELS = 30;
const CLEAN_CORNER_SHARE = 3;
const TINTED_LEVELS = 12;
const BORDER_LIFT_LEVELS = 18;
const ARC_STEPS = 18;
const BORDER_INSIDE_PX = 4;
const HOVER_LIGHTENS_LEVELS = 8;
const SCRIM_DARKENING = 0.7;
const SCRIM_DARKENING_TOLERANCE = 0.08;
const PAGE_PROBE_PX = 3;
const CORNER_PROBE_PX = 1;
const PROBE_INSET_PX = 4;
const PROBE_SIZE_PX = 24;
const TEXT_FREE_MARGIN_PX = 8;
const VIEW_MARGIN_PX = 16;
const LEVELS = 255;
const BAR_RADIUS = 16;
const CARD_RADIUS = 24;
const TYPED_TEXT = 'Night drive';
const CARET_SURROUND_PX = 4;
const INPUT_TEXT_INSET_PX = 17;
const SETTLE_FRAMES = 3;
/** A root narrower than the page's own padding (`PAGE_PADDING` in demo/src/glass-data.ts, both sides): a window dragged narrow, a small frame. */
const NARROW_ROOT_PX = 20;

const TEXTS = [
  ['glass-brand', LARGE_TEXT_CONTRAST],
  ['glass-card-title-0', LARGE_TEXT_CONTRAST],
  ['glass-card-body-0', NORMAL_TEXT_CONTRAST],
  ['glass-stack-title', LARGE_TEXT_CONTRAST],
];

const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

export async function runGlassScenario(context) {
  const { demo, page, frames, snapshot, find, check, decodePng, moveTo, centerOf, click: clickTarget, pressAction, inputState, waitUntil, actionTimeoutMs } = context;
  const capture = (name) => context.capture(name, { geometry: false });
  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const scrollTo = async (top) => {
    await page.evaluate((t) => globalThis.godotReactDemo.scrollTo('glass-scroll', t), top);
    await settle();
  };

  const grab = async () => {
    const canvas = await page.$('canvas');
    const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: actionTimeoutMs })));
    await canvas.dispose();
    const data = await snapshot();
    return { image, ratio: image.width / data.width, data };
  };
  const pixel = (shot, x, y) => {
    const px = Math.min(shot.image.width - 1, Math.max(0, Math.round(x)));
    const py = Math.min(shot.image.height - 1, Math.max(0, Math.round(y)));
    const at = (py * shot.image.width + px) * shot.image.channels;
    return [shot.image.pixels[at], shot.image.pixels[at + 1], shot.image.pixels[at + 2]];
  };
  const brightness = (colour) => (colour[0] + colour[1] + colour[2]) / 3;
  const luminance = (colour) => 0.2126 * linear(colour[0] / LEVELS) + 0.7152 * linear(colour[1] / LEVELS) + 0.0722 * linear(colour[2] / LEVELS);
  const levelsApart = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  const box = (rect, ratio) => ({ x0: Math.round(rect.x * ratio), y0: Math.round(rect.y * ratio), x1: Math.round((rect.x + rect.width) * ratio), y1: Math.round((rect.y + rect.height) * ratio) });
  const meanBrightness = (shot, x, y, size) => {
    let sum = 0;
    for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) sum += brightness(pixel(shot, x + dx, y + dy));
    return sum / (size * size);
  };
  const widestStep = (shot, y, x0, x1) => {
    let widest = 0;
    for (let x = x0 + 1; x < x1; x += 1) widest = Math.max(widest, Math.abs(brightness(pixel(shot, x, y)) - brightness(pixel(shot, x - 1, y))));
    return widest;
  };

  /** Scroll to the top, then, if `testID` is not fully in the window there, scroll it to just under the bar. */
  const lookAt = async (testID) => {
    await scrollTo(0);
    const { rect } = await find(testID);
    const data = await snapshot();
    if (rect.y + rect.height <= data.height - VIEW_MARGIN_PX) return;
    const bar = (await find('glass-bar')).rect;
    await scrollTo(Math.round(rect.y - (bar.y + bar.height) - VIEW_MARGIN_PX));
  };
  const contrastIn = (shot, region) => {
    const lights = [];
    for (let y = region.y0; y < region.y1; y += 1) for (let x = region.x0; x < region.x1; x += 1) lights.push(luminance(pixel(shot, x, y)));
    lights.sort((a, b) => a - b);
    return (lights[lights.length - 1] + 0.05) / (lights[Math.floor(lights.length / 2)] + 0.05);
  };
  const click = async (testID) => {
    await moveTo(await centerOf(testID));
    await page.mouse.down();
    await page.mouse.up();
    await settle();
  };

  const checkContrast = async (label, texts) => {
    const short = [];
    for (const [testID, need] of texts) {
      await lookAt(testID);
      const shot = await grab();
      const contrast = contrastIn(shot, box((await find(testID)).rect, shot.ratio));
      if (contrast < need) short.push(`${testID} ${contrast.toFixed(2)} < ${need}`);
    }
    check(`${label}: text is readable on the glass behind it`, short.length === 0, short);
  };
  const checkCorner = async (label, testID, radius) => {
    await lookAt(testID);
    const shot = await grab();
    const region = box((await find(testID)).rect, shot.ratio);
    const page_ = pixel(shot, region.x0 - PAGE_PROBE_PX, region.y0 - PAGE_PROBE_PX);
    const outside = pixel(shot, region.x0 + CORNER_PROBE_PX, region.y0 + CORNER_PROBE_PX);
    const inside = pixel(shot, region.x0 + Math.round(radius * shot.ratio / 2), region.y0 + Math.round(radius * shot.ratio / 2));
    const leaked = levelsApart(outside, page_);
    const tint = levelsApart(inside, page_);
    check(`${label}: ${testID}'s rounded corner is clean`, tint >= TINTED_LEVELS && leaked * CLEAN_CORNER_SHARE <= tint, { leaked, tint });
  };
  const checkBorder = async (label, testID, radius) => {
    await lookAt(testID);
    const shot = await grab();
    const region = box((await find(testID)).rect, shot.ratio);
    const arc = radius * shot.ratio;
    let dimmest = Infinity;
    for (let step = 0; step <= ARC_STEPS; step += 1) {
      const turn = Math.PI + (Math.PI / 2) * step / ARC_STEPS;
      const at = (distance) => [Math.round(region.x0 + arc + distance * Math.cos(turn)), Math.round(region.y0 + arc + distance * Math.sin(turn))];
      const [rx, ry] = at(arc - shot.ratio / 2);
      let peak = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) peak = Math.max(peak, brightness(pixel(shot, rx + dx, ry + dy)));
      const [ix, iy] = at(arc - BORDER_INSIDE_PX * shot.ratio);
      dimmest = Math.min(dimmest, peak - brightness(pixel(shot, ix, iy)));
    }
    check(`${label}: ${testID}'s border is an unbroken line`, dimmest >= BORDER_LIFT_LEVELS, { dimmest });
  };

  /** A text input on a glass card: its placeholder, caret and selection read on the glass (Chrome's own keys type and select). */
  const checkInput = async (label) => {
    await lookAt('glass-search');
    check(`${label}: the search field starts empty, showing its placeholder`, (await inputState('glass-search')).showingPlaceholder === true);
    await checkContrast(`${label} placeholder`, [['glass-search', NORMAL_TEXT_CONTRAST]]);
    await clickTarget('glass-search');
    await page.keyboard.type(TYPED_TEXT);
    await waitUntil('the typed text', async () => (await inputState('glass-search')).value === TYPED_TEXT);
    await waitUntil('the caret blinks on', async () => (await inputState('glass-search')).caretVisible === true);
    await capture('glass-input');
    let shot = await grab();
    const caret = (await inputState('glass-search')).caret;
    check(`${label}: the focused field has a caret`, caret !== null, caret);
    const line = box(caret, shot.ratio);
    const surround = Math.round(CARET_SURROUND_PX * shot.ratio);
    const caretContrast = contrastIn(shot, { x0: line.x0 - surround, y0: line.y0, x1: line.x1 + surround, y1: line.y1 });
    check(`${label}: the caret reads against the glass behind it`, caretContrast >= LARGE_TEXT_CONTRAST, { caretContrast });

    await pressAction('ui_text_select_all');
    await waitUntil('the text is selected', async () => {
      const state = await inputState('glass-search');
      return state.selectionStart === 0 && state.selectionEnd === TYPED_TEXT.length;
    });
    await capture('glass-input-selected');
    shot = await grab();
    const field = await find('glass-search');
    const end = box(field.textInput.caret, shot.ratio);
    const text = { x0: box(field.rect, shot.ratio).x0 + Math.round(INPUT_TEXT_INSET_PX * shot.ratio), y0: end.y0, x1: end.x0, y1: end.y1 };
    const channels = [[], [], []];
    for (let y = text.y0; y < text.y1; y += 1) for (let x = text.x0; x < text.x1; x += 1) pixel(shot, x, y).forEach((value, index) => channels[index].push(value));
    const highlighted = channels.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]);
    const around = pixel(shot, end.x1 + Math.round(INPUT_TEXT_INSET_PX * shot.ratio), (end.y0 + end.y1) / 2);
    check(`${label}: the text over the selection keeps its contrast`, contrastIn(shot, text) >= LARGE_TEXT_CONTRAST, { contrast: contrastIn(shot, text) });
    check(`${label}: the selection's highlight is told from the field around it`, levelsApart(highlighted, around) >= TINTED_LEVELS, { highlighted, around });

    // Leave the field empty and unfocused.
    await pressAction('ui_text_backspace');
    await moveTo({ x: 1, y: 1 });
    await page.mouse.down();
    await page.mouse.up();
    await frames();
    check(`${label}: the field is empty again`, (await inputState('glass-search')).showingPlaceholder === true);
  };

  await demo('showLab', 'glass');
  await settle();
  await scrollTo(0);
  await capture('glass-page');
  await checkContrast('glass page', TEXTS);
  await checkCorner('glass page', 'glass-card-0', CARD_RADIUS);
  await checkCorner('glass page', 'glass-bar', BAR_RADIUS);
  await checkBorder('glass page', 'glass-card-0', CARD_RADIUS);
  await checkBorder('glass page', 'glass-bar', BAR_RADIUS);

  // The tile row centred under the bar: inside the bar it is blurred, just below it the tiles' edges are crisp.
  await scrollTo(0);
  const tile = (await find('glass-tile-0')).rect;
  const bar = (await find('glass-bar')).rect;
  await scrollTo(Math.round(tile.y + tile.height / 2 - (bar.y + bar.height / 2)));
  await capture('glass-scrolled');
  {
    const shot = await grab();
    const brand = box((await find('glass-brand')).rect, shot.ratio);
    const barBox = box((await find('glass-bar')).rect, shot.ratio);
    const links = await find('glass-links').catch(() => undefined);
    const signIn = box((await find('glass-signin')).rect, shot.ratio);
    const from = brand.x1 + Math.round(TEXT_FREE_MARGIN_PX * shot.ratio);
    const to = (links ? box(links.rect, shot.ratio).x0 : signIn.x0) - Math.round(TEXT_FREE_MARGIN_PX * shot.ratio);
    const inside = widestStep(shot, Math.round((barBox.y0 + barBox.y1) / 2), from, to);
    const below = widestStep(shot, barBox.y1 + Math.round(TEXT_FREE_MARGIN_PX * shot.ratio), from, to);
    check('glass: the tiles just below the bar have crisp edges and the bar blurs them', below >= CRISP_STEP_LEVELS && inside <= BLURRED_STEP_LEVELS, { inside, below });
  }

  // Hover over a card's button: the pill lightens.
  await lookAt('glass-card-button-0');
  const target = (await find('glass-card-button-0')).rect;
  const probe = async () => {
    const shot = await grab();
    return brightness(pixel(shot, (target.x + target.height / 2) * shot.ratio, (target.y + target.height / 2) * shot.ratio));
  };
  await moveTo({ x: 2, y: 2 });
  const rest = await probe();
  await moveTo(await centerOf('glass-card-button-0'));
  const hovered = await probe();
  await capture('glass-hover');
  check('glass: hovering the card button lightens it', hovered - rest >= HOVER_LIGHTENS_LEVELS, { rest, hovered });
  await moveTo({ x: 2, y: 2 });

  await checkInput('glass');

  // The sheet over its scrim: the scrim darkens the page, the sheet's title reads, and Cancel closes it.
  await scrollTo(0);
  const before = await grab();
  const probeSize = Math.round(PROBE_SIZE_PX * before.ratio);
  const corner = { x: Math.round(PROBE_INSET_PX * before.ratio), y: before.image.height - Math.round(PROBE_INSET_PX * before.ratio) - probeSize };
  const brightBefore = meanBrightness(before, corner.x, corner.y, probeSize);
  await click('glass-signin');
  await capture('glass-sheet');
  const after = await grab();
  const dimmed = meanBrightness(after, corner.x, corner.y, probeSize) / brightBefore;
  check('glass: the scrim darkens the page', Math.abs(dimmed - SCRIM_DARKENING) <= SCRIM_DARKENING_TOLERANCE, { dimmed });
  await checkContrast('glass sheet', [['glass-sheet-title', LARGE_TEXT_CONTRAST]]);
  await checkCorner('glass sheet', 'glass-sheet', CARD_RADIUS);
  await click('glass-sheet-cancel');
  check('glass: Cancel closes the sheet', await find('glass-sheet').then(() => false, () => true));

  // The cards' widths come from the root's (`glassLayout`): the root less the padding and the gaps, which in a root narrower than the padding is
  // negative. CSS has no negative width (`calc()` clamps it at zero), and native refuses one (`width: dimension must be a finite nonnegative
  // number`), so a page that sent it would have its commit rejected; that is a browser error, which `waitUntil` fails the run with.
  const root = await snapshot();
  await demo('resizeSurface', NARROW_ROOT_PX, root.height);
  await waitUntil('the glass page to lay out in a root narrower than its padding', async () => (await find('glass-card-0')).style.width === 0);
  check('glass: in a root narrower than its padding the cards are zero wide, not negative', (await snapshot()).width === NARROW_ROOT_PX);
  await demo('resizeSurface', root.width, root.height);
  await waitUntil('the glass page to fill the root again', async () => (await find('glass-card-0')).style.width > 0);
}
