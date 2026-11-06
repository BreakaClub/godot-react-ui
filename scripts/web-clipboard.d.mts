import type { Page } from 'puppeteer-core';

/** Replace the page's `navigator.clipboard` with one kept in the page, before any script of the page runs. */
export function isolateBrowserClipboard(page: Page): Promise<void>;
