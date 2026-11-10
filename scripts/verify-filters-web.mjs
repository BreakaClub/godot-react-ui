// The `filters` section of the Web interaction verifier: the native section's blur accuracy, shape, stacking, live
// scrolling, hover and colour checks, read from the real canvas in Chrome at both device pixel ratios. Mirrors
// demo/src/verify-filters.ts; what differs is only how pixels are read (a canvas screenshot, decoded here).

const WIDTH_10_90_SIGMAS = 2.563103;
const ACCURACY_RADII = [2, 4, 8, 12, 16, 24, 40, 64];
const WIDTH_TOLERANCE = 0.04;
const WIDTH_TOLERANCE_PX = 0.6;
const PROFILE_TOLERANCE = 0.02;
const COLOUR_TOLERANCE = 0.02;
const SCROLL_ROW = 100;
const STRIPE_PX = 8;
const PANEL_INSET = 40;
const PANEL_TOP = 100;
const PANEL_HEIGHT = 180;
const SETTLE_FRAMES = 3;

function normalCdf(z) {
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 0.5 * (1 + (1 - poly * Math.exp(-x * x)) * Math.sign(x));
}

function width1090(profile) {
  const crossing = (level) => {
    for (let index = 1; index < profile.length; index += 1) {
      if (profile[index - 1] < level && profile[index] >= level) {
        return index - 1 + (level - profile[index - 1]) / (profile[index] - profile[index - 1]);
      }
    }
    throw new Error(`The profile never crosses ${level}`);
  };
  return crossing(0.9) - crossing(0.1);
}

function halfCrossing(profile) {
  for (let index = 1; index < profile.length; index += 1) {
    if (profile[index - 1] < 0.5 && profile[index] >= 0.5) return index - 1 + (0.5 - profile[index - 1]) / (profile[index] - profile[index - 1]) + 0.5;
  }
  throw new Error('The profile never crosses one half');
}

const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const widthOk = (measured, sigma) => Math.abs(measured - WIDTH_10_90_SIGMAS * sigma) <= Math.max(WIDTH_TOLERANCE * WIDTH_10_90_SIGMAS * sigma, WIDTH_TOLERANCE_PX);

