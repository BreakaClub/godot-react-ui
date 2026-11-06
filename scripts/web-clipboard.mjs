/**
 * The browser's clipboard for a Web verifier: in the page's own memory (docs/tracks/verifier-integrity.md, finding 7).
 *
 * Headless Chrome is the full browser without a window, and its `navigator.clipboard` is the machine's pasteboard; a verifier
 * that copies and pastes through it overwrites what the person using the Mac copied. The engine reaches the browser's clipboard
 * only through `navigator.clipboard.writeText` and `readText` (`godot_js_display_clipboard_set` and `_get`), so swapping that
 * one object at the browser boundary leaves everything above it running for real: the engine's glue, the product's copy, cut
 * and paste, and the refused-read path (a scenario replaces `readText` with a rejection). It is installed before any page
 * script runs.
 */
export async function isolateBrowserClipboard(page) {
  await page.evaluateOnNewDocument(() => {
    const memory = { text: '' };
    const clipboard = {
      writeText: text => { memory.text = String(text); return Promise.resolve(); },
      readText: () => Promise.resolve(memory.text),
    };
    Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => clipboard });
  });
}
