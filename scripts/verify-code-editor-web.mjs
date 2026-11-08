// The `code-editor` section of the Web interaction verifier: the navigator's code panel (demo/src/code-editor.tsx, demo/src/editor/) in real
// Chrome, driven by Chrome's own mouse, keyboard, IME and touch through puppeteer (CDP, headless: no OS input). Mirrors
// demo/src/verify-code-editor.ts for what a browser can do: the grid measured and every run on its column, a press that puts the caret at a
// column, a drag that selects, Copy and Cut into the browser's (in-memory) clipboard and Paste out of it, typing that reaches the lab on the
// stage, a syntax error that keeps the last good page, a type error underlined where the checker says, an inlay hint and a hover, an IME
// composition shown at the caret, and, on a page with touch, a tap that places the caret and brings the soft keyboard up, whose keys then
// edit the code.
//
// The viewports are the Web verifier's: the landscape ones (1120 x 800, at device pixel ratios 1 and 2, so the rasters are at both) have the Code
// button; the portrait ones (600 wide) do not, and the scenario checks that.

/** `md:` (README: Styles): from here the Code button is offered. */
const PHONE_BREAKPOINT_PX = 768;
const PROBE_COLUMNS = 400;
const COLUMN_TOLERANCE_PX = 1;
/** How far the caret of a column on the grid may be from where the grid says: the paragraph's own advance is exact to a small fraction of a pixel. */
const GRID_EXACT_PX = 0.05;
/** The error colour (demo/src/editor/theme.ts). */
const ERROR_COLOUR = '#f87171';
/**
 * A comment with three emoji (two code units each), two CJK characters (the Web build has no font with them, so the engine lays out its own
 * boxes for them) and ASCII on both sides, and the offsets in it that the scenario uses: the first emoji starts and ends, and the three end.
 */
const WIDE_COMMENT = '// \u{1F600}\u{1F680}\u{1F3B2} \u65e5\u672c ok';
const EMOJI_CODE_UNITS = 2;
const EMOJI_COUNT = 3;
const WIDE_FIRST_START = 3;
const WIDE_FIRST_END = WIDE_FIRST_START + EMOJI_CODE_UNITS;
const WIDE_RUN_END = WIDE_FIRST_START + EMOJI_COUNT * EMOJI_CODE_UNITS;
/** Where in the span between two carets a press lands on the left one (under half) and on the right one (over half). */
const BELOW_HALF = 0.3;
const ABOVE_HALF = 0.7;
const UPDATE_DEADLINE_MS = 12_000;
const HOVER_WAIT_MS = 700;
/** Longer than the click-count interval (500 ms): the next press begins a new sequence. */
const CLICK_SEQUENCE_PAUSE_MS = 650;
/** Typed at the end of a statement: not a statement. (A stray `}` in JSX text is not a syntax error to Bun's parser.) */
const SYNTAX_JUNK = ' = = ;';
const EMERALD_100 = '#d1fae5';
const PAGE_BACKGROUND = '#f8fafc';

const near = (actual, expected, tolerance = COLUMN_TOLERANCE_PX) => Math.abs(actual - expected) <= tolerance;

/** The 1-based line and 0-based column of the first `needle` in `source`. */
function positionOf(source, needle, occurrence = 0) {
  let offset = -1;
  for (let count = 0; count <= occurrence; count += 1) offset = source.indexOf(needle, offset + 1);
  if (offset < 0) throw new Error(`The source has no ${JSON.stringify(needle)}`);
  const before = source.slice(0, offset);
  return { line: before.split('\n').length, column: offset - (before.lastIndexOf('\n') + 1) };
}

