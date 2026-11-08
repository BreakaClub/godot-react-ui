# Track: font slices (a Web page whose text needs a character no font has downloads the font that has it)

Branch `font-slices`, based on main `07d9f33`. Notes and report for the coordinator; `docs/INTERACTION_PLAN.md`, `docs/INTERACTION_PROGRESS.md` and `README.md` are not edited here (the README text is at the end).
Nothing is deployed and no remote R2 write was made: the deploy work is code, tests, a dry run and a run against wrangler's local R2 state.

Ben's goal: missing glyphs on the Web behave like a browser's font fallback. When text needs characters that the registered fonts and their fallbacks do not have, the page downloads only
the font slice that covers them, adds it as a fallback, and the text is shaped and laid out again with real glyphs. Nobody downloads anything unless such text appears. It is how Google
Fonts serves CJK: many small woff2 files, each with a `unicode-range`.

## Result

| Part | State |
| --- | --- |
| Slice pipeline (`scripts/build-font-slices.mjs`) | Done. Noto Sans SC, TC, JP, KR (release Sans2.004) and Noto Color Emoji (noto-emoji v2.051, COLRv1) cut into 590 woff2 slices, 16.7 MiB, deterministic. |
| Hosting (Worker, `scripts/deploy-web.mjs`, local servers, `scripts/check-site.mjs`) | Done and run against the local Worker. The dry run is below; the production upload is the coordinator's. |
| Runtime, JS (`src/font-slices/`) | Done: manifest, language rule, lookup, de-duplicating cancellable loader, failure reporting; 25 unit tests. |
| Runtime, native (`native/missing_glyphs.rs`, `font_fallback.rs`, `system_fonts.rs`, `fonts.rs`) | Done, after `missing-glyph` landed (db4f4ec): the root notices the characters no font has as it builds a paragraph, finds a system font FreeType can read where the platform has system fonts (the demo no longer reads one at start), and tells the Web's loader of the rest. |
| Demo lab, loader host, Web `font-slices` section, native `font-fallback` section | Done (see "Evidence"). |

## Sources and licence