export async function runFiltersScenario(context) {
  const { demo, page, frames, snapshot, find, check, decodePng, moveTo, centerOf, waitUntil, expectedConsoleErrors, actionTimeoutMs } = context;
  const capture = (name) => context.capture(name, { geometry: false });

  const settle = async () => { for (let index = 0; index < SETTLE_FRAMES; index += 1) await frames(); };
  const grab = async () => {
    const canvas = await page.$('canvas');
    const image = decodePng(Buffer.from(await canvas.screenshot({ type: 'png', timeout: actionTimeoutMs })));
    await canvas.dispose();
    const data = await snapshot();
    return { image, ratio: image.width / data.width, width: data.width, stats: data.stats };
  };
  const channelAt = (shot, x, y, channel = 0) => {
    const px = Math.min(shot.image.width - 1, Math.max(0, Math.floor(x)));
    const py = Math.min(shot.image.height - 1, Math.max(0, Math.floor(y)));
    return shot.image.pixels[(py * shot.image.width + px) * shot.image.channels + channel] / 255;
  };
  const row = (shot, y, from, to, channel = 0) => Array.from({ length: Math.floor(to) - Math.floor(from) }, (_, i) => channelAt(shot, Math.floor(from) + i, y, channel));
  const column = (shot, x, from, to, channel = 0) => Array.from({ length: Math.floor(to) - Math.floor(from) }, (_, i) => channelAt(shot, x, Math.floor(from) + i, channel));
  const stripe = (x) => (Math.floor(x / STRIPE_PX) % 2 === 0 ? 0 : 1);
  const show = async (props) => { await demo('showFilters', props); await settle(); };
  const plan = (node, target) => (target === 'filter' ? node.effects?.filter : node.effects?.backdrop)?.plan;

  // ---- Blur accuracy: a hard edge through backdrop-filter and filter, every radius, against a true Gaussian --------------
  for (const target of ['backdrop', 'filter']) {
    for (const radius of ACCURACY_RADII) {
      await show({ scene: 'edge', target, radius });
      const shot = await grab();
      const panel = await find('panel');
      const planned = plan(panel, target);
      check(`${target} blur ${radius}px has a plan`, planned !== undefined, { radius });
      const centre = Math.round(shot.width / 2 * shot.ratio);
      const y = Math.floor((PANEL_TOP + PANEL_HEIGHT / 2) * shot.ratio);
      const inset = target === 'filter' ? 0 : PANEL_INSET;
      const half = (shot.width / 2 - inset) * shot.ratio;
      const span = Math.min(Math.ceil(4 * planned.achievedPx + 40), Math.floor(half - 6), target === 'filter' ? Math.floor(half - 3 * planned.achievedPx) : Infinity);
      if (span < 1.5 * planned.achievedPx) { console.log('GODOT_REACT_FILTERS_SKIPPED', JSON.stringify({ target, radius, ratio: shot.ratio })); continue; }
      let profile = row(shot, y, centre - span, centre + span);
      if (target === 'filter') {
        const low = profile[0];
        const high = profile[profile.length - 1];
        profile = profile.map((value) => (value - low) / (high - low));
      }
      const worst = Math.max(...profile.map((value, index) => Math.abs(value - normalCdf((index - span + 0.5) / planned.achievedPx))));
      check(`${target} blur ${radius}px: the width is a Gaussian's of ${planned.achievedPx.toFixed(1)} px`, widthOk(width1090(profile), planned.achievedPx),
        { width: width1090(profile), ideal: WIDTH_10_90_SIGMAS * planned.achievedPx, plan: planned, ratio: shot.ratio });
      check(`${target} blur ${radius}px: no facets (worst error ${worst.toFixed(4)})`, worst <= PROFILE_TOLERANCE, { worst, plan: planned });
      if (!planned.clamped) check(`${target} blur ${radius}px draws the radius asked`, near(planned.achievedPx, radius * shot.ratio, 0.01), { plan: planned });
    }
    await capture(`filters-edge-${target}`);
  }

  // ---- Shape: rounded corners, translucent fill and border over the blur -------------------------------------------
  await show({ scene: 'edge', target: 'backdrop', radius: 8, shape: true });
  {
    const shot = await grab();
    const { rect } = await find('panel');
    const at = (x, y, channel = 0) => channelAt(shot, x * shot.ratio, y * shot.ratio, channel);
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    for (const [x, y] of [[rect.x + 1, rect.y + 1], [right - 2, rect.y + 1], [rect.x + 1, bottom - 2], [right - 2, bottom - 2]]) {
      check(`Pixel (${x},${y}) outside the rounded corner is the stripe`, near(at(x, y), stripe(x), 0.02), { value: at(x, y) });
    }
    for (const [x, y] of [[rect.x + 36, rect.y + 36], [rect.x + rect.width / 2, rect.y + rect.height / 2]]) {
      check(`Pixel (${x},${y}) is blurred stripes under 20% white`, near(at(x, y), 0.6, 0.05), { value: at(x, y) });
    }
    const border = [0, 1, 2].map((channel) => channelAt(shot, (rect.x + 0.5) * shot.ratio, (rect.y + 90) * shot.ratio, channel));
    check('The border is red over the panel', border[0] > 0.8 && border[1] < 0.25 && border[2] < 0.25, { border });
    await capture('filters-shape');
  }

  // ---- Stacking: panel B over panel A blurs A's blur ---------------------------------------------------------------
  await show({ scene: 'stack', radius: 8 });
  {
    const shot = await grab();
    const a = (await find('panel-a')).rect;
    const b = (await find('panel-b')).rect;
    const sigma = 8 * shot.ratio;
    const centre = Math.round(shot.width / 2 * shot.ratio);
    const half = (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) / 2 * shot.ratio;
    const measure = (y, expected) => {
      const span = Math.min(Math.round(4 * expected + 8), Math.floor(half) - 8);
      return width1090(row(shot, y, centre - span, centre + span));
    };
    check('Panel A alone blurs by 8px', widthOk(measure((a.y + 40) * shot.ratio, sigma), sigma), { width: measure((a.y + 40) * shot.ratio, sigma) });
    check('Where B is over A the variances add', widthOk(measure((b.y + 40) * shot.ratio, sigma * Math.SQRT2), sigma * Math.SQRT2), { width: measure((b.y + 40) * shot.ratio, sigma * Math.SQRT2) });
    await capture('filters-stacked');
  }

  // ---- Live update: a list scrolled under a fixed frosted header ---------------------------------------------------
  await show({ scene: 'scroll', variant: 'header', radius: 8 });
  {
    const scroller = (await find('scroller')).rect;
    const header = (await find('header')).rect;
    const clear = 3 * 8 + 6;
    const before = (await snapshot()).stats;
    for (const top of [0, 30, 40, 10]) {
      await page.evaluate((t) => globalThis.godotReactDemo.scrollTo('scroller', t), top);
      await frames();
      await frames();
      const shot = await grab();
      const edgeY = SCROLL_ROW - top + scroller.y;
      const from = header.y + clear;
      const to = header.y + header.height - clear;
      const profile = column(shot, Math.round((scroller.x + scroller.width / 2) * shot.ratio), from * shot.ratio, to * shot.ratio);
      const crossing = from * shot.ratio + halfCrossing(profile);
      check(`Scrolled by ${top}, the row edge under the header is at ${edgeY}`, near(crossing, edgeY * shot.ratio, 0.8 * Math.max(1, shot.ratio / 2)), { crossing: crossing / shot.ratio, edgeY });
      check(`and it is blurred by 8px`, widthOk(width1090(profile), 8 * shot.ratio), { width: width1090(profile) });
    }
    const after = (await snapshot()).stats;
    check('Scrolling under the header changed no commit', after.batches === before.batches && after.nodesUpdated === before.nodesUpdated, { before, after });
    await capture('filters-scroll-header');
  }

  // ---- Native state: hover changes the blur with no React commit ---------------------------------------------------
  await show({ scene: 'native' });
  {
    await page.mouse.move(1, 1);
    await frames();
    const panel = (await find('hover-panel')).rect;
    const centre = (shot) => Math.round(shot.width / 2 * shot.ratio);
    const measure = async () => {
      const shot = await grab();
      const y = Math.round((panel.y + panel.height / 2) * shot.ratio);
      return width1090(row(shot, y, centre(shot) - 60 * shot.ratio, centre(shot) + 60 * shot.ratio));
    };
    const ratio = (await grab()).ratio;
    const rest = await measure();
    check('At rest the panel blurs by 4px', widthOk(rest, 4 * ratio), { rest });
    const statsBefore = (await snapshot()).stats;
    await moveTo(await centerOf('hover-panel'));
    await settle();
    const hovered = await measure();
    // hover:backdrop-brightness-110 narrows the 10 to 90 width of the 16px blur a little (the ramp is multiplied by 1.1 before it clamps).
    check('Hovering the panel makes the blur 16px (with the 10% brightness gain)', hovered > 2.15 * 16 * ratio && hovered < WIDTH_10_90_SIGMAS * 16 * ratio, { hovered });
    const statsAfter = (await snapshot()).stats;
    check('Hover caused no React commit and no box re-record', statsAfter.batches === statsBefore.batches && statsAfter.boxRecords === statsBefore.boxRecords, { statsBefore, statsAfter });
    await page.mouse.move(1, 1);
    await settle();
    await capture('filters-native-state');
  }

  // ---- Colour functions against the CSS formulas -------------------------------------------------------------------
  {
    const lists = ['none', 'brightness(1.2)', 'invert(0.3)', 'hue-rotate(60deg)', 'saturate(1.8)', 'sepia(0.5)', 'grayscale(1)', 'contrast(0.6)'];
    const swatches = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];
    const hex = (value) => [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
    const clamp = (value) => Math.min(1, Math.max(0, value));
    const css = (name, amount, [r, g, b]) => {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const grey = 0.213 * r + 0.715 * g + 0.072 * b;
      switch (name) {
        case 'brightness': return [r, g, b].map((v) => clamp(v * amount));
        case 'contrast': return [r, g, b].map((v) => clamp((v - 0.5) * amount + 0.5));
        case 'invert': return [r, g, b].map((v) => clamp(amount + (1 - 2 * amount) * v));
        case 'grayscale': return [r, g, b].map((v) => clamp(v + (luminance - v) * amount));
        case 'saturate': return [r, g, b].map((v) => clamp(grey + amount * (v - grey)));
        case 'sepia': {
          const target = [0.393 * r + 0.769 * g + 0.189 * b, 0.349 * r + 0.686 * g + 0.168 * b, 0.272 * r + 0.534 * g + 0.131 * b];
          return [r, g, b].map((v, i) => clamp(v + (target[i] - v) * amount));
        }
        case 'hue-rotate': {
          const c = Math.cos(amount * Math.PI / 180);
          const s = Math.sin(amount * Math.PI / 180);
          return [
            clamp((0.213 + c * 0.787 - s * 0.213) * r + (0.715 - c * 0.715 - s * 0.715) * g + (0.072 - c * 0.072 + s * 0.928) * b),
            clamp((0.213 - c * 0.213 + s * 0.143) * r + (0.715 + c * 0.285 + s * 0.140) * g + (0.072 - c * 0.072 - s * 0.283) * b),
            clamp((0.213 - c * 0.213 - s * 0.787) * r + (0.715 - c * 0.715 + s * 0.715) * g + (0.072 + c * 0.928 + s * 0.072) * b),
          ];
        }
        default: throw new Error(name);
      }
    };
    for (const target of ['filter', 'backdrop']) {
      await show({ scene: 'colour', target, values: lists });
      const shot = await grab();
      for (const [index, list] of lists.entries()) {
        const { rect } = await find(`colour-${index}`);
        for (const [swatch, colour] of swatches.entries()) {
          const x = (rect.x + (swatch % 2 === 0 ? 14 : 42)) * shot.ratio;
          const y = (rect.y + (swatch < 2 ? 14 : 42)) * shot.ratio;
          let rgb = hex(colour);
          for (const match of list.matchAll(/([a-z-]+)\(([^)]*)\)/gu)) rgb = css(match[1], Number(match[2].replace('deg', '')), rgb);
          const painted = [0, 1, 2].map((channel) => channelAt(shot, x, y, channel));
          const worst = Math.max(...rgb.map((value, i) => Math.abs(value - painted[i])));
          check(`${target} ${list} on ${colour}`, worst <= COLOUR_TOLERANCE, { expected: rgb, painted });
        }
      }
      await capture(`filters-colour-${target}`);
    }
  }
  // ---- Both properties on one element, each taken away and brought back (the native section's `verifyBothOnOneElement`) -------
  for (const [filterOn, backdropOn] of [[true, true], [false, true], [true, true], [true, false], [true, true]]) {
    const label = `filter ${filterOn ? 'on' : 'off'}, backdrop-filter ${backdropOn ? 'on' : 'off'}`;
    await show({ scene: 'both', radius: 12, filterOn, backdropOn });
    const shot = await grab();
    const panel = await find('panel');
    const layout = filterOn && backdropOn ? 'both' : filterOn ? 'group' : backdropOn ? 'backdrop' : undefined;
    check(`one element with both properties (${label}): its items hang as ${layout}`, layout === undefined ? !panel.effects : panel.effects?.layout === layout, { effects: panel.effects });
    const centre = Math.round(shot.width / 2 * shot.ratio);
    const y = Math.floor((PANEL_TOP + PANEL_HEIGHT / 2) * shot.ratio);
    const sigma = 12 * shot.ratio;
    const span = Math.min(Math.ceil(4 * sigma + 40), Math.floor((shot.width / 2 - PANEL_INSET) * shot.ratio) - 6);
    const raw = row(shot, y, centre - span, centre + span);
    const profile = raw.map((value) => (value - raw[0]) / (raw[raw.length - 1] - raw[0]));
    if (backdropOn) check(`one element with both properties (${label}): the backdrop is blurred by 12px`, widthOk(width1090(profile), sigma), { width: width1090(profile), ideal: WIDTH_10_90_SIGMAS * sigma });
    else check(`one element with both properties (${label}): the backdrop is sharp`, width1090(profile) < 2, { width: width1090(profile) });
    const under = channelAt(shot, centre + 100 * shot.ratio, (PANEL_TOP + PANEL_HEIGHT + 4) * shot.ratio);
    check(`one element with both properties (${label}): the shadow is ${filterOn ? 'drawn' : 'absent'}`, filterOn ? under < 0.93 : under > 0.99, { under });
  }

  // ---- A panel held back by a filter above it is drawn when the filter goes -------------------------------------------------
  // The nesting is an error the engine reports on purpose, once, as two console lines (the message and where it was raised).
  expectedConsoleErrors.push(/which has a filter/, /at: godot_react_ui::.*report_nesting/);
  for (const [step, filterOn] of [[0, true], [1, false], [2, true], [3, false]]) {
    await show({ scene: 'blocked', radius: 8, filterOn });
    const panel = await find('panel');
    check(`a panel inside a filtered element is ${filterOn ? 'held back' : 'drawn once the filter is gone'} (step ${step})`, filterOn ? !panel.effects : Boolean(panel.effects?.backdrop), { effects: panel.effects });
  }

  await waitUntil('The nesting is reported', () => expectedConsoleErrors.length === 0);

  // ---- A group after a backdrop that reads no mipmap still reads them (the Compatibility probe) ----------------------------------
  for (const radius of [8, 24]) {
    await show({ scene: 'order', target: 'filter', radius });
    const shot = await grab();
    const panel = await find('panel');
    const planned = plan(panel, 'filter');
    const centre = Math.round(shot.width / 2 * shot.ratio);
    const y = Math.floor((PANEL_TOP + PANEL_HEIGHT / 2) * shot.ratio);
    const half = (shot.width / 2) * shot.ratio;
    const span = Math.min(Math.ceil(4 * planned.achievedPx + 40), Math.floor(half - 6), Math.floor(half - 3 * planned.achievedPx));
    const raw = row(shot, y, centre - span, centre + span);
    const profile = raw.map((value) => (value - raw[0]) / (raw[raw.length - 1] - raw[0]));
    check(`filter blur ${radius}px after a backdrop that reads no mipmap`, widthOk(width1090(profile), planned.achievedPx), { width: width1090(profile), plan: planned });
  }

  await demo('showFilters', { scene: 'edge', radius: 0 });
  await settle();
}
