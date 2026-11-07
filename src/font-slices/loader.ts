import { familiesFor, pageLanguage } from './language';
import { SliceLookup } from './lookup';
import { parseFontSliceIndex, parseFontSliceManifest, rangesContain, type FontSlice, type FontSliceFamily, type FontSliceManifest, type FontSliceObject } from './manifest';

/** The part of a `fetch` response the loader reads. */
export interface FontSliceResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** The part of `fetch` the loader uses. A test, or a runtime that has none, supplies its own. */
export type FontSliceFetch = (url: string, init: { readonly signal: AbortSignal }) => Promise<FontSliceResponse>;

/** What the loader needs of the root: somewhere to put the fonts that text may fall back to. */
export interface FontFallbackHost<Font> {
  /**
   * Add `fonts` as fallbacks of the fonts text is shaped with, and shape again the text that was missing glyphs, once for all of them. An empty
   * string means success; anything else says why nothing changed.
   */
  addFontFallbacks(fonts: readonly Font[]): string;
}

/** Why text still shows boxes. */
export type FontSliceFailureKind =
  /** The manifest or a family's index could not be fetched or is not valid. */
  | 'manifest'
  /** A slice could not be fetched, or is not the file the manifest names. */
  | 'slice'
  /** A slice arrived intact and the engine could not use it, or it holds no glyph for a character the manifest says it does. */
  | 'font'
  /** No family of the manifest has the character. */
  | 'unmapped';

export interface FontSliceFailure {
  readonly kind: FontSliceFailureKind;
  readonly message: string;
  /** The address that failed, when there is one. */
  readonly url?: string;
  readonly sliceId?: string;
  /** The characters that stay boxes because of it. */
  readonly codepoints: readonly number[];
}

export interface FontSliceOptions<Font> {
  /** Where `font-slices.json` is. A relative address is resolved by `fetch`, so against the page. */
  readonly manifestUrl: string;
  /** What each slice's `path` is relative to; ends with `/`. */
  readonly sliceBaseUrl: string;
  /** The language of the text (a BCP 47 tag): it chooses the glyph forms of characters several families share. Defaults to the page's. */
  readonly language?: string;
  /** Makes a font from a slice's bytes. It must throw if the engine cannot read them. */
  readonly makeFont: (bytes: ArrayBuffer, slice: FontSlice) => Font;
  readonly fetch?: FontSliceFetch;
  /** Called with every failure. The default writes it to the console: a warning for a character no font has, an error for anything else. */
  readonly onFailure?: (failure: FontSliceFailure) => void;
  /** How long a request may take, headers and body. */
  readonly timeoutMs?: number;
  /** How long a failed address is left alone before a request for the same characters tries it again. */
  readonly retryAfterMs?: number;
  /** The most slices fetched at once. */
  readonly maxConcurrent?: number;
  /** Called when something `status()` reports has moved: a manifest, an index or a slice has arrived, is loading or has failed. For a view of it. */
  readonly onChange?: () => void;
  readonly now?: () => number;
}

export interface FontSliceStatus {
  readonly manifest: 'unrequested' | 'loading' | 'ready' | 'failed';
  /** The families whose index has been read. */
  readonly indexesLoaded: readonly string[];
  readonly slicesLoading: number;
  /** The paths of the slices added as fallbacks, and of those that failed. */
  readonly slicesLoaded: readonly string[];
  readonly slicesFailed: readonly string[];
  /** Network requests made, and the bytes that arrived in them (the manifest's text, each index and each slice's file). */
  readonly requests: number;
  readonly bytesFetched: number;
  /** How long each call of the host's `addFontFallbacks` took, in ms, the last 32: it is where the text is shaped again, on the page's thread. */
  readonly addMilliseconds: readonly number[];
  /** The characters some slice has been added for, and the ones no slice has. */
  readonly codepointsServed: number;
  readonly codepointsUnmapped: number;
  readonly failures: readonly FontSliceFailure[];
}