| Family | Source (pinned in `scripts/font-slices/sources.json`: URL, size, sha256 of the archive and of the file taken out of it) | Glyphs |
| --- | --- | --- |
| Noto Sans SC / TC / JP / KR | `notofonts/noto-cjk` release `Sans2.004`, `18_NotoSansSC.zip`, `19_NotoSansTC.zip`, `16_NotoSansJP.zip`, `17_NotoSansKR.zip` (the "subset OTF" files, which are Google Fonts' Noto Sans SC, TC, JP and KR); `*-Regular.otf` | 30,890 / 20,745 / 16,732 / 23,174 code points |
| Noto Color Emoji | `googlefonts/noto-emoji` tag `v2.051` (the tag's release has no attached files; the font is the one in the tagged tree), `fonts/Noto-COLRv1.ttf` | 1,499 code points, 41,863 glyphs |

Both are SIL Open Font License 1.1 (the two licence files are byte-identical, sha256 `6a73f954...`). The slices are Modified Versions of the Font Software (a subset of the glyphs, unhinted for the Noto Sans files,
packed as WOFF2); they keep the names and the licence records in their name tables (name IDs 0 to 14, English), and `OFL-Noto.txt`, which is published beside the manifest (a release file), carries the notices and the licence text.
The archives are TOFU-pinned: the sha256 is the one measured on 2026-11-08 (GitHub's API has no digest for these old assets); the sizes match the release's asset listing.
Hong Kong (Noto Sans HK) is not built: `zh-HK` and `zh-MO` get the Traditional Chinese forms.

## Decisions

**F1. The fetching is Web only; natively the system supplies the font (F9 to F11).** Natively the engine falls back to system fonts: `TextServerAdvanced::_shape_run` asks `OS::get_system_font_path_for_text` when `OS::has_feature("system_fonts")` and the font's
`allow_system_fallback` (default true; the library never changes it on the owner's fonts, and turns it off only on the system fonts it makes itself). macOS, Windows, Linux, Android and iOS report the feature; `OS_Web` does not, and a WebGL page cannot read the browser's fonts. So the library's loader runs
on the Web only, and natively nothing is fetched. iOS reports `system_fonts` (`drivers/apple_embedded/os_apple_embedded.mm`), so it takes the native path too (the brief had it that iOS did not). Native on macOS 26 cannot draw Han from the
system by itself (CoreText answers `PingFangUI.ttc`, whose outlines FreeType cannot open, `docs/tracks/missing-glyph.md`): that is what the native half below fixes, in the library, so that the demo registers no system font of its own.

**F2. The partition is Google's, completed by a tail.** Google Fonts serves each of these families as slices with a `unicode-range`, ordered by how often characters are used together on the web, so the common ones are in a few slices
(a Chinese sentence needs four, a Japanese one nine). `scripts/font-slices/record-google-ranges.mjs --write` records the `unicode-range` of each family's stylesheet (`fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400`, a Chrome 130 User-Agent)
once into `scripts/font-slices/google-ranges.json` (retrieved 2026-11-07; the build never touches the network for ranges). The font Google serves has fewer characters than the subset OTF this builds from (SC: 13,637 of the OTF's 30,890 code points
are in Google's slices), so Google's ranges are intersected with the font's code points and the rest, rare ideographs, extension A, symbols, are **tail slices**: the remaining code points in order, 256 to a slice (48 for the emoji). Together they
cover every code point of the font exactly once, so a character the font has is always in one slice. Google's own subsets overlap a little (U+0301 is in slice 119 and in `cyrillic`): the earlier slice keeps it. The emoji slices share on purpose (each holds the
joiner and the parts of the sequences it draws), so their files hold what Google lists and the index lists the one slice that keeps each code point (`shared`).

**F3. The slices.** fontTools 4.62.1 and brotli 1.2.0 (pinned, checked on every run) in a venv under `artifacts/font-slices/venv`, run as `python3 -I`; the downloads, the extracted files and the scripts are in directories of their own. A slice keeps the layout features
horizontal text uses (`ccmp locl calt liga clig kern mark mkmk ljmo vjmo tjmo`), the English name records, no hinting and desubroutinised CFF (a fifth and then a twentieth smaller: slice jp-000 62,016 bytes with hints, 50,532 without, 46,056 without hints and
desubroutinised; the rest of the families drop `BASE VORG vhea vmtx DSIG`). A browser on macOS draws these fonts unhinted, as the library then does. The output is a function of the pinned inputs: two builds into two directories are identical in all 597 files
(`diff -r`), the manifest records the tool versions, and the build refuses a venv at other versions.

**F4. Content addressing; a manifest and a family index.** Slices and indexes are objects named by the first 32 hex digits of their sha256 (`o/<hash>/noto-sans-sc-004.woff2`), the address the release layout already gives an object, so they are served at
`/o/<hash>/<name>` with a year of immutable caching and are shared by every release whose manifest names them. The **manifest** (`font-slices.json`, 5.7 KB, 1.2 KB brotli) is a release file: the licence, and for each family its name, origin, the BCP 47 prefixes it
is preferred for, the blocks of 256 code points it has a character in (`coverage`), where it comes first (`first`), and the address of its **index**. An index (`noto-sans-sc.index.json`, 23 to 33 KB in brotli for a CJK family, 2 KB for the emoji) lists the family's
slices with their hash, size, glyph count and ranges. One manifest with every range was 538 KB (112 KB brotli): a page now reads the manifest, then the index of the family its text is in, then the slices, and a family whose coverage cannot hold a character is not read at all
(Hangul in Japanese text reads only the Korean index). The slices are not in the release pack and the release is not republished when they change; a release's manifest names the ones it needs.

**F5. Language.** The library has no per-element `lang` (no style or prop carries one), so the rule is: the language the app configures (`installFontSlices(..., { language })`), else `navigator.language`, as a browser does for a page with no `lang`. A family is
preferred for a language when one of its prefixes begins it (`zh-TW` is Traditional, `zh-Hans-CN` Simplified, a bare `zh` Simplified, `ja` and `ko` their own, `zh_TW` read as a tag); a character is looked up in the preferred families first and then in the others in
the manifest's order (SC, TC, JP, KR), so Hangul in Japanese text is still found. A language no family prefers (`en-US`) keeps the manifest's order, which is Simplified Chinese for Han, as a browser without a `lang` chooses. A family that is `first` for a range is looked up before the
others whatever the language: the colour emoji for U+1F000 to U+1FAFF, where the CJK fonts also have monochrome glyphs for some.

**F6. Who fetches, who holds the font (decided from evidence).** The GodotJS Web realm *is* the page's: `globalThis.fetch`, `TextDecoder`, `crypto.subtle`, `XMLHttpRequest`, `Worker` are functions there, `navigator.language` is the browser's (`en-GB` in headless Chrome), and relative URLs
resolve against the page (`document.baseURI`). A woff2 slice becomes a font with `font.data = arrayBuffer` (the typings take an `ArrayBuffer`): measured in headless Chrome on the Breaka Web build, a 21,848-byte slice is a `FontFile` named "Noto Sans JP" with 176 supported characters, the assignment takes 0.3 ms
and the first `hasChar` (FreeType opens the face) 1.6 ms. So **JS fetches** (the browser's HTTP cache, `AbortController`, a promise per request, no per-frame JS) and hands the bytes to the engine through `FontFile.data`, which copies them; **native holds the font** from then on
(its `fallbacks`), and JS keeps only the state of each request. Fetching natively through the engine's `HTTPRequest` or `JavaScriptBridge` was not needed.

**F7. The loader (`src/font-slices/loader.ts`).** One cancellable control flow owns it: `request(codepoints)` returns at once; the manifest is fetched on the first request, a family's index on the first lookup in it, a slice once however many requests name it, at most six at a time; a request has
a deadline (30 s) and the lifetime's `AbortSignal`; a file's size and, where the page has `crypto.subtle`, its SHA-256 are checked against the manifest; fonts that arrive within a frame (16 ms) are added to the host together, so the text that has to be shaped again is shaped once for them. A failure
(a manifest or an index that cannot be fetched or parsed, a slice that is not the file named, a font the engine cannot read or the host refuses, a character no family has) is passed to `onFailure` (default: `console.error`, `console.warn` for a character no font has), kept in `status().failures` (the last 32), the text stays as hex
boxes, and the address is left alone for 30 s before a request naming the same characters tries it again (no timer: the next request does it). `dispose()` aborts what is in flight and nothing is added afterwards. The host is an interface (`addFontFallbacks`, `subscribeToMissingGlyphs`); the library imports nothing from Godot.

**F8. Emoji: included.** Both Noto Color Emoji builds draw correctly in Godot's Web build, from a woff2 slice through `FontFile.data`: the CBDT bitmap build (`NotoColorEmoji.ttf`) and the COLRv1 vector build (`Noto-COLRv1.ttf`), in plain text, small text and a coloured span (the emoji keep their colours),
including a skin-tone sequence (a ligature of two code points in one slice) and a flag (two regional indicators). The bitmap build's slices are too heavy: with Google's partition and the sequences kept whole, 12 slices, 9.3 MiB, median 298 KB, largest 5.9 MB, a line of six emoji 1.8 MB; without the sequences 4.5 MiB, median 290 KB, largest 1.4 MB, and
`👍🏽` would be a thumb and a swatch. The vector build is 12 slices, 2.0 MiB, median 123 KB, largest 709 KB (the flags, as Google's own flag slice), a line of six emoji 424 KB; that is what is built. Limits: a sequence whose parts Google keeps in other slices (some professions) is drawn as its parts,
and an emoji in a block that also holds text symbols (U+2600 to U+27BF, U+2B50) is the CJK font's monochrome glyph if a CJK family has one, as a browser draws it without U+FE0F. Native engines were not tested with COLRv1 (the Web is the only place slices are used); the stock engine's Web build was not run.

## Sizes

| | Slices | Total | Median | 90th percentile | Largest | Index (brotli) |
| --- | --- | --- | --- | --- | --- | --- |
| Noto Sans SC | 169 (101 Google, 68 tail) | 5.50 MiB | 31.0 KiB | | 60.3 KiB | 33 KiB |
| Noto Sans TC | 141 (108, 33) | 3.78 MiB | 23.9 KiB | | 61.5 KiB | 32 KiB |
| Noto Sans JP | 122 (121, 1) | 2.73 MiB | 11.5 KiB | | 50.3 KiB | 23 KiB |
| Noto Sans KR | 146 (124, 22) | 2.71 MiB | 12.0 KiB | | 92.6 KiB | 25 KiB |
| Noto Color Emoji (COLRv1) | 12 (10, 2) | 1.99 MiB | 118 KiB | | 693 KiB | 2 KiB |
| All | 590 | 16.72 MiB | 24.6 KiB | 51.1 KiB | 693 KiB | |

A line of text in a language, the slices it needs and what they weigh (the build prints these): Simplified Chinese "你好，世界。今天天气很好，我们一起去公园玩吧。" 4 slices, 107 KiB; Traditional Chinese 4, 126 KiB; Japanese "こんにちは、世界。今日はいい天気ですね。公園へ行きましょう。" 9, 90 KiB;
Korean 7, 61 KiB; six emoji 5, 424 KiB. The first request also reads the manifest (1.2 KB) and the index of its family (23 to 33 KB).

## Hosting

`/o/<hash>/<name>` already answered any object with `Cache-Control: public, max-age=31536000, immutable` and `Cross-Origin-Resource-Policy: cross-origin` on every response, which satisfies the page's `Cross-Origin-Embedder-Policy: require-corp` (and a same-origin
fetch needs neither); the only change to the Worker is the type of a font, `font/woff2` (`deploy/release-layout.mjs`; a font is already compressed, so it is not in the compressible list, while an index is `application/json` and has a brotli copy). So the Worker source changes, and
`deploy-web` redeploys it with the release (it compares the source's hash with the pointer's). `scripts/deploy-web.mjs` reads the manifest the release export carries, checks it against the slice build (`artifacts/font-slices/dist`) and every object against the size and SHA-256 it names, and offers
the slices and indexes (and the indexes' brotli copies) as objects beside the release's. Which of them the bucket lacks is decided at `--execute` from the font manifests of the releases the pointer remembers (a manifest in the bucket means its objects are, as for the release's own files); `--check-bucket` makes the plan read the bucket
(read-only) and say. Uploads run four at a time. `scripts/serve-web.mjs` and the Web verifiers serve `/o/` from `artifacts/font-slices/dist/o` and refuse an export whose manifest is not the build's. `build-web --release` copies the manifest and the licence into the export (and refuses without them);
the pack is not touched. `check-site --font-slices` fetches the manifest, each index and one slice per family through the site and checks bytes and headers.

## The native half

**F9. Missing characters are noticed when a paragraph is built, by asking the text server.** A text node's paragraph is built when its text or style changes (`refresh_paragraph`, a span's shaping, a text input's `refresh_text_input`). For each character of the shown
text outside ASCII (a text of ASCII asks nothing) the root asks the font once (`Font.has_char`, which counts the font and its fallbacks) and, for a character it says no to, on a platform with system fonts shapes that one character with the font and looks at the
glyph the text server gives it: a glyph with a font means the engine found a system font for it, none means it is a hex box. The answer is cached per font and character until the fonts change. Characters a shaper leaves out (joiners, variation selectors, the soft hyphen) are
not looked at. Nothing is looked at unless something asked: natively the root asks itself where there are system fonts, and on the Web only when the owner's script listens (`setMissingGlyphReporting`). The other way, reading the glyphs of every shaped line, is what
painting does for a glyph-by-glyph line; for plain text it would cost a dictionary per glyph of every paragraph, and it happens at paint, after the first frame.

**F10. Where a font is added.** `ReactUiRoot.addFontFallbacks(fonts)` puts the fonts behind the `fallbacks` of every registered face whose font allows it (`allow_system_fallback`: the same switch that opts a font out of the engine's system fallback, so the demo's `bare` family, which exists to
be missing every character, stays bare), and the faces registered later. The faces' fonts are the owner's, registered for this, and text probes (`font.getRids()`) see the fallbacks. The theme font, which text with no family and text inputs use, is the engine's and shared by every
control, so it is not touched: the root shapes with a `FontVariation` of it that has the added fonts behind its own. The font book's epoch moves, so a paragraph shaped before is shaped again (spans that only change colour are not), and only the nodes that were missing a character are:
shaping again goes through the same `refresh_paragraph`, which makes a new paragraph with a new size cache (`native/text_measure.rs`) and a new glyph cache (`ShapedParagraph`), and `replace_context` relays the layout out only if the text now measures differently.

**F11. Natively, the font comes from the system, on demand.** "The engine's own lookup first" is the text server's own: with `allow_system_fallback` and a platform that reports `system_fonts`, shaping asks the platform for a font for the character (`OS::get_system_font_path_for_text`); a character is
reported here because that found none, so asking it again would read the same 61 MB `PingFangUI.ttc` for the same answer. Then a list of families FreeType can read is tried, in the order the system language prefers (`OS.get_locale()`: `ja` the Japanese families first, `ko` the Korean, `zh_TW`/`zh_HK` the
Traditional, anything else the Simplified; the others follow in the order the Web looks Han up in), each made into a `SystemFont` that does not itself fall back, asked `has_char` (which reads the file), and kept only if it has a character that was missing; a family the system does not have, or that FreeType
cannot open, has none and is let go. The characters no family has are remembered and not looked for again. `setSystemFontCandidates(families)` replaces the list (an empty list looks nowhere). macOS 26 answers for Han with a font FreeType cannot open, so on the machine this was written on it is Hiragino Sans GB
(23.5 MB), read when the first Han text appears and not at start, as the demo used to. Windows and Linux family names, and the other languages' lists, are untested: no such machine.

**F12. The API.** `ReactUiRoot`: `missing_glyphs_ready` (signal), `take_missing_codepoints()`, `set_missing_glyph_reporting(on)`, `add_font_fallbacks(fonts)`, `set_system_font_candidates(families)`. The library's TS keeps its host interface (`subscribeToMissingGlyphs`, `addFontFallbacks`); the demo's adapter
(`demo/src/font-fallback.ts`) connects them to the root, and installs the loader on the Web only.

## Upload plan (dry run, for the coordinator)

On the final tree (`artifacts/logs/deploy-dry-run-2.log`; nothing was uploaded and the bucket was not read):

```
pnpm build:font-slices                              # if artifacts/font-slices/dist is absent (artifacts/ is not in git): downloads the pinned archives, makes the venv (pip install of the pinned fonttools and brotli); deterministic
node scripts/build-web.mjs --release                # exports the pack and copies font-slices.json and OFL-Noto.txt into it
node scripts/deploy-web.mjs --check-bucket          # read-only: says which of the 622 objects the real bucket lacks
node scripts/deploy-web.mjs --execute               # uploads them (4 at a time), the manifest, the pointer, then the Worker
node scripts/check-site.mjs --url=https://react.breaka.club/ --files --font-slices
```

Release `f3ff70ffc550` for bucket `breaka-asset-uploads`, prefix `react-demo/v2`: 22 release objects (the release's files and the brotli copies of the compressible ones) and 600 font objects (590 slices and 5 indexes, with brotli copies of the indexes), 17.32 MB of font objects, at `/o/<hash>/<name>`. The release's own files total 56.28 MB, 12.31 MB brotli. The
Worker's source changed (`deploy/release-layout.mjs`, `font/woff2`), so `--execute` redeploys it with the release. The font objects are named by content: a later release that does not change the slices uploads none of them. The pointer rollback (`pnpm deploy:web:rollback`) is unchanged. The run needs the wrangler login of the breaka account; it was not made here.

## Native cost: start time and memory, before and after

The demo used to give every face a `SystemFont` of Han families, which read a 23.5 MB file (Hiragino Sans GB on this Mac) when the faces were registered, at every native start, whether or not any Han text appeared. Now it registers none. Headless, silent
(`Godot --headless --audio-driver Dummy --path demo --quit-after N -- --lab=<id>` under `/usr/bin/time -l`, Breaka's 4.8; medians of 5 runs, 12 for the start time; "before" is the demo as it was on main with the eager font, on this branch's native library, with nothing to notice because the font covers
Han; the script is a throwaway, `scratchpad/measure-native.mjs`):

| | Before (eager `SystemFont`) | After (on demand) |
| --- | --- | --- |
| Start to quit after 3 frames, 12 runs, wall | 0.38 s | 0.38 s (no difference at the clock's 10 ms) |
| Counter lab (no Han text), 90 frames, peak resident / peak footprint | 232 MiB / 147 MiB | **208 MiB / 123 MiB** (24 MiB less each) |
| Font fallback lab (a line in each language), 90 frames, peak resident / footprint | 315 MiB / 228 MiB | 292 MiB / 205 MiB (the font is read when the lines appear: 84 MiB over the counter lab's, 23 less than eager) |
| Han font reads at start | 1 (23.5 MB) | 0 |

So nothing is read until the text needs it, and a process that never shows Han saves 24 MiB. The start time is not measurably different: reading the file is a few milliseconds from the page cache, and the 3-frame run is dominated by the engine and the JS realm.

## Two things the native work found

1. **macOS blocks on a family it does not have.** The first native run of the `rich-text` section hung with the process at 0 percent CPU. A `sample` of it shows the main thread in `ReactUiRoot::commit`, `settle_missing_glyphs`, `SystemFont::has_char`, `CTFontDescriptorCopyAttribute`, then
`TDownloadableFontManager::Download`, `DownloadFontsForProperties` and a `CFMessagePortSendRequest` that never returned: CoreText answers a lookup of a family the system does not have (the list had "Microsoft YaHei") by asking the downloadable-font service whether it is one, and in a process with no window that call
does not come back. The list is now filtered against `OS.get_system_fonts()` before a name is asked for, and a character that no family of CJK can have (a private use character, Thai) is not asked of them at all (it would read tens of megabytes to say no). Both are unit tested (`candidates_for_locale`, `is_cjk`); the hang is the control for the filter.
2. **A fallback moved other text.** `Font::get_ascent` and `get_descent` are the largest over a font and its fallbacks, so a CJK fallback added behind the theme font raised the extents of every unstyled text and moved its decorations: the `rich-text` section's wavy underline under `label` lost its rows ("red on 1 rows of pixels under label"). The extents the
library reads are now those of the font's own face (`primary_extents`), which is what a browser uses for text that does not use the fallback; the text server's line metrics were already per line. The two sections that depend on it, `text-styles` and `forms`, and `rich-text`, pass after the change.

## Evidence

Everything is on this worktree, heavy commands through the gate, Chrome headless through puppeteer-core, no OS input.

| What | Result |
| --- | --- |
| `pnpm test` | 960 tests pass, 0 fail (35 are the font slices' own: the loader 25, the pipeline 6, the deploy plan 4; the Worker, verification server and section list tests gained cases) |
| `pnpm test:types` | exit 0 (`artifacts/logs/final-test-types.log`) |
| `cargo test --locked`, `cargo clippy --locked --all-targets -- -D warnings`, `cargo fmt --check` | 896 tests pass (new: `missing_glyphs` 7, `system_fonts` 4), clippy exit 0 with no warning, fmt prints nothing |
| Slice build, twice into two directories | identical, 597 files (`diff -r`); 590 slices, 16.72 MiB, median 24.6 KiB, largest 693 KiB (the flags) |
| Native `node scripts/verify.mjs --interaction --only=font-fallback,rich-text,code-editor`, Breaka's 4.8 and with `--engine=stock` (`final-native-breaka.log`, `final-native-stock.log`, run on the final tree) | both PASSED at landscape and portrait: before a line of Chinese the faces have no fallback, after it they have Hiragino Sans GB and `U+4E2D` resolves to "Hiragino Sans GB W3"; the face that allows no fallback has none; a private use character adds nothing and does not loop; the missing-glyph checks (the `glyphs` page, the code editor's CJK comment) are green |
| Native `--only=text-styles,forms` | PASSED (the metrics change) |
| Web `font-slices` section (inside the run below) | 111 assertions passed: Simplified and Traditional Chinese, Japanese, Korean and colour emoji, plain, in a coloured span and in a red-ink span, and Simplified in the theme font, against Chrome's rendering of the same text from the same slices; the failure and control cases listed under the table |
| Web `node scripts/verify-interaction-web.mjs --only=font-slices,rich-text,code-editor,navigator` (the real harness, through the local Worker with the slices served from `artifacts/font-slices/dist/o`) | PASSED: 2,443 assertions (navigator 2,043, rich-text 136, code-editor 132, font-slices 111), 193 captures, no page error, no failed request; run at landscape, portrait and both retina viewports; the rich-text `glyphs` page and the code editor's CJK comment are boxes on the Web with the loader off, as `missing-glyph` has them |
| Hosting, on the final tree: `deploy-web --execute --local --persist-to=artifacts/font-slices-r2`, `wrangler dev` on that state, `check-site --url=http://127.0.0.1:8846/ --accept-encoding=br --files --font-slices` | passed (`artifacts/logs/check-site-2.log`): the navigator lists 28 labs and shows two, the document names its release with a `<base>`, the 11 other files of the release export are served byte for byte, the manifest is served from the release as JSON (5 families), and for each family its index and one slice are the files the manifest names (size and SHA-256), the index with `Cache-Control: public, max-age=31536000, immutable, no-transform` and the slice immutable, to an isolated page; an object that does not exist is not served as a font (it is a 500: the Worker's existing behaviour for a missing object). The first visit on the wire was 12.28 MiB of brotli |
| The same upload, second time | the bucket (local state) already held the 600 font objects and 17 of the 22 release objects: `5 of 622 objects are missing: 5 of 22 release objects, 0 of 600 font objects`. A rebuilt release uploads only the changed binaries; the fonts are never uploaded again |
| The release pack | 32 files (`Release pack: 32 files, no source maps`, as `docs/tracks/stock-web.md` recorded for main), none of them a font; the pack gained the manifest and the licence (0.01 MB each), the native half and the demo's script code: the first visit is 56.28 MB raw, 12.31 MB brotli (main before this track: 56.10 and 12.27) |

Against Chrome, from the `font-slices` section's assertions (`artifacts/web-interaction-verification/report.json`, 111 of them, all passed; the correlation is that of the ink of the two rasters, ours against Chrome's from the same slices, at the best shift of up to three css pixels; ink is our share of Chrome's):

| Text | Ratio | Plain / span / red ink correlation | Ink | Width: ours / Chrome / as boxes (px) | Correlation of the boxes (control) |
| --- | --- | --- | --- | --- | --- |
| Simplified Chinese (zh-CN) | 1 | 0.985 / 0.985 / 0.984 | 0.86 | 552.0 / 552.0 / 552.0 | 0.344 |
| Simplified Chinese | 2 | 0.970 / 0.970 / 0.968 | 0.852 | 552.0 / 552.0 / 552.0 | 0.325 |
| Traditional Chinese (zh-TW) | 1 | 0.985 / 0.985 / 0.983 | 0.858 | 552.0 / 552.0 / 552.0 | 0.341 |
| Japanese (ja) | 1 | 0.984 / 0.984 / 0.985 | 0.855 | 718.6 / 718.6 / 720.0 | 0.307 |
| Japanese | 2 | 0.967 / 0.967 / 0.969 | 0.849 | 718.6 / 718.6 / 720.0 | 0.292 |
| Korean (ko) | 1 | 0.986 / 0.987 / 0.985 | 0.868 | 548.3 / 548.3 / 590.6 | 0.336 |
| Colour emoji (5) | 1 | 0.837 / 0.837 / 0.824 | 1.033 | 149.5 / 143.5 / 224.0 | 0.364 |
| Colour emoji (5) | 2 | 0.831 / 0.831 / 0.816 | 1.026 | 149.5 / 143.5 / 224.0 | 0.361 |

The same text with no font family (the theme font) is as close as the plain text: 0.985 at ratio 1 and 0.970 at ratio 2 for Simplified Chinese. Traditional Chinese and Korean were run at ratio 1 only. The Chinese and Korean lines are laid out to Chrome's width to the pixel, and a line of Japanese or Korean is laid out again when the
glyphs replace the boxes (its width changes by 1.4 px and 42 px); a line of Chinese does not move, because a hex box of four digits is about as wide as an ideograph. The glyphs are 14 percent lighter than Chrome's (the ink share above): FreeType's unhinted rendering against CoreText's stem darkening. The emoji
lines differ in width: Godot advances each emoji by the font's own 1275 of 1024 units (29.9 px at 24 px) and Chrome by 28.7 px, so after five emoji the two are 6 px apart; the pictures are the same, and the check is held to a correlation of 0.8 and a width of 8 px for emoji only.

What the page fetched is exactly the manifest, the family's index and the slices that hold the text, counted from the network and checked against a lookup written in the verifier, and the loader's own byte count equals the network's (bytes as decoded, so the index counts at its full size and not at the 23 to 33 KB it is over the wire; the manifest is 5,748 bytes):
Simplified 4 slices, 267,666 bytes (109,148 of slices, the index 152,770), Traditional 4 slices, 280,762 (129,168 of slices, the index 145,846), Japanese 9, 197,325 (92,016 of slices, the index 99,561), Korean 7, 181,184 (62,244 of slices, the index 113,192), and the line of five emoji (a skin tone and a flag among them, so the 693 KiB flag slice is one of the five) 5 slices, 1,409,193 (the index 7,381). A page whose text every registered font has fetches nothing: no manifest, no index, no slice. Showing the text again fetches nothing more.
Controls: before the slices arrived the same text was boxes and the ink check fails on it (the last column); with no loader installed nothing is fetched and the text stays boxes (correlation 0.354); a slice that returns 404 leaves its characters as boxes while the other slices' characters are glyphs (correlation 0.809, ink 1.031: neither all glyphs
nor all boxes), and is reported once on the console as an error with its address and the characters; a manifest that is a 404 or whose request is dropped is reported as a manifest failure, nothing else is fetched and the text stays boxes (0.354). No batch of fonts took the page's thread longer than the 50 ms the section allows: the batches took 7.4 to 11.7 ms at ratio 1 and 11.3 to 17.4 ms at ratio 2
(`addFontFallbacks`, which is where the text is shaped again). On a line of 250 KB/s with 80 ms of latency (CDP) loading the seven Korean slices took 1,141 ms, and the longest gap between frames was 16.7 ms over 87 frames while it loaded, against 16.7 ms over 71 frames before (allowance 50 ms): the load did not drop a frame.

## Not verified

- Real Safari, iPad and iOS: Chrome headless only. WebKit's handling of COLRv1 emoji, `FontFile.data` with woff2, and a Safari page's memory with many slices added, were not seen.
- Slow networks other than the one CDP line above; a real phone connection.
- The production edge: whether Cloudflare passes the stored brotli of an index through untouched (the local runtime re-encodes it for Chrome's own `Accept-Encoding`, as `docs/tracks/web-load.md` records), and the Worker's behaviour for `/o/` on the deployed domain. `deploy:web` was not run; the dry run and the local run were.
- Windows, Linux, Android and iOS system fonts: the candidate lists for them are untried (no such machine); macOS 26 on this Mac is the one platform seen. The Traditional, Japanese and Korean lists were not exercised natively beyond the unit tests of their order.
- Bold, italic and weights: the slices are Regular, so bold CJK text is the Regular glyphs.
- One language per page: a Han character takes its glyph forms from the first language that needed it (a font added is a fallback of every text), so Japanese text shown after Chinese text with the same character has the Chinese form. A browser chooses per element with `lang`, which this library does not have.
- Emoji sequences whose parts Google's partition keeps in different slices (some professions) are drawn as their parts; an emoji in the symbol blocks that a CJK font also draws is the CJK font's monochrome glyph, as a browser draws it without U+FE0F. COLRv1 emoji were seen on Breaka's Web engine only (the stock engine's Web build was not run).
- A system font made natively keeps the engine's default subpixel positioning (the demo's adapter sets quarter-pixel positioning on the Web slices only), so the glyph positions of native fallback text were not compared against anything.
- `iOS`: reports `system_fonts`, so it takes the native path; nothing was run on it.

## README text

**Fonts for characters no font has.** A text that has a character none of its fonts has is drawn with the engine's hex box until a font that has it is added, as a browser falls back to a system font. The root notices such characters
as it builds a paragraph and does nothing about them unless asked. Where the platform has system fonts (macOS, Windows, Linux, Android, iOS) it asks the engine for one and, if the engine's own answer is a file FreeType cannot open (macOS 26's Han), tries a list of families
FreeType can read, in the order the system language prefers, and adds the one that has the character behind the registered faces and the theme font; only the text that was missing characters is shaped again, and nothing is read from disk until then. On the Web, which has no system fonts, the owner
installs `installFontSlices(host, { manifestUrl, sliceBaseUrl, makeFont })`: the root tells it the characters, it fetches the slice of Noto Sans CJK (Simplified and Traditional Chinese, Japanese, Korean, chosen by the language the app sets or `navigator.language`) or Noto Color Emoji that has them,
as the woff2 files `pnpm build:font-slices` makes (590 files, 16.7 MiB, a typical one 25 KiB, each with a `unicode-range` as Google Fonts serves them), and hands it back. Nothing is downloaded unless such text appears. A face with `allowSystemFallback` off is left alone. The slices are
content-addressed objects beside the release (`pnpm deploy:web` uploads the ones the bucket lacks); the demo hosts them at `/o/<hash>/<name>` and the Font fallback lab shows them. See `docs/tracks/font-slices.md`.
