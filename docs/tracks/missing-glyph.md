# Track: missing glyphs, and the system font fallback

Branch `missing-glyph`, based on main `07d9f33`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the paragraph for the
README is at the end). Ben's two questions: why is a character no font has a blank gap inside a coloured span when the same character in plain text is a hex box, and is there no way to fall back to
the system font, as a browser does. Findings 1 to 3 below, each with the command and the raster it rests on. Pictures are in `artifacts/missing-glyph-compare/` (git-ignored, like the rest of `artifacts/`):
`1`, `2` the hex box plain and in a span at device pixel ratios 1 and 2; `3` the same with the branch removed; `4` Han before and after; `5` Thai in letter-spaced text before and after; `6` the code editor's
CJK comment before and after; `7` the Web.

## Result

| Question | Answer |
| --- | --- |
| The missing-glyph branch | Ported, for the main loop. `TextServer::shaped_text_draw` has **no** such branch for the ellipsis glyphs (read in both engines, identical), so there is none for them here either. |
| Does native system fallback work? | **Emoji, Thai, Arabic, Devanagari and Hangul: yes** (Apple Color Emoji, Thonburi, Geeza Pro, Kohinoor Devanagari, Apple SD Gothic Neo). **Han: no, on macOS 26.3, on Breaka's 4.8 and on stock 4.7.2 alike**, plain, in a span and in the code editor. The earlier observation stands. |
| Why Han fails | The engine asks CoreText for one font file and gets `PingFangUI.ttc`, whose outlines are an `hvgl` table that FreeType cannot open. Not our code. |
| Fix | In our reach: the demo's faces get a `SystemFont` fallback of families FreeType can read (`Hiragino Sans GB`, picked on this machine as `Hiragino Sans GB W3`, on both engines). The engine cannot be changed. |
| A bug found on the way | Letter-spaced text drew a glyph from a font the text server found by itself (Thai, Thonburi) as thick as the spacing is wide. Fixed (`native/text_paragraph/found.rs`). |
| The Web | No system fonts (`OS_Web` does not report `system_fonts`). Han and Thai are the hex box in plain text, in a span and letter-spaced. Verified in Chrome after this branch. |

## 1. The missing-glyph branch

Engine source lines below are Breaka's 4.8 tree (`/Users/ben/Development/godot`); stock 4.7.2 has the same code (`shaped_text_draw` diffed identical; the rest read in `/Users/ben/Development/godot-stock/src/godot`).

`draw_glyphs` (`native/text_paragraph/draw.rs`) is our copy of the loop in `TextServer::shaped_text_draw` (`servers/text/text_server.cpp:1750`), used when a line is drawn glyph by glyph (spans with colours, letter-spacing).
The server's loop, for a glyph whose `font_rid` is empty, calls `draw_hex_code_box` when `hex_codes` (the line's `preserve_control || preserve_invalid`) is set and the glyph is neither `GRAPHEME_IS_VIRTUAL` nor
`GRAPHEME_IS_EMBEDDED_OBJECT`. Ours called `font_draw_glyph` with the empty font, which draws nothing. `shaped_text_draw` is identical in 4.7.2 and 4.8 (diffed).

What was done:
- `ShapedGlyph` carries `flags` (the `GraphemeFlag` bits from the glyph dictionary, `is_virtual()`, `is_embedded_object()`), and `ShapedLine` carries `hex_codes`. `hex_codes` is read from the **line's** shaped text, as the server reads it
  (the line, not the paragraph: `TextServerAdvanced::_shaped_text_substr` does not copy the flags, so a line has the defaults, `preserve_invalid` true). It is read only for a line that has a glyph with no font, so a line without one costs no call.
- `draw_hex_code_box(canvas, glyph.size, position, glyph.index, colour)` is drawn in the colour of the glyph's cluster (a span's own colour), the pen advances as before.
- The glyph cache is `ShapedParagraph` (`native/text_layout/paragraph.rs`): it holds `ShapedLine`s, so it carries both. `native/text_measure.rs` caches sizes only (what a text answered Taffy with); a missing glyph's advance is
  in the server's size already, so it needs nothing.