export interface FontSliceLoader {
  /** Ask for the fonts that hold these characters. Returns at once; what has to be fetched is fetched in the background. */
  request(codepoints: Iterable<number>): void;
  status(): FontSliceStatus;
  /** Resolves when nothing is being fetched or waiting to be: the characters asked for so far have been served or have failed. */
  whenIdle(): Promise<void>;
  /** Stop: abort what is in flight, ignore what arrives, forget the host. */
  dispose(): void;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_AFTER_MS = 30_000;
const DEFAULT_MAXIMUM_CONCURRENT = 6;
/**
 * Fonts that arrive within this long of each other are added together, so the text that has to be shaped again is shaped once for them and not once each:
 * one frame at 60 Hz, which is the most main-thread work a burst of arrivals costs a frame.
 */
const BATCH_WINDOW_MS = 16;
/** The failures and timings `status()` keeps: the last few, so a page that fails over and over does not grow. */
const KEPT_FAILURES = 32;

type SliceState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded' }
  | { readonly kind: 'failed'; readonly at: number };

type ManifestState =
  | { readonly kind: 'unrequested' }
  | { readonly kind: 'loading'; readonly promise: Promise<FontSliceManifest | undefined> }
  | { readonly kind: 'ready'; readonly manifest: FontSliceManifest }
  | { readonly kind: 'failed'; readonly at: number };

/** A family's index: being fetched, ready to look characters up in, or failed (and left alone for a while). */
type IndexState =
  | { readonly kind: 'loading'; readonly promise: Promise<SliceLookup | undefined> }
  | { readonly kind: 'ready'; readonly lookup: SliceLookup }
  | { readonly kind: 'failed'; readonly at: number };

interface DigestSource {
  digest(algorithm: string, data: ArrayBuffer): Promise<ArrayBuffer>;
}

function hex(codepoint: number): string {
  return `U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** A clock fine enough to time a call: `performance.now()` where the page has it, else the date. */
function clock(): number {
  const performanceValue: unknown = Reflect.get(globalThis, 'performance');
  if (typeof performanceValue === 'object' && performanceValue !== null) {
    const nowFunction: unknown = Reflect.get(performanceValue, 'now');
    if (typeof nowFunction === 'function') {
      const value: unknown = Reflect.apply(nowFunction, performanceValue, []);
      if (typeof value === 'number') return value;
    }
  }
  return Date.now();
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `crypto.subtle`, where the page has it (a secure context: https, localhost). */
function subtleCrypto(): DigestSource | undefined {
  const cryptoValue: unknown = Reflect.get(globalThis, 'crypto');
  if (typeof cryptoValue !== 'object' || cryptoValue === null) return undefined;
  const subtle: unknown = Reflect.get(cryptoValue, 'subtle');
  if (typeof subtle !== 'object' || subtle === null) return undefined;
  const digest: unknown = Reflect.get(subtle, 'digest');
  if (typeof digest !== 'function') return undefined;
  return {
    digest: async (algorithm, data) => {
      const result: unknown = await Reflect.apply(digest, subtle, [algorithm, data]);
      if (!(result instanceof ArrayBuffer)) throw new Error('crypto.subtle.digest did not answer with an ArrayBuffer');
      return result;
    },
  };
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function isResponse(value: unknown): value is FontSliceResponse {
  return typeof value === 'object' && value !== null
    && typeof Reflect.get(value, 'ok') === 'boolean' && typeof Reflect.get(value, 'status') === 'number' && typeof Reflect.get(value, 'statusText') === 'string'
    && typeof Reflect.get(value, 'arrayBuffer') === 'function';
}

function defaultFetch(): FontSliceFetch {
  const candidate: unknown = Reflect.get(globalThis, 'fetch');
  if (typeof candidate !== 'function') throw new Error('This runtime has no fetch, so font slices cannot be downloaded; pass `fetch` in the options');
  return async (url, init) => {
    const response: unknown = await Reflect.apply(candidate, globalThis, [url, init]);
    if (!isResponse(response)) throw new Error(`fetch(${url}) did not answer with a response`);
    return response;
  };
}

/**
 * Downloads the font files that hold the characters text needs and no registered font has, and adds each as a fallback (docs/tracks/font-slices.md).
 *
 * One cancellable control flow owns everything: the manifest is fetched once, when the first characters are asked for; each slice is fetched once,
 * however many requests name it, with at most `maxConcurrent` in flight; a failure is reported through `onFailure` and kept in `status()`, the text
 * stays as it is, and the same address is left alone for `retryAfterMs` before a request for it tries again. `dispose()` aborts what is in flight.
 */
export function createFontSliceLoader<Font>(host: FontFallbackHost<Font>, options: FontSliceOptions<Font>): FontSliceLoader {
  if (!options.sliceBaseUrl.endsWith('/')) throw new Error(`The slice base URL "${options.sliceBaseUrl}" must end with a slash`);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryAfterMs = options.retryAfterMs ?? DEFAULT_RETRY_AFTER_MS;
  const maxConcurrent = options.maxConcurrent ?? DEFAULT_MAXIMUM_CONCURRENT;
  if (maxConcurrent < 1) throw new Error('maxConcurrent must be at least 1');
  const now = options.now ?? (() => Date.now());
  const fetchSlice = options.fetch ?? defaultFetch();
  // A character no family has is an expected condition (no font here draws Thai), a warning; the rest is something the page should have had and did not.
  const report = options.onFailure ?? ((failure: FontSliceFailure) => {
    if (failure.kind === 'unmapped') console.warn(`Font slices: ${failure.message}`);
    else console.error(`Font slices: ${failure.message}`);
  });

  const lifetime = new AbortController();
  let manifestState: ManifestState = { kind: 'unrequested' };
  const indexes = new Map<string, IndexState>();
  /** Keyed by the slice's path: content-addressed, so unique across families. */
  const slices = new Map<string, SliceState>();
  /** Characters already dealt with: asked of a slice that is loading or loaded, or reported as unmapped. They are not asked again. */
  const served = new Set<number>();
  const unmapped = new Set<number>();
  /** Characters asked for and not yet mapped to a slice. */
  const waiting = new Set<number>();
  const queue: Array<{ slice: FontSlice; codepoints: number[] }> = [];
  /** Fonts made and not yet added: they wait for the batch window to pass. */
  const arrived: Array<{ slice: FontSlice; font: Font; url: string; codepoints: readonly number[] }> = [];
  let batchTimer: ReturnType<typeof setTimeout> | undefined;
  const addMilliseconds: number[] = [];
  const failures: FontSliceFailure[] = [];
  const idleWaiters: Array<() => void> = [];
  let inFlight = 0;
  let draining = false;
  let requests = 0;
  let bytesFetched = 0;
  let disposed = false;

  /** Tell the app something in `status()` moved. A handler that throws is reported, and does not stop the loader. */
  function changed(): void {
    if (options.onChange === undefined) return;
    try {
      options.onChange();
    } catch (error) {
      console.error(`Font slices: the onChange handler threw: ${describe(error)}`);
    }
  }

  function fail(failure: FontSliceFailure): void {
    failures.push(failure);
    if (failures.length > KEPT_FAILURES) failures.shift();
    report(failure);
    changed();
  }

  function settleIfIdle(): void {
    if (inFlight > 0 || queue.length > 0 || arrived.length > 0 || waiting.size > 0 || draining) return;
    for (const resolve of idleWaiters.splice(0)) resolve();
  }

  /** `fetch` with the loader's abort and a deadline, for the manifest and every slice. Throws a sentence about what went wrong. */
  async function fetched<T>(url: string, read: (response: FontSliceResponse) => Promise<T>): Promise<T> {
    requests += 1;
    const controller = new AbortController();
    const abort = (): void => { controller.abort(); };
    lifetime.signal.addEventListener('abort', abort);
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetchSlice(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`.trim());
      return await read(response);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(lifetime.signal.aborted ? `${url} was abandoned when the fonts were disposed` : `${url} did not arrive within ${timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      lifetime.signal.removeEventListener('abort', abort);
    }
  }

  async function loadManifest(): Promise<FontSliceManifest | undefined> {
    try {
      const bytes = await fetched(options.manifestUrl, response => response.arrayBuffer());
      bytesFetched += bytes.byteLength;
      const manifest = parseFontSliceManifest(JSON.parse(new TextDecoder().decode(bytes)));
      manifestState = { kind: 'ready', manifest };
      changed();
      return manifest;
    } catch (error) {
      manifestState = { kind: 'failed', at: now() };
      fail({ kind: 'manifest', url: options.manifestUrl, message: `the font slice manifest ${options.manifestUrl} could not be used: ${describe(error)}`, codepoints: [...waiting] });
      return undefined;
    }
  }

  function ensureManifest(): Promise<FontSliceManifest | undefined> | FontSliceManifest {
    switch (manifestState.kind) {
      case 'ready': return manifestState.manifest;
      case 'loading': return manifestState.promise;
      case 'failed':
        // Left alone until the retry window has passed; the characters waiting are reported as failed and forgotten.
        if (now() - manifestState.at < retryAfterMs) return Promise.resolve(undefined);
        break;
      case 'unrequested': break;
    }
    const promise = loadManifest();
    manifestState = { kind: 'loading', promise };
    return promise;
  }

  /** A file the manifest pins: the size and, where the page has `crypto.subtle` (a secure context), the SHA-256. */
  async function checkedBytes(object: FontSliceObject, bytes: ArrayBuffer): Promise<void> {
    if (bytes.byteLength !== object.bytes) throw new Error(`it is ${bytes.byteLength} bytes, the manifest says ${object.bytes}`);
    const subtle = subtleCrypto();
    if (subtle === undefined) return;
    const found = toHex(await subtle.digest('SHA-256', bytes));
    if (found !== object.sha256) throw new Error(`its SHA-256 is ${found}, the manifest says ${object.sha256}`);
  }

  async function loadIndex(family: FontSliceFamily, stopped: readonly number[]): Promise<SliceLookup | undefined> {
    const url = `${options.sliceBaseUrl}${family.index.path}`;
    try {
      const bytes = await fetched(url, response => response.arrayBuffer());
      bytesFetched += bytes.byteLength;
      await checkedBytes(family.index, bytes);
      const lookup = new SliceLookup(parseFontSliceIndex(JSON.parse(new TextDecoder().decode(bytes)), family.id));
      indexes.set(family.id, { kind: 'ready', lookup });
      changed();
      return lookup;
    } catch (error) {
      indexes.set(family.id, { kind: 'failed', at: now() });
      fail({ kind: 'manifest', url, message: `the index of ${family.name} (${url}) could not be used: ${describe(error)}`, codepoints: stopped });
      return undefined;
    }
  }

  function ensureIndex(family: FontSliceFamily, stopped: readonly number[]): Promise<SliceLookup | undefined> | SliceLookup {
    const state = indexes.get(family.id);
    if (state?.kind === 'ready') return state.lookup;
    if (state?.kind === 'loading') return state.promise;
    if (state?.kind === 'failed' && now() - state.at < retryAfterMs) return Promise.resolve(undefined);
    const promise = loadIndex(family, stopped);
    indexes.set(family.id, { kind: 'loading', promise });
    return promise;
  }

  /** A slice that failed: left alone for the retry window, and its characters are asked for again by the next request that names them. */
  function failSlice(slice: FontSlice, codepoints: readonly number[]): void {
    slices.set(slice.path, { kind: 'failed', at: now() });
    for (const codepoint of codepoints) served.delete(codepoint);
  }

  async function loadSlice(slice: FontSlice, codepoints: readonly number[]): Promise<void> {
    const url = `${options.sliceBaseUrl}${slice.path}`;
    let bytes: ArrayBuffer;
    try {
      bytes = await fetched(url, response => response.arrayBuffer());
      bytesFetched += bytes.byteLength;
      await checkedBytes(slice, bytes);
    } catch (error) {
      failSlice(slice, codepoints);
      fail({ kind: 'slice', url, sliceId: slice.id, message: `the font slice ${slice.id} (${url}) could not be used: ${describe(error)}`, codepoints });
      return;
    }
    if (disposed) return;
    try {
      arrived.push({ slice, font: options.makeFont(bytes, slice), url, codepoints });
    } catch (error) {
      failSlice(slice, codepoints);
      fail({ kind: 'font', url, sliceId: slice.id, message: `the engine could not use the font slice ${slice.id}: ${describe(error)}`, codepoints });
      return;
    }
    batchTimer ??= setTimeout(addArrived, BATCH_WINDOW_MS);
  }

  /** Add the fonts that have arrived, all at once. A refusal fails every slice of the batch: the host changed nothing. */
  function addArrived(): void {
    batchTimer = undefined;
    const batch = arrived.splice(0);
    if (disposed || batch.length === 0) return;
    let refusal: string;
    const started = clock();
    try {
      refusal = host.addFontFallbacks(batch.map(entry => entry.font));
    } catch (error) {
      // The host threw instead of answering: the same as a refusal, reported with what it said, never left as slices that stay loading.
      refusal = describe(error);
    }
    addMilliseconds.push(clock() - started);
    if (addMilliseconds.length > KEPT_FAILURES) addMilliseconds.shift();
    for (const { slice, url, codepoints } of batch) {
      if (refusal === '') {
        slices.set(slice.path, { kind: 'loaded' });
      } else {
        failSlice(slice, codepoints);
        fail({ kind: 'font', url, sliceId: slice.id, message: `the engine could not use the font slice ${slice.id}: ${refusal}`, codepoints });
      }
    }
    changed();
    settleIfIdle();
  }

  function pump(): void {
    while (!disposed && inFlight < maxConcurrent) {
      const next = queue.shift();
      if (next === undefined) return;
      inFlight += 1;
      void loadSlice(next.slice, next.codepoints).finally(() => {
        inFlight -= 1;
        pump();
        settleIfIdle();
      });
    }
  }

  /** Queue the slices that hold `found`'s characters and are not loaded, loading or recently failed. */
  function queueSlices(found: ReadonlyMap<FontSlice, readonly number[]>): void {
    for (const [slice, codepoints] of found) {
      const state = slices.get(slice.path);
      if (state?.kind === 'loaded') {
        // The slice is in, so text shaped with it should not have asked: either the manifest names a glyph the file does not hold or the fallback
        // is not reaching the fonts this text uses. Reported once; the characters are not asked for again.
        for (const codepoint of codepoints) served.add(codepoint);
        fail({ kind: 'font', sliceId: slice.id, message: `${slice.id} is loaded but text still has no glyph for ${codepoints.slice(0, 8).map(hex).join(', ')}`, codepoints: [...codepoints] });
        continue;
      }
      if (state?.kind === 'loading') {
        for (const codepoint of codepoints) served.add(codepoint);
        continue;
      }
      if (state?.kind === 'failed' && now() - state.at < retryAfterMs) continue;
      slices.set(slice.path, { kind: 'loading' });
      for (const codepoint of codepoints) served.add(codepoint);
      queue.push({ slice, codepoints: [...codepoints] });
    }
    changed();
    pump();
  }

  /**
   * Map the characters waiting to slices. They are looked up in the families in the order the language prefers; a family's index is fetched when a
   * character is first looked up in it, so text in one language reads one index. A character no family has is reported as unmapped; one whose family's
   * index could not be fetched is reported with that failure and asked about again, after the retry window, by the next request that names it.
   */
  async function resolve(manifest: FontSliceManifest): Promise<void> {
    const preferred = familiesFor(manifest.families, options.language ?? pageLanguage());
    // The order a character is looked up in: first the families that claim it whatever the language (the colour emoji for the pictographs), then the
    // others as the language prefers them. A stage is a family and the characters it may be looked up for.
    const stages: Array<{ family: FontSliceFamily; accepts: (codepoint: number) => boolean }> = [
      ...manifest.families.filter(family => family.first.length > 0).map(family => ({ family, accepts: (codepoint: number) => rangesContain(family.first, codepoint) })),
      ...preferred.map(family => ({ family, accepts: (codepoint: number) => rangesContain(family.coverage, codepoint) })),
    ];
    let remaining = [...waiting];
    waiting.clear();
    const found = new Map<FontSlice, number[]>();
    for (const { family, accepts } of stages) {
      if (remaining.length === 0) break;
      // The family's index is read only if it can hold one of the characters.
      const possible = remaining.filter(codepoint => accepts(codepoint) && rangesContain(family.coverage, codepoint));
      if (possible.length === 0) continue;
      const lookup = await ensureIndex(family, possible);
      if (disposed) return;
      if (lookup === undefined) return;
      const next: number[] = [];
      for (const codepoint of remaining) {
        const slice = accepts(codepoint) ? lookup.sliceOf(codepoint) : undefined;
        if (slice === undefined) next.push(codepoint);
        else found.set(slice, [...found.get(slice) ?? [], codepoint]);
      }
      remaining = next;
    }
    if (remaining.length > 0) {
      for (const codepoint of remaining) unmapped.add(codepoint);
      fail({ kind: 'unmapped', message: `no font slice has ${remaining.slice(0, 8).map(hex).join(', ')}${remaining.length > 8 ? ` and ${remaining.length - 8} more` : ''}`, codepoints: remaining });
    }
    queueSlices(found);
  }

  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
      while (waiting.size > 0 && !disposed) {
        const manifest = await ensureManifest();
        if (disposed) return;
        if (manifest === undefined) {
          waiting.clear();
          return;
        }
        await resolve(manifest);
      }
    } catch (error) {
      // A bug in the lookup (an index whose ranges overlap): reported with the characters it stopped, never swallowed.
      const stopped = [...waiting];
      waiting.clear();
      fail({ kind: 'manifest', url: options.manifestUrl, message: `the font slice manifest ${options.manifestUrl} could not be used: ${describe(error)}`, codepoints: stopped });
    } finally {
      draining = false;
      settleIfIdle();
    }
  }

  return {
    request(codepoints) {
      if (disposed) return;
      for (const codepoint of codepoints) {
        if (!served.has(codepoint) && !unmapped.has(codepoint)) waiting.add(codepoint);
      }
      if (waiting.size > 0) void drain();
    },
    status() {
      return {
        manifest: manifestState.kind,
        indexesLoaded: [...indexes].filter(([, state]) => state.kind === 'ready').map(([id]) => id),
        slicesLoading: [...slices.values()].filter(state => state.kind === 'loading').length,
        slicesLoaded: [...slices].filter(([, state]) => state.kind === 'loaded').map(([path]) => path),
        slicesFailed: [...slices].filter(([, state]) => state.kind === 'failed').map(([path]) => path),
        requests,
        bytesFetched,
        addMilliseconds: [...addMilliseconds],
        codepointsServed: served.size,
        codepointsUnmapped: unmapped.size,
        failures: [...failures],
      };
    },
    whenIdle() {
      return new Promise<void>(resolve => {
        idleWaiters.push(resolve);
        settleIfIdle();
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      clearTimeout(batchTimer);
      batchTimer = undefined;
      arrived.length = 0;
      waiting.clear();
      queue.length = 0;
      for (const resolve of idleWaiters.splice(0)) resolve();
    },
  };
}
