/**
 * Where the editor puts text that Copy and Cut take out of the document.
 *
 * Writing is a call: the demo gives the editor `ReactUiRoot.setClipboardText`, which writes the machine's clipboard (the browser's
 * on the Web) or, in a verifier run, the process's own memory (`native/clipboard.rs`). Nothing is mirrored into the text input
 * for native to copy. Reading is the other direction and needs no call: Paste reaches the editor as the text input's
 * `beforeinput` of type `insertFromPaste`, whose `data` is the clipboard's text (the browser's, read when the key was pressed).
 */
export interface ClipboardPort {
  writeText(text: string): void;
  /**
   * The clipboard's text, where it can be read at once: the menu of a touch selection offers Paste only then. A host whose clipboard is read
   * asynchronously (the browser's, which the engine's own read answers one call late) has none: its paste is the keyboard's.
   */
  readText?(): string;
}

/** A clipboard that keeps what it was given: for tests, and for a host that has no system clipboard. */
export class MemoryClipboard implements ClipboardPort {
  text = '';
  writes = 0;

  writeText(text: string): void {
    this.text = text;
    this.writes += 1;
  }

  readText(): string {
    return this.text;
  }
}

/**
 * Copying with nothing selected copies the whole line, and pasting that text again with nothing selected puts it back above the
 * line the caret is on (what Visual Studio Code does). The editor remembers the last text it copied that way.
 */
export class LinewiseMemory {
  private text: string | undefined;

  remember(text: string): void {
    this.text = text;
  }

  forget(): void {
    this.text = undefined;
  }

  /** Whether `pasted` is the text of the last line copy. */
  matches(pasted: string): boolean {
    return this.text !== undefined && this.text === pasted;
  }
}