function helpers(context) {
  const { demo, page, frames, snapshot, find, check, nodeExists, text, waitUntil, pagePoint, centerOf } = context;
  const grid = async () => {
    // The advance the paragraph lays its glyphs out at: the distance between a caret at the start of the probe's line and one at its end, over its columns.
    const start = await demo('textCaret', 'editor-grid-probe', 0, 'after');
    const end = await demo('textCaret', 'editor-grid-probe', PROBE_COLUMNS, 'after');
    return { advance: (end.x - start.x) / PROBE_COLUMNS, lineHeight: (await find('editor-grid-probe')).rect.height, gutterWidth: (await find('code-gutter')).rect.width };
  };
  const boundaryAt = async (line, column) => {
    const g = await grid();
    const content = (await find('code-content')).rect;
    return { x: content.x + g.gutterWidth + column * g.advance, y: content.y + (line - 1) * g.lineHeight + g.lineHeight / 2 };
  };
  const statusPosition = async () => {
    const match = /^Ln (\d+), Col (\d+)/u.exec(await text('code-status-position'));
    return match === null ? undefined : { line: Number(match[1]), column: Number(match[2]) - 1 };
  };
  const lineText = async (line) => ((await nodeExists(`code-line-${line}`)) ? text(`code-line-${line}`) : undefined);
  /**
   * The spans of the `Text` with `testID`: a line is one node, and what it is coloured by is these. `text` is the range's text (an inlay has none) and
   * `inlay` the text it shows; the snapshot has every key of a span, null when unset, and a span here has only the ones that are set.
   */
  const spansOf = async (testID) => {
    const entry = await find(testID);
    // A blank line has no children, so no spans.
    return (entry.props.spans ?? []).map((span) => ({
      start: span.start, end: span.end, inlay: span.inlay ?? undefined, text: entry.text.slice(span.start, span.end),
      style: Object.fromEntries(Object.entries(span.style ?? {}).filter(([, value]) => value !== null)),
    }));
  };
  const press = async (key, modifiers = [], times = 1) => {
    for (let count = 0; count < times; count += 1) {
      for (const modifier of modifiers) await page.keyboard.down(modifier);
      await page.keyboard.press(key);
      for (const modifier of [...modifiers].reverse()) await page.keyboard.up(modifier);
    }
    await frames();
  };
  const click = async (logical, times = 1, modifiers = []) => {
    const point = await pagePoint(logical.x, logical.y);
    await page.mouse.move(point.x, point.y);
    for (const modifier of modifiers) await page.keyboard.down(modifier);
    for (let count = 0; count < times; count += 1) {
      await page.mouse.down();
      await page.mouse.up();
    }
    for (const modifier of [...modifiers].reverse()) await page.keyboard.up(modifier);
    await frames();
  };
  const drag = async (from, to) => {
    const start = await pagePoint(from.x, from.y);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await frames();
    const end = await pagePoint(to.x, to.y);
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await frames();
    await page.mouse.up();
    await frames();
  };
  const pageBackground = async () => (await find('inputs-lab')).presentation.backgroundColor.slice(0, 7).toLowerCase();
  // One snapshot answers it: reading each line with `text` takes a snapshot of its own, and a window still following a scroll drops a line
  // between the two.
  const drawnLines = async () => {
    const data = await snapshot();
    const byId = new Map(data.nodes.map((node) => [node.id, node]));
    const textOf = (node) => node.text + node.children.map((id) => textOf(byId.get(id))).join('');
    const lines = new Map();
    for (const entry of data.nodes) {
      const match = /^code-line-(\d+)$/u.exec(String(entry.props?.testID ?? ''));
      if (match !== null) lines.set(Number(match[1]), textOf(entry));
    }
    return lines;
  };
  /** Waits until line `number` is an element: the window follows the caret when the browser delivers the scroll. */
  const lineDrawn = (number) => waitUntil(`line ${number} to be drawn`, () => nodeExists(`code-line-${number}`));
  const clipboard = () => page.evaluate(() => navigator.clipboard.readText());
  const underlinedSpans = async (line) => (await spansOf(`code-line-${line}`)).filter((span) => span.inlay === undefined && span.style.textDecorationLine === 'underline');
  return {
    demo, page, frames, snapshot, find, check, nodeExists, text, waitUntil, centerOf, grid, boundaryAt, statusPosition, lineText, spansOf, press, click, drag,
    pageBackground, drawnLines, clipboard, underlinedSpans, lineDrawn,
  };
}