- **Ellipsis.** The brief said to port the branch for the ellipsis glyphs too. The server's two ellipsis loops (`text_server.cpp:1766` and `1832`) call `font_draw_glyph` only, and the ellipsis is made of
  `dot_gl_font_rid` only if that font is valid (`text_server_adv.cpp:6304`: the glyph index and advance are computed only when `dot_gl_font_rid.is_valid()`), so an ellipsis glyph always has a font. A faithful port adds nothing there; the doc comment of `draw_glyphs` says so.

Checks:
- `cargo test text_paragraph`: 3 tests in `draw.rs` (a character no font has is a box when the line asks for hex codes and not otherwise; a virtual glyph and an embedded object are not boxes; other flags do not stop one) and 4 in `found.rs`.
- The rich-text section, page `glyphs` (`demo/src/rich-text-data.ts`, `demo/src/verify-rich-text.ts` `verifyGlyphs`): U+E000 in plain text and in a coloured span, in the family `bare`, which is Open Sans with the engine's system
  fallback **off** and nothing behind it (`demo/src/demo-fonts.ts`). The text server's own answer is asserted first: `fontsOfText('bare', U+E000)` has no font. U+E000 cannot be used with the fallback on: on this machine the engine
  resolves it to `.LastResort` (the log line `withSystemFallback`), which is why the family exists. Both are cropped to their ink and compared level by level: the same box, 11x15 px at ratio 1 and 22x30 at ratio 2, the size
  `TextServer.getHexCodeBoxSize` gives, in the span's red, difference 0. A box of another character is another box (a control inside the check, `expectFailure`).
  The box in the span is in the same place as the plain one at ratio 1 (`boxShift` x 0, y 0) and one device pixel below it at ratio 2 (x 0, y 1): a line drawn glyph by glyph has its baseline snapped to a device pixel (`draw_lines`, as a browser draws it) and the
  server's box is at the baseline as laid out. The check allows that one pixel and no more.
