// Key chords that nothing in the UI claims go to the browser (docs/tracks/key-passthrough.md).
//
// Godot's Web input listens for `keydown` and `keyup` on the canvas and calls `preventDefault()` on every one (`GodotInput.onKeyEvent`,
// `platform/web/js/libs/library_godot_input.js`; the input method's element does the same), so a page built on it can use no browser
// shortcut. Whether the UI uses a key is decided in the engine's next frame, after the browser has already finished with the event, so it
// is decided here from what is known when the key goes down: `window`, in the capture phase, runs before every listener the engine has.
// A browser chord (`isBrowserChord`) that no root claims is stopped there for the engine and left alone for the browser: nobody called
// `preventDefault()`, so Cmd+R reloads, Cmd+F finds and F12 opens the tools, as on any page. The engine never sees such a key, and so
// never its release either: the release is withheld by the same rule, and a key the engine did see keeps its release.
//
// Where a page has no `window` (the native platforms) there is no listener and nothing here costs anything.

import { isBrowserChord, platformOf, type KeyPlatform, type KeyPress, type PageKeyPress } from './key-claims';

/** A key event as a page delivers it to a `keydown` or `keyup` listener. */
export interface PageKeyboardEvent extends PageKeyPress {
  /** Stops every listener after this one, on this and every other node, including the engine's. It does not cancel the event's default action. */
  stopImmediatePropagation(): void;
}

/** What a page offers for listening to the keyboard: `window` in a browser. */
export interface PageEventTarget {
  addEventListener(type: 'keydown' | 'keyup', listener: (event: PageKeyboardEvent) => void, capture: boolean): void;
  addEventListener(type: 'blur', listener: () => void, capture: boolean): void;
  removeEventListener(type: 'keydown' | 'keyup', listener: (event: PageKeyboardEvent) => void, capture: boolean): void;
  removeEventListener(type: 'blur', listener: () => void, capture: boolean): void;
}

/** Whether `value` can be listened to the way a browser's `window` is. The members' behaviour is the DOM's; only their presence is checked. */
export function isPageEventTarget(value: object): value is PageEventTarget {
  return typeof Reflect.get(value, 'addEventListener') === 'function' && typeof Reflect.get(value, 'removeEventListener') === 'function';
}

/** What a root offers the page: whether it keeps a key from the browser. */
export interface KeyClaimSource {
  /** Whether the UI uses this chord, so the engine must get it and the browser must not. Asked only for a chord a browser might act on. */
  claims(press: KeyPress, platform: KeyPlatform): boolean;
}

/** A root's place in the page's listening. */
export interface KeyPassthroughRegistration {
  /** Whether the browser gets the chords this root does not claim. While no root has it on, the engine gets every key, as without this file. */
  enabled: boolean;
  /** Stop listening for this root; the last one to go takes the page's listeners off. */
  remove(): void;
}

/** The registration of a page with no keyboard to listen to: its flag can be set, and nothing follows. */
function nothingToListenTo(): KeyPassthroughRegistration {
  return { enabled: false, remove() {} };
}

/**
 * One page's decision about which key chords go to the browser, shared by every root in it. Listeners are on while any root is registered.
 * Not tied to a `window` but to a `PageEventTarget`, so it runs the same in Node against a fake page.
 */
export class KeyPassthrough {
  private readonly registrations = new Set<{ readonly source: KeyClaimSource; enabled: boolean }>();
  /** The `code` of every key whose press went to the browser and not to the engine, until its release is seen. */
  private readonly withheld = new Set<string>();
  private listening = false;

  constructor(private readonly target: PageEventTarget | undefined, private readonly platform: KeyPlatform) {}

  /** Start deciding for `source`. */
  add(source: KeyClaimSource, enabled: boolean): KeyPassthroughRegistration {
    if (this.target === undefined) return nothingToListenTo();
    const registration = { source, enabled };
    this.registrations.add(registration);
    this.listen();
    return {
      get enabled() { return registration.enabled; },
      set enabled(value: boolean) { registration.enabled = value; },
      remove: () => {
        this.registrations.delete(registration);
        if (this.registrations.size === 0) this.stopListening();
      },
    };
  }

  /** Whether the page's listeners are on. */
  get isListening(): boolean {
    return this.listening;
  }

  /** The `code` of every key whose release is still to be withheld, for tests. */
  get withheldCodes(): readonly string[] {
    return [...this.withheld];
  }

  private readonly onKeyDown = (event: PageKeyboardEvent): void => {
    const enabled = [...this.registrations].filter(registration => registration.enabled);
    if (enabled.length === 0) return;
    if (!isBrowserChord(event, this.platform) || enabled.some(registration => registration.source.claims(event, this.platform))) {
      // The engine gets this press, so it gets the release of it too, whatever a pass-through before it did to the same key.
      this.withheld.delete(event.code);
      return;
    }
    event.stopImmediatePropagation();
    this.withheld.add(event.code);
  };

  private readonly onKeyUp = (event: PageKeyboardEvent): void => {
    if (this.withheld.delete(event.code)) event.stopImmediatePropagation();
  };

  /** The page lost the keyboard (a new tab, the address bar, the find bar): releases of the keys that took it will not arrive. */
  private readonly onBlur = (): void => {
    this.withheld.clear();
  };

  private listen(): void {
    if (this.listening || this.target === undefined) return;
    this.target.addEventListener('keydown', this.onKeyDown, true);
    this.target.addEventListener('keyup', this.onKeyUp, true);
    // Not the capture phase: the blur of an element inside the page also passes through `window` there.
    this.target.addEventListener('blur', this.onBlur, false);
    this.listening = true;
  }

  private stopListening(): void {
    if (!this.listening || this.target === undefined) return;
    this.target.removeEventListener('keydown', this.onKeyDown, true);
    this.target.removeEventListener('keyup', this.onKeyUp, true);
    this.target.removeEventListener('blur', this.onBlur, false);
    this.withheld.clear();
    this.listening = false;
  }
}

let shared: KeyPassthrough | undefined;

/** The decision of the page this code runs in: the browser's `window` and its platform, or nothing where there is no window. */
export function pagePassthrough(): KeyPassthrough {
  if (shared === undefined) {
    const page: object = globalThis;
    const target = isPageEventTarget(page) ? page : undefined;
    shared = new KeyPassthrough(target, platformOf(Reflect.get(globalThis, 'navigator')));
  }
  return shared;
}
