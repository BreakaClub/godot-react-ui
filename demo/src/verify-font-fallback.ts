import { OS } from 'godot';
import type { NativeSnapshotNode } from '../../src/native';
import { fallbackNamesOf, fontsOfText } from './demo-fonts';
import type { FontSlicesLabProps } from './font-slices-lab';
import { settleFrames } from './verify-filters';
import { assertionTally } from './verifier-input';

/**
 * The `font-fallback` section of the interaction verifier: the fonts for characters no registered font has are found when the
 * text that has them first appears, and not before. Where the platform has system fonts (macOS, Windows, Linux, Android, iOS) the root looks for one that
 * FreeType can read; the section holds that to what it promises:
 *
 * - before any such text is shown the registered faces have no fallback, so nothing was read from disk at start (the demo used to read a 23.5 MB system
 *   font at every start, for every face);
 * - showing a line of Chinese gives the faces a system font, and the text server resolves the Han characters to it (on macOS, where a system font with Han
 *   characters is known to exist);
 * - the face that turned `allow_system_fallback` off (`bare`) has none and its characters are still missing;
 * - a character no font has (a private use character) adds nothing and does not loop: the fonts stay as they were after the frames that follow.
 *
 * It runs before every section that shows such text (a face keeps what was added for as long as the process runs), so a run that names only the sections
 * after it does not start from the state this one needs; `--only=font-fallback` and the full run do.
 */
export interface FontFallbackInspection {
  find(testID: string): NativeSnapshotNode | undefined;
  showFontSlices(props: FontSlicesLabProps): void;
  /** Mounts the demo app again: the section runs first in a full run, and the `events` section after it starts from the app's tabs. */
  restoreDemo(): void;
}

const HAN_CHARACTER = 0x4e2d;
const PRIVATE_USE_CHARACTER = 0xe000;
/** Rounds of settling the root is left in after text appears: a loop that adds a font every frame would show in them. */
const IDLE_ROUNDS = 6;

async function idle(): Promise<void> {
  for (let round = 0; round < IDLE_ROUNDS; round += 1) await settleFrames();
}

function assert(condition: unknown, message: string): asserts condition {
  assertionTally.count += 1;
  if (!condition) throw new Error(message);
}

export async function verifyFontFallback(api: FontFallbackInspection): Promise<void> {
  const hasSystemFonts = OS.hasFeature('system_fonts');
  const before = fallbackNamesOf('sans');
  assert(before.length === 0, `Before any text with characters no font has is shown the sans face has fonts behind it: ${JSON.stringify(before)}`);

  api.showFontSlices({ sample: 'latin' });
  await idle();
  assert(fallbackNamesOf('sans').length === 0, 'A line every font has the characters of added a fallback');

  api.showFontSlices({ sample: 'simplified' });
  await idle();
  assert(api.find('fs-plain') !== undefined, 'The lab shows its line');
  const after = fallbackNamesOf('sans');
  const han = fontsOfText('sans', String.fromCodePoint(HAN_CHARACTER));
  if (hasSystemFonts) {
    assert(after.length > 0, 'A line of Chinese was shown and the platform has system fonts, and the sans face has no font behind it');
    assert(fallbackNamesOf('mono').length === after.length && fallbackNamesOf('serif').length === after.length, 'Every registered face has what was added');
    if (OS.getName() === 'macOS') assert(han.length === 1 && han[0] !== undefined, `macOS has a system font with Han characters, and the text server resolves U+4E2D to none: ${JSON.stringify(han)}`);
  } else {
    assert(after.length === 0, `The platform has no system fonts, and the faces have fonts behind them: ${JSON.stringify(after)}`);
  }

  const bare = fallbackNamesOf('bare');
  assert(bare.length === 0, `The face that allows no fallback has fonts behind it: ${JSON.stringify(bare)}`);
  assert(fontsOfText('bare', String.fromCodePoint(HAN_CHARACTER)).every(font => font === undefined), 'The face that allows no fallback has a font for U+4E2D');

  // A character no font has: nothing to add, and no loop of adding.
  const fontsNow = fallbackNamesOf('sans');
  api.showFontSlices({ sample: 'unmapped' });
  await idle();
  assert(fontsOfText('bare', String.fromCodePoint(PRIVATE_USE_CHARACTER)).every(font => font === undefined), 'A private use character has a font in the face with no fallback');
  assert(JSON.stringify(fallbackNamesOf('sans')) === JSON.stringify(fontsNow), `A character no font has changed the fonts behind the sans face: ${JSON.stringify(fontsNow)} to ${JSON.stringify(fallbackNamesOf('sans'))}`);
  console.log(`GODOT_REACT_FONT_FALLBACK ${JSON.stringify({ hasSystemFonts, before, after, han: han[0] ?? null })}`);
  // Leave the demo as the run started it: the next section (`events`) clicks the app's tabs.
  api.restoreDemo();
  await idle();
}