- **Negative control** (`--no-retry`): the branch disabled with a throwaway `&& false`, native rebuilt, `node scripts/verify.mjs --interaction --only=rich-text --no-retry`:
  `ERROR: [JS] GODOT_REACT_VERIFY_FAILED Error: glyph-box-span: nothing is drawn at ratio 1` (`artifacts/logs/nc1-rich-text.log`; picture `3`: the plain box, the span's row empty). The source was restored by `git checkout` and rebuilt.
- A mistake of mine on the way, found by the check itself: `ResourceLoader.load` answers one cached resource per file, so `bare` loaded from `OpenSans-Variable.ttf` was the same `FontFile` as `sans`, and setting its `allowSystemFallback` off
  took the fallback off `sans` and left the Han fallback on `bare`. `bare` is loaded uncached (`CacheModeIgnore`).

## 2. Does system-font fallback work natively?

**Established, not assumed.** The engine's lookup is `TextServerAdvanced::_shape_run` (`text_server_adv.cpp:7081`) to `_find_sys_font_for_text` (`:6014`) to `OS::get_system_font_path_for_text`; it runs when `OS::has_feature("system_fonts")` and the first
font allows it (`allow_system_fallback`, default true, `text_server_adv.h:300`; the demo's faces also set it explicitly). A headless script shaping one character with a `FontFile` of Open Sans
(`/Applications/Godot48.app/Contents/MacOS/Godot --headless --audio-driver Dummy --script probe.gd`, and `/Users/ben/Development/godot-stock/bin/godot-stock` for 4.7.2; both engines answer the same):

| Character | Font the server resolves it to |
| --- | --- |
| Latin | Open Sans |
| U+4E2D (Han), also with language `ja` | **none** (`font_rid` empty), also with `allow_system_fallback` false |
| Emoji | Apple Color Emoji |
| Thai U+0E01, Arabic U+0639, Devanagari U+0915, Hangul U+D55C | Thonburi, Geeza Pro, Kohinoor Devanagari, Apple SD Gothic Neo |
| U+E000, U+F8FF | `.LastResort`, Helvetica |

So the fallback works, except for Han, here. **Cause, read from source and the files, not guessed:**
1. `OS_MacOS::get_system_font_path_for_text` (`platform/macos/os_macos.mm:671`) asks CoreText (`CTFontCreateForString`) and returns the one path of the font it answers. For Han, with any family name,
   on this machine (macOS 26.3): `/System/Library/PrivateFrameworks/FontServices.framework/Resources/Reserved/PingFangUI.ttc` (61,081,560 bytes, 32 faces). `OS.get_system_font_path("PingFang SC")`, `TC` and `HK` are the same file.
2. Its font tables (read from the file): `BASE GSUB HVAR OS/2 STAT VORG avar cidg cmap fvar head hhea hmtx hvgl maxp meta name post trak vhea vmtx`. There is no `glyf`, `CFF` or `CFF2`: the outlines are an `hvgl` table.
3. FreeType in both engines cannot open any of its 32 faces (`FreeType: Error loading font: '' (face_index=N)`, shown by `font_set_face_index` over every face then `font_has_char`). `_find_sys_font_for_text`
   (`text_server_adv.cpp:6045` to `6190`) tests each face with `_font_has_char`, finds none and `continue`s, returns an invalid RID, and the shaper makes a hex box. It asks for one path only; there is no second candidate.
4. Emoji is not found this way: the script `Zsye` names `Apple Color Emoji` outright (`text_server_adv.cpp:6036`).

The fonts FreeType does open and that have U+4E2D, from shaping the character into every one of the 214 families `OS.get_system_fonts()` lists: Arial Unicode MS, GB18030 Bitmap, Heiti SC, Hiragino Maru Gothic ProN, Hiragino Mincho ProN,
Hiragino Sans, Hiragino Sans GB, Songti SC, Apple SD Gothic Neo, AppleGothic, AppleMyungjo. No PingFang.

**Rasters, native, Breaka 4.8 and stock 4.7.2** (`node scripts/verify.mjs --interaction --only=rich-text` and `--only=code-editor`, `--no-retry`, with the demo's Han fallback taken out as a throwaway; both fail at the check, after their
capture, with `macOS has system fonts with Han characters (Hiragino Sans GB), and the demo's faces fall back to one` and `... [null,null]`): picture `4`, top row: U+4E2D in plain text, in a span and letter-spaced is the hex box `4E2D`, the same box as the
`bare` family's. Picture `6`, top: the code editor's comment `// emoji 日本 ok`, the two CJK characters are two boxes (with the branch of finding 1; before it, in a span, nothing). The emoji draw.

**The fix.** The engine's lookup cannot be changed (neither engine may be patched; the library may not rely on engine patches), and the font it picks is the engine's. What is ours is the fonts the owner registers, which is how the
code-editor track already put it ("registering a CJK font is the owner's choice"). `registerDemoFonts` (`demo/src/demo-fonts.ts`) gives every demo face `fallbacks = [SystemFont]` with `fontNames`
`Hiragino Sans GB`, `Microsoft YaHei`, `Noto Sans CJK SC`, `WenQuanYi Micro Hei` (the first the system has is used) where `OS.hasFeature('system_fonts')`. The engine's own system fallback stays on behind it (emoji, Thai). `fontsOfText(family, text)` asks the
text server which font each character resolves to; on this machine, on both engines: **`Hiragino Sans GB W3`** for Han (and `Thonburi` for Thai, `.LastResort` for U+E000 where the fallback is on).
Picture `4`, bottom row, and `6`, bottom: U+4E2D is a glyph in plain text, in a span and letter-spaced, **pixel for pixel the same** (difference 0 at ratio 1 and 2: 12x14 px at 1, 25x30 at 2), not the box (a different size and different pixels), in the
span's colour; the code editor's comment has 73 ink pixels under the two characters, resolved to the font. The Windows and Linux family names are untested (no such machine). The Web has none of these fonts, so `createHanFallback` makes nothing there.

**`drawn_as`, the glyph cache, the font flag.** `drawn_as` keeps a glyph's own font RID when the font is not in the paragraph's (shaping, drawing) pairs (`map_or(font, ...)`). A `SystemFont` fallback *is* in the pairs (the lists
`Font.get_rids()` gives of the shaping and the drawing font include their fallbacks, in the same order), and the letter-spaced Han glyph equals the plain one. The glyph cache holds each glyph's `font` and drops none. The font flag is right. But the case
the first sentence leaves is real, and it was a bug:

**Bug: a font the text server finds by itself is drawn emboldened in letter-spaced text.** A letter-spaced text is shaped with a font that carries the spacing as an embolden strength and drawn with the one that does not (`fonts.rs`). A font
the server finds on the system is made for the shaping font and has *its* embolden: shaping U+0E01 with a `FontVariation` of embolden 0, 1.6 and 4 answers three Thonburi fonts (RIDs differ) with embolden 0, 1.6 and 4, glyph index 29 in each, on both
engines (`probe7.gd`). That font is not in the pairs, so it was drawn as it is, as thick as the spacing is wide: picture `5`, top, a solid red block where plain text has a thin glyph; the check failed on it with
`glyph-thai-tracked: the glyph from Thonburi in letter-spaced text is Infinity levels from the plain text's at ratio 1` (the negative control of this fix: that run is the unfixed code, `artifacts/logs/rich-text-3.log`).
The fix is at the layer that made the font list: a paragraph with a glyph of a font its pairs do not list is shaped once more with the drawing fonts, and each such glyph is matched, by where its cluster starts and its glyph index, to the glyph the second shaping has;
the font of that glyph is what draws it (`native/text_paragraph/found.rs`, 4 unit tests, a font with no match is an error and not a bold glyph). Picture `5`, bottom, and `glyph-thai-tracked` difference 0 at both ratios. A paragraph with no such glyph shapes nothing again.

## 3. The Web (facts; nothing was built for it)

- `OS_Web::has_feature` (`platform/web/os_web.cpp:172` to `184`) answers `web_*` features from the user agent and nothing else; `"system_fonts"` is reported only by `platform/macos/os_macos.mm:998`, `platform/windows/os_windows.cpp:2534`,
  `platform/linuxbsd/os_linuxbsd.cpp:585`, `platform/android/os_android.cpp:897` and **`drivers/apple_embedded/os_apple_embedded.mm:755`, which is iOS: the brief had iOS not reporting it, and it does** (it has its own `get_system_fonts` and
  `get_system_font_path_for_text`). The base `OS::get_system_fonts` and `get_system_font_path_for_text` (`core/os/os.h:211`) answer nothing. Stock 4.7.2 is the same. A WebGL page cannot read the browser's font files, so there is nothing to ask.
- After this branch, in Chrome (`node scripts/verify-interaction-web.mjs --only=rich-text,code-editor`, the Breaka debug export, four viewports): Han in plain text, in a span and letter-spaced is the hex box `4E2D` in all three, and Thai the same box plain
  and letter-spaced, and U+E000 the same box plain and in a span, at ratios 1 and 2 (24 assertions, `glyphs: ...`, `scripts/verify-rich-text-web.mjs`). Picture `7`. The code-editor section passes; its CJK comment is two boxes there.
- Chrome's Local Font Access API, as a fact and not a plan, and not run here: `window.queryLocalFonts()` is Chromium only (Chrome and Edge 103 and later), needs a secure context, a user gesture and the `local-fonts` permission (a prompt), and
  returns `FontData` objects whose `blob()` is the font file's bytes. Those bytes could be handed to the engine as a `FontFile.data` through the JavaScript bridge. Safari and Firefox do not have it, a Han font is 20 to 60 MB, and the permission is per
  origin. It would feed the engine a font; the engine's own fallback would still not be a browser's.

## Decisions

M1. **Faithful, so no ellipsis branch** (finding 1). **M2. The Han fallback is the demo's, not the library's.** The library has no fonts of its own, and a hidden 20 MB fallback in `registerFontFace` would be a cost for everyone; the owner's choice, as
the demo registers its Latin fonts. **M3. One `SystemFont` shared by every demo face**, read once at registration (`Hiragino Sans GB`: 23,520,908 bytes); the Web, which has no system fonts, makes none. **M4. A guaranteed-missing character
needs a font with no fallback at all**, not a character the machine happens to lack: U+E000 is `.LastResort` here. **M5. The twin font is found by shaping again**, not by creating a font: the advanced server's linked variation carries only spacing and
baseline offset, `font_set_embolden` on the found font clears its glyph cache and would change the shaping of every later paragraph, and a copy needs the font's bytes, which the server does not give back.

## What was run on the final tree

Rust has not changed since the first commit (`git diff 667791e -- native` is empty). Heavy commands went through the gate; logs are in `artifacts/logs/` (git-ignored).

| Command | Result |
| --- | --- |
| `cargo fmt --check` | clean |
| `cargo test` | 885 passed (878 on main, plus 3 in `draw.rs` and 4 in `found.rs`) |
| `cargo clippy --all-targets -- -D warnings` | clean |
| `pnpm test:types` | clean |
| `pnpm test` | 921 pass, 0 fail |
| `node scripts/verify.mjs --interaction --only=rich-text --renderer=mobile` and `--renderer=forward_plus` (Breaka 4.8) | both PASSED; the same numbers (`boxDifference` 0, `boxShift` y 0 at ratio 1 and 1 at ratio 2, `Hiragino Sans GB W3`) |
| `node scripts/verify.mjs --interaction --only=text-styles,rich-text,code-editor,navigator` (Breaka 4.8, `runtime v4.8.beta`) | PASSED landscape and portrait; `sectionMs` navigator 38.7 s, text-styles 88.1 s, rich-text 12.4 s, code-editor 60.9 s (landscape); `boxShift` y 0 at ratio 1, y 1 at ratio 2; `cjk` fonts `Hiragino Sans GB W3` x 2, 73 ink pixels |
| the same with `--engine=stock` (4.7.2, `runtime v4.7.2.stable`) | PASSED landscape and portrait; the same numbers and the same fonts |
| `pnpm build:web` (default profile, debug), then `--export-only` after each later change to the demo | built; the side module is from these sources |
| `node scripts/verify-interaction-web.mjs --only=rich-text,code-editor` | PASSED, 289 assertions, 24 of them `glyphs: ...` (6 per viewport, four viewports) |
| negative control, branch removed (`&& false`), rebuilt, `--only=rich-text --no-retry` | failed: `glyph-box-span: nothing is drawn at ratio 1` |
| the Han fallback taken out (throwaway), both engines, `--no-retry` | both sections fail at the check, after their capture: `macOS has system fonts with Han characters (Hiragino Sans GB), and the demo's faces fall back to one`, `... [null,null]` |

The sections were run in one window after another (navigator and text-styles before rich-text and code-editor), not alone. The stock Web profile and the sections this branch does not touch were not run (the coordinator's regression covers them).

## Not verified, and what stays

- Windows and Linux (the Han family list), a different macOS (fonts that FreeType does open for Han may be what CoreText answers there, and then the demo's fallback is a second source for the same glyphs).
- The Web with the stock engine, and the release export (the default debug export was verified).
- A glyph of a server-found font in the **ellipsis** of letter-spaced text is still drawn emboldened (an ellipsis glyph has no cluster to match, and no demo family lacks `…`).
- The start-up cost of reading the 23.5 MB font in the demo was not measured.
- A paragraph with letter-spacing and a server-found font shapes its text once more every time it is painted; not measured, and it is the corner of a corner.
- The `docs/tracks/code-editor.md` limit "the CJK characters leave a gap" is out of date for the native demo (this branch does not edit another track's notes).

## Reproducing it

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo test text_paragraph && pnpm build:native
node scripts/verify.mjs --interaction --only=rich-text,code-editor [--engine=stock] [--no-retry]
pnpm build:web && node scripts/verify-interaction-web.mjs --only=rich-text,code-editor
```
The log lines are `GODOT_REACT_RICH_TEXT_GLYPHS {...}` (fonts picked, sizes, differences, the box's shift) and `"cjk"` in the code editor's facts. The headless probes of finding 2 are 30-line GDScripts: shape a character with `TextServer.shaped_text_add_string`
and print the `font_rid` of each glyph.

## README text

Missing glyphs and system fonts. A character no font has is the engine's hex box in plain text and, drawn glyph by glyph (coloured spans, letter-spacing), the same box in the span's colour. A text asks the platform's system fonts for a character
its fonts lack (native: macOS, Windows, Linux, Android, iOS; not the Web, which has none and shows the box). That is the engine's own fallback, and it can fail for a platform's font: macOS 26 answers for Han with a font FreeType cannot open, so a face that
should show CJK adds a `SystemFont` of families it can read to its `fallbacks` (`demo/src/demo-fonts.ts`). Letter-spacing does not embolden a glyph from a font the engine found on the system.
