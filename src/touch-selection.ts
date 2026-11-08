/**
 * The numbers of touch text selection (plan D71, `docs/tracks/touch-selection.md`) that JS needs. The root draws the handles and the edit
 * menu of a selection in a `Text` or a `TextInput` itself (`native/touch_selection.rs`); the code editor owns its selection, in
 * CodeMirror, and draws its own, which must time and look the same. `tests/touch-selection.test.ts` holds this file to the same values
 * as the Rust one.
 */

/** How long a finger stays down, nearly still, before the word under it is selected: iOS's long press and Android's, both 500 ms. */
export const TOUCH_SELECT_HOLD_MS = 500;
/** How far a finger may travel and still be holding (`TOUCH_SLOP_PX` in `native/scroll.rs`: Android's 8 dp). */
export const TOUCH_SLOP_PX = 8;

export const HANDLE_STEM_WIDTH_PX = 2;
export const HANDLE_BALL_RADIUS_PX = 6;
/** The square a finger grabs a handle by, centred on its ball. */
export const HANDLE_TOUCH_TARGET_PX = 44;
export const HANDLE_RING_WIDTH_PX = 1;

export const MENU_HEIGHT_PX = 38;
export const MENU_ITEM_PADDING_PX = 14;
export const MENU_RADIUS_PX = 10;
export const MENU_GAP_PX = 6;
export const MENU_EDGE_MARGIN_PX = 8;
export const MENU_FONT_SIZE_PX = 14;

/** The menu's paint: slate-900 with white labels, slate-700 under a pressed segment and slate-600 between segments. */
export const MENU_BACKGROUND = '#0f172a';
export const MENU_LABEL = '#ffffff';
export const MENU_PRESSED = '#334155';
export const MENU_DIVIDER = '#475569';
/** A 1 px ring round the menu, so it shows on a dark surface. */
export const MENU_BORDER = '#334155';
export const MENU_BORDER_WIDTH_PX = 1;
/** The handles' colour when nothing styles the selection: blue-500, the default selection colour at full opacity. */
export const HANDLE_COLOR = '#3b82f6';
export const HANDLE_RING_COLOR = '#fffffff2';