/** The panel in a viewport with a mouse and a keyboard. */
export async function runCodeEditorScenario(context) {
  const h = helpers(context);
  const { demo, page, frames, find, check, nodeExists, text, waitUntil } = h;
  const { capture } = context;
  const source = await demo('labSource', 'inputs');
  await demo('showNavigator', { initialLab: 'inputs' });
  await waitUntil('the navigator', () => nodeExists('lab-header'));
  if ((await context.snapshot()).width < PHONE_BREAKPOINT_PX) {
    // The button is in the tree with `display: none` below `md` (`hidden md:flex`), so it has no size.
    const hidden = (await nodeExists('toggle-code')) ? await find('toggle-code') : undefined;
    check('A viewport narrower than 768 logical pixels shows no Code button: no room for the page and its code together', hidden === undefined || (hidden.rect.width === 0 && hidden.rect.height === 0), hidden?.rect);
    return;
  }
  const lines = source.split('\n');
  /** Scrolls the code to the top through the programmatic path, so that positions given as lines count from the first. */
  const toTop = async () => {
    await demo('scrollTo', 'code-scroll', 0);
    await h.lineDrawn(1);
  };
  const pageBefore = await text('inputs-lab');
  await context.click('toggle-code');
  await waitUntil('the first line of code', () => nodeExists('code-line-1'));
  if (await nodeExists('code-read-only')) {
    check('Without the compiler the panel says plainly why it is read-only', /^Read-only\. /u.test(await text('code-read-only')), await text('code-read-only'));
    check('and the status bar does too, and does not say Ready', /^Read-only\. Live compile is not available: /u.test(await text('code-status-run')));
    return;
  }
  await waitUntil('the caret', () => nodeExists('code-caret'));
  check('The lab on the stage is the live session\'s and reads as the bundled lab did', (await text('inputs-lab')) === pageBefore);
  check('The status bar says the page is live, not just Ready', (await text('code-status-run')).startsWith('Live.'), await text('code-status-run'));
  check('The first line is the source\'s', (await h.lineText(1)) === lines[0], await h.lineText(1));
  await capture('code-editor-01-open', { geometry: false });

  // The grid is measured; a line is one Text, and the caret of every column of it is on the grid.
  const grid = await h.grid();
  check('The advance is a monospace advance', grid.advance > 4 && grid.advance < 16, grid);
  const content = (await find('code-content')).rect;
  let checkedCarets = 0;
  for (let line = 1; line <= 12; line += 1) {
    const lineSource = lines[line - 1] ?? '';
    const spans = (await h.spansOf(`code-line-${line}`)).filter((span) => span.inlay === undefined);
    check(`Line ${line} reads as the source, and its spans lie in it, in order and apart`, (await h.lineText(line)) === lineSource
      && spans.every((span, index) => span.start < span.end && span.end <= lineSource.length && (index === 0 || spans[index - 1].end <= span.start)), spans.map((span) => [span.start, span.end]));
    for (let column = 0; column <= lineSource.length; column += 1) {
      const caret = await demo('textCaret', `code-line-${line}`, column, 'after');
      if (!near(caret.x, content.x + grid.gutterWidth + column * grid.advance, GRID_EXACT_PX)) check(`Line ${line}, column ${column} has its caret on the grid`, false, { at: caret.x, wanted: content.x + grid.gutterWidth + column * grid.advance });
      checkedCarets += 1;
    }
  }
  check('Every column of the first lines has its caret on the grid', checkedCarets > 200, { checkedCarets });

  // A press puts the caret on the column.
  for (const [line, column] of [[3, 0], [4, 7], [5, 20], [7, 33]]) {
    const at = await h.boundaryAt(line, column);
    await h.click({ x: at.x + (column % 2 === 0 ? 1 : -1) * grid.advance * 0.3, y: at.y });
    const landed = Math.min(column, (lines[line - 1] ?? '').length);
    const position = await h.statusPosition();
    check(`A press at (${line}, ${column}) puts the caret at column ${landed}`, position?.line === line && position.column === landed, position);
    const caret = (await find('code-caret')).rect;
    check('and the caret is on that column\'s pixel', near(caret.x, content.x + grid.gutterWidth + landed * grid.advance), caret);
  }

  // A drag selects; Copy puts it on the browser's clipboard.
  await h.drag(await h.boundaryAt(4, 2), await h.boundaryAt(6, 10));
  await h.press('KeyC', ['Meta']);
  const expected = `${(lines[3] ?? '').slice(2)}\n${lines[4] ?? ''}\n${(lines[5] ?? '').slice(0, 10)}`;
  await waitUntil('Copy reaches the browser clipboard', async () => (await h.clipboard()) === expected);
  check('The dragged text is the clipboard\'s', true, expected);
  await capture('code-editor-02-selection', { geometry: false });
  const wordAt = positionOf(source, 'useState');
  await h.click(await h.boundaryAt(wordAt.line, wordAt.column + 3), 2);
  await h.press('KeyC', ['Meta']);
  await waitUntil('a double click selects a word', async () => (await h.clipboard()) === 'useState');
  await h.click(await h.boundaryAt(wordAt.line, wordAt.column + 3), 3);
  await h.press('KeyC', ['Meta']);
  await waitUntil('a triple click selects the line', async () => (await h.clipboard()) === `${lines[wordAt.line - 1]}\n`);

  // The wheel moves the window of lines.
  const scroller = (await find('code-scroll')).rect;
  await context.moveTo({ x: scroller.x + scroller.width / 2, y: scroller.y + scroller.height / 2 });
  await page.mouse.wheel({ deltaX: 0, deltaY: 400 });
  await frames();
  const drawn = await h.drawnLines();
  check('After the wheel the first line is not an element and the ones drawn read as the source', !drawn.has(1) && [...drawn].every(([n, t]) => t === lines[n - 1]), [...drawn.keys()]);
  await toTop();

  // An edit reaches the page, and the counter keeps its count.
  for (let presses = 0; presses < 3; presses += 1) await context.click('inputs-next');
  check('The counter counts', (await text('inputs-next')) === 'Next 3', await text('inputs-next'));
  check('The page starts with its own background', (await h.pageBackground()) === PAGE_BACKGROUND, await h.pageBackground());
  const classAt = positionOf(source, 'bg-slate-50');
  await h.click(await h.boundaryAt(1, 0));
  await h.press('ArrowDown', [], classAt.line - 1);
  await h.press('Home', [], 2);
  await h.press('ArrowRight', [], classAt.column + 'bg-slate-50'.length);
  await h.lineDrawn(classAt.line);
  await h.press('Backspace', [], 'slate-50'.length);
  await page.keyboard.type('emerald-100');
  await frames();
  check('The line reads bg-emerald-100', ((await h.lineText(classAt.line)) ?? '').includes('bg-emerald-100'), await h.lineText(classAt.line));
  await waitUntil('the page to take the new class', async () => (await h.pageBackground()) === EMERALD_100, UPDATE_DEADLINE_MS);
  check('The counter kept its count through the edit', (await text('inputs-next')) === 'Next 3', await text('inputs-next'));
  check('The status bar says what happened', /^Swapped in /u.test(await text('code-status-run')), await text('code-status-run'));
  await capture('code-editor-03-edited', { geometry: false });

  // A syntax error keeps the last good page and is shown.
  const brokenLine = positionOf(source, 'const [reversed, setReversed]').line;
  await h.press('ArrowUp', [], classAt.line - brokenLine);
  await h.lineDrawn(brokenLine);
  await h.press('End');
  await page.keyboard.type(SYNTAX_JUNK);
  await waitUntil('the compiler\'s verdict', async () => (await text('code-status-run')).startsWith('Not applied'), UPDATE_DEADLINE_MS);
  check('The status names the place', /Syntax error at \d+:\d+/u.test(await text('code-status-run')), await text('code-status-run'));
  check('The last good page stays, with its state', (await text('inputs-next')) === 'Next 3' && (await h.pageBackground()) === EMERALD_100);
  const brokenSpans = await h.underlinedSpans(brokenLine);
  check('The gutter marks the line and a span is underlined, wavy', (await nodeExists(`code-marker-${brokenLine}`)) && brokenSpans.length > 0
    && brokenSpans.every((span) => span.style.textDecorationStyle === 'wavy'), { marker: await nodeExists(`code-marker-${brokenLine}`), brokenSpans });
  await capture('code-editor-04-syntax-error', { geometry: false });
  await h.press('Backspace', [], SYNTAX_JUNK.length);
  await waitUntil('the page to run again', async () => (await text('code-status-run')).startsWith('Swapped in'), UPDATE_DEADLINE_MS);

  // A type error is underlined where tsc puts it; the problems list and the hover.
  const labelAt = positionOf(source, 'const label = ');
  await toTop();
  await h.click(await h.boundaryAt(1, 0));
  await h.press('ArrowDown', [], labelAt.line - 1);
  await h.press('Home', [], 2);
  await h.press('ArrowRight', [], 'const label'.length);
  await h.lineDrawn(labelAt.line);
  await page.keyboard.type(': number');
  // Declaring `label` a number makes every use of it as a class an error too: the first is the declaration.
  await waitUntil('the checker to find the errors', async () => /^\d+ errors?$/u.test(await text('code-status-check')), UPDATE_DEADLINE_MS);
  const underlined = await h.underlinedSpans(labelAt.line);
  check('The span "label" is underlined, and nothing else on the line', underlined.length === 1 && underlined[0].text === 'label', underlined.map((span) => span.text));
  check('The underline is wavy, in the error colour', underlined[0].style.textDecorationStyle === 'wavy' && String(underlined[0].style.textDecorationColor).slice(0, ERROR_COLOUR.length).toLowerCase() === ERROR_COLOUR, underlined[0].style);
  const labelRange = (await demo('textRanges', `code-line-${labelAt.line}`, underlined[0].start, underlined[0].end))[0];
  check('at the column tsc reports', near(labelRange.x, content.x + grid.gutterWidth + (labelAt.column + 'const '.length) * grid.advance, GRID_EXACT_PX), labelRange);
  await capture('code-editor-05-type-error', { geometry: false });
  await context.click('code-status-check');
  check('The problems list has it', (await nodeExists('code-problem-0')) && /TS2322/u.test(await text('code-problem-0')), await text('code-problem-0'));
  await context.click('code-problem-0');
  const jumped = await h.statusPosition();
  check('Pressing a problem puts the caret on it', jumped?.line === labelAt.line && jumped.column === labelAt.column + 'const '.length, jumped);
  await context.click('code-status-check');
  const over = await h.boundaryAt(labelAt.line, labelAt.column + 'const '.length + 2);
  await context.moveTo(over);
  await new Promise((resolve) => setTimeout(resolve, HOVER_WAIT_MS));
  await waitUntil('the hover', () => nodeExists('code-hover'), UPDATE_DEADLINE_MS);
  check('The tooltip names the word and the problem there', /label/u.test(await text('code-hover')) && (await nodeExists('code-hover-error')), await text('code-hover'));
  await capture('code-editor-06-hover', { geometry: false });
  await context.moveTo({ x: 1, y: 1 });
  await frames();
  check('The tooltip goes when the pointer leaves', !(await nodeExists('code-hover')));

  // An inlay hint stands in the line, after the name it describes.
  const sizesAt = positionOf(source, 'const sizes = ');
  await h.click(await h.boundaryAt(labelAt.line, 0));
  await h.press('ArrowDown', [], sizesAt.line - labelAt.line);
  await h.lineDrawn(sizesAt.line);
  await waitUntil('an inlay hint on the line of "sizes"', async () => (await h.spansOf(`code-line-${sizesAt.line}`)).some((span) => span.inlay?.startsWith(': ')), UPDATE_DEADLINE_MS);
  const hint = (await h.spansOf(`code-line-${sizesAt.line}`)).find((span) => span.inlay?.startsWith(': '));
  const hintOffset = sizesAt.column + 'const sizes'.length;
  check('The hint stands right after the name, at an offset of the line\'s own text, which does not have it', hint.start === hintOffset && !((await h.lineText(sizesAt.line)) ?? '').includes(hint.inlay), hint);
  const beforeHint = await demo('textCaret', `code-line-${sizesAt.line}`, hintOffset, 'before');
  const afterHint = await demo('textCaret', `code-line-${sizesAt.line}`, hintOffset, 'after');
  check('A caret can stand either side of it, its width apart', near(afterHint.x - beforeHint.x, hint.inlay.length * grid.advance, GRID_EXACT_PX), { before: beforeHint.x, after: afterHint.x });
  await capture('code-editor-07-inlay', { geometry: false });

  // Copy, cut and paste; undo.
  await h.click(await h.boundaryAt(sizesAt.line, sizesAt.column + 6), 2);
  await h.press('KeyX', ['Meta']);
  await waitUntil('Cut reaches the browser clipboard', async () => (await h.clipboard()) === 'sizes');
  check('Cut took the word out', !(((await h.lineText(sizesAt.line)) ?? '').includes('const sizes')));
  await h.press('KeyV', ['Meta']);
  await waitUntil('Paste puts it back, and the hint is still after the name', async () => /^\s*const sizes(: [^=]*)? = reversed/u.test((await h.lineText(sizesAt.line)) ?? ''));
  await toTop();
  await h.click(await h.boundaryAt(2, 0));
  await page.keyboard.type('Q');
  check('Typing put a character at the start of line 2', (await h.lineText(2)) === `Q${lines[1]}`, await h.lineText(2));
  await h.press('KeyZ', ['Meta']);
  check('Undo took it back', (await h.lineText(2)) === lines[1], await h.lineText(2));

  // An IME composition is shown at the caret, with an underline, and commits as text.
  const cdp = await page.createCDPSession();
  await toTop();
  await h.click(await h.boundaryAt(2, 0));
  await h.press('Home');
  await waitUntil('the IME element holds browser focus', async () => page.evaluate(() => document.activeElement?.className === 'ime'));
  await cdp.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
  await waitUntil('the preedit is in the line', async () => (await h.spansOf('code-line-2')).some((span) => span.inlay === 'に'));
  const preedit = (await h.spansOf('code-line-2')).find((span) => span.inlay === 'に');
  check('and it is underlined, at the caret', preedit.style.textDecorationLine === 'underline' && preedit.start === 0);
  check('The preedit is not in the document yet: the line reads as the source', (await h.lineText(2)) === lines[1]);
  check('The caret is after the preedit', near((await find('code-caret')).rect.x, (await demo('textCaret', 'code-line-2', 0, 'after')).x, COLUMN_TOLERANCE_PX));
  await capture('code-editor-08-preedit', { geometry: false });
  await cdp.send('Input.insertText', { text: 'に' });
  await waitUntil('the commit is in the text', async () => (await h.lineText(2)) === `に${lines[1]}`);
  await cdp.detach();

  // A line with wide characters is placed by its text, not by the grid: where its caret is, what a press lands on, what a selection covers.
  await toTop();
  await h.click(await h.boundaryAt(3, 0));
  await page.evaluate((comment) => navigator.clipboard.writeText(comment), WIDE_COMMENT);
  await h.press('KeyV', ['Meta']);
  await waitUntil('the comment is in the third line', async () => (await h.lineText(3)) === WIDE_COMMENT);
  const wideCaret = async (offset) => demo('textCaret', 'code-line-3', offset, 'after');
  const wideColumns = ((await wideCaret(WIDE_COMMENT.length)).x - (await wideCaret(0)).x) / grid.advance;
  check('The line is one Text and its caret at the end is where the text puts it (the width in columns is recorded: a Web build has no font for these characters)', near((await find('code-caret')).rect.x, (await wideCaret(WIDE_COMMENT.length)).x, COLUMN_TOLERANCE_PX), { wideColumns, codeUnits: WIDE_COMMENT.length });
  // A press at the place of the one before it, soon after, is a double click: each of these is begun after a pause.
  const apart = () => new Promise((resolve) => setTimeout(resolve, CLICK_SEQUENCE_PAUSE_MS));
  const wideY = (await find('code-line-3')).rect.y + grid.lineHeight / 2;
  const between = async (from, to, share) => ({ x: (await wideCaret(from)).x + share * ((await wideCaret(to)).x - (await wideCaret(from)).x), y: wideY });
  for (const [share, landed] of [[BELOW_HALF, WIDE_FIRST_START], [ABOVE_HALF, WIDE_FIRST_END]]) {
    await apart(); await h.click(await between(WIDE_FIRST_START, WIDE_FIRST_END, share));
    const position = await h.statusPosition();
    check(`A press ${share * 100} percent across an emoji lands on offset ${landed}`, position?.line === 3 && position.column === landed, position);
    check('and the caret is drawn where the text puts it', near((await find('code-caret')).rect.x, (await wideCaret(landed)).x, COLUMN_TOLERANCE_PX), (await find('code-caret')).rect);
  }
  await apart(); await h.click(await between(WIDE_FIRST_START, WIDE_FIRST_END, BELOW_HALF));
  await h.press('ArrowRight');
  check('Right moves over the emoji, both its code units', (await h.statusPosition())?.column === WIDE_FIRST_END, await h.statusPosition());
  await apart(); await h.click(await between(WIDE_FIRST_START, WIDE_FIRST_END, BELOW_HALF));
  await h.press('ArrowRight', ['Shift'], EMOJI_COUNT);
  await h.press('KeyC', ['Meta']);
  await frames();
  check('The three emoji are on the clipboard', (await h.clipboard()) === WIDE_COMMENT.slice(WIDE_FIRST_START, WIDE_RUN_END), { clipboard: await h.clipboard(), status: await h.statusPosition() });
  const wideSpans = (await h.spansOf('code-line-3')).filter((span) => span.inlay === undefined && String(span.style.backgroundColor ?? '').length > 0);
  check('and the selection is the background of the span over exactly them', wideSpans.length === 1 && wideSpans[0].start === WIDE_FIRST_START && wideSpans[0].end === WIDE_RUN_END, wideSpans);
  await capture('code-editor-09-wide', { geometry: false });

  // Reset puts every file back.
  await context.click('code-reset');
  await waitUntil('the page to be as it was', async () => (await h.pageBackground()) === PAGE_BACKGROUND, UPDATE_DEADLINE_MS);
  await waitUntil('the source again', async () => {
    for (const number of (await h.drawnLines()).keys()) if ((await h.lineText(number)) !== lines[number - 1]) return false;
    return true;
  }, UPDATE_DEADLINE_MS);
  check('The counter kept its count through the reset', (await text('inputs-next')) === 'Next 3', await text('inputs-next'));

  // The panel open and not focused asks for no frames.
  await context.click('lab-title');
  await frames();
  check('An editor that has lost the focus draws no caret', !(await nodeExists('code-caret')));
  await waitUntil('the process to go idle', async () => !(await demo('surfaceProcessing')), UPDATE_DEADLINE_MS);
  check('With the panel open and unfocused the root asks for no frames', !(await demo('surfaceProcessing')));
}

/** The panel on a page with touch: a tap places the caret and brings the soft keyboard up, whose keys edit the code, and a pan scrolls it. */
export async function runTouchCodeEditorScenario(context) {
  const h = helpers(context);
  const { demo, page, frames, check, nodeExists, text, waitUntil } = h;
  const { capture } = context;
  const source = await demo('labSource', 'inputs');
  const lines = source.split('\n');
  await demo('showNavigator', { initialLab: 'inputs' });
  await waitUntil('the navigator on the touch page', () => nodeExists('lab-header'));
  const tap = async (logical) => {
    const point = await context.pagePoint(logical.x, logical.y);
    await page.touchscreen.tap(point.x, point.y);
    await frames();
  };
  await tap(await h.centerOf('toggle-code'));
  await waitUntil('the first line of code', () => nodeExists('code-line-1'));
  if (await nodeExists('code-read-only')) {
    check('Without the compiler the touch page says plainly why the code is read-only', /^Read-only\. /u.test(await text('code-read-only')));
    return;
  }
  const facts = await demo('platformFacts');
  check('The touch page has the virtual keyboard and no IME', facts.virtualKeyboard === true && facts.ime === false, facts);
  const grid = await h.grid();
  const content = (await context.find('code-content')).rect;
  // A tap puts the caret at the column and brings the soft keyboard up.
  const at = await h.boundaryAt(4, 7);
  await tap({ x: at.x - grid.advance * 0.3, y: at.y });
  const position = await h.statusPosition();
  check('A tap puts the caret at the column', position?.line === 4 && position.column === Math.min(7, (lines[3] ?? '').length), position);
  const caret = (await context.find('code-caret')).rect;
  check('and the caret is on its pixel', near(caret.x, content.x + grid.gutterWidth + position.column * grid.advance), caret);
  await waitUntil('the engine focuses its hidden DOM element', async () => page.evaluate(() => {
    const active = document.activeElement;
    return (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') && active.style.display === 'block';
  }));
  check('The soft keyboard is up for the editor', true);
  // The keyboard's keys edit the code, and the editor's input never holds text.
  await page.keyboard.type('XY');
  await waitUntil('the typed letters are in the line', async () => ((await h.lineText(4)) ?? '').includes('XY'));
  const typed = (await h.lineText(4)) ?? '';
  check('and they stand where the caret was', typed === `${(lines[3] ?? '').slice(0, position.column)}XY${(lines[3] ?? '').slice(position.column)}`, typed);
  await page.keyboard.type('Z');
  await waitUntil('a third letter follows the first two, not the keyboard\'s whole text again', async () => ((await h.lineText(4)) ?? '').includes('XYZ'));
  await page.keyboard.press('Backspace');
  await waitUntil('Backspace takes one off', async () => !((await h.lineText(4)) ?? '').includes('XYZ') && ((await h.lineText(4)) ?? '').includes('XY'));
  await capture('code-editor-10-touch', { geometry: false });
  // A tap in another place moves the caret, and a pan scrolls the code and leaves the caret where it is.
  const other = await h.boundaryAt(6, 3);
  await tap({ x: other.x - grid.advance * 0.3, y: other.y });
  const moved = await h.statusPosition();
  check('A second tap moves the caret', moved?.line === 6 && moved.column === 3, moved);
  const scroller = (await context.find('code-scroll')).rect;
  const from = await context.pagePoint(scroller.x + scroller.width / 2, scroller.y + scroller.height - 20);
  await page.touchscreen.touchStart(from.x, from.y);
  for (let step = 1; step <= 6; step += 1) {
    await page.touchscreen.touchMove(from.x, from.y - step * 40);
    await frames();
  }
  await page.touchscreen.touchEnd();
  await frames();
  const drawn = await h.drawnLines();
  check('A pan scrolls the code', !drawn.has(1), [...drawn.keys()]);
  const afterPan = await h.statusPosition();
  check('and does not move the caret', afterPan?.line === 6 && afterPan.column === 3, afterPan);

  // A long press selects the word under the finger and shows the handles and the menu the editor draws itself (docs/tracks/touch-selection.md); the
  // soft keyboard comes back when the finger lifts, the menu's Copy writes the browser's clipboard, and a finger that goes on moving extends the selection.
  await demo('scrollTo', 'code-scroll', 0);
  await frames();
  const finger = await page.createCDPSession();
  const touch = async (type, point) => {
    const at = await context.pagePoint(point.x, point.y);
    await finger.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: at.x, y: at.y, id: 1 }] });
    await frames();
  };
  const rest = (ms) => page.evaluate((duration) => new Promise((resolve) => setTimeout(resolve, duration)), ms);
  const lineIndex = lines.findIndex((line, index) => index >= 3 && /[A-Za-z]{5,}/u.test(line));
  const match = /[A-Za-z]{5,}/u.exec(lines[lineIndex] ?? '');
  check('The lab source has a word to select', lineIndex >= 0 && match !== null, lines.slice(0, 8));
  const wordLine = lineIndex + 1;
  const picked = match[0];
  const inWord = await h.boundaryAt(wordLine, match.index + 2);
  await touch('touchStart', inWord);
  await rest(250);
  check('Before the hold has elapsed nothing is selected', !(await nodeExists('code-handle-start')));
  await rest(900);
  check('A long press selects the word under the finger and shows its handles', (await nodeExists('code-handle-start')) && (await nodeExists('code-handle-end')));
  await touch('touchEnd', inWord);
  await waitUntil('the editor\'s menu is shown', () => nodeExists('code-touch-menu-copy'));
  await waitUntil('the soft keyboard is back with the finger\'s lift', async () => page.evaluate(() => {
    const active = document.activeElement;
    return (active?.tagName === 'TEXTAREA' || active?.tagName === 'INPUT') && active.style.display === 'block';
  }));
  check('The soft keyboard stays up through the selection', true);
  const startStem = (await context.find('code-handle-start-stem')).rect;
  const wordStart = await h.boundaryAt(wordLine, match.index);
  check('The start handle stands on the word\'s start', Math.abs(startStem.x + startStem.width / 2 - wordStart.x) <= 1.5, { startStem, wordStart });
  await capture('code-editor-11-touch-selection', { geometry: false });
  const copy = await h.centerOf('code-touch-menu-copy');
  await touch('touchStart', copy);
  await touch('touchEnd', copy);
  check('Copy in the menu writes the selected word to the browser\'s clipboard', await page.evaluate(() => navigator.clipboard.readText()) === picked, picked);
  const scrolledBefore = (await context.find('code-scroll')).scroll.scrollTop;
  const heldAt = await h.boundaryAt(wordLine, match.index + 2);
  await touch('touchStart', heldAt);
  await rest(1100);
  const lower = { x: heldAt.x, y: heldAt.y + 2 * grid.lineHeight };
  for (let step = 1; step <= 4; step += 1) await touch('touchMove', { x: heldAt.x, y: heldAt.y + (lower.y - heldAt.y) * step / 4 });
  await touch('touchEnd', lower);
  check('A finger that selected by holding does not pan the editor', (await context.find('code-scroll')).scroll.scrollTop === scrolledBefore);
  await waitUntil('the menu is back', () => nodeExists('code-touch-menu-copy'));
  const copyAgain = await h.centerOf('code-touch-menu-copy');
  await touch('touchStart', copyAgain);
  await touch('touchEnd', copyAgain);
  const extended = await page.evaluate(() => navigator.clipboard.readText());
  check('and extends the selection down the lines', extended.startsWith(picked) && extended.includes('\n'), extended.slice(0, 40));
  await tap(await h.boundaryAt(wordLine + 1, 4));
  check('A tap elsewhere hides the handles and the menu', !(await nodeExists('code-handle-start')) && !(await nodeExists('code-touch-menu')));
}

