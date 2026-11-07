import type { Engine } from './engine.mjs';

export function stockTypingsPaths(): { directory: string; record: string; stage: string; library: string };
export function withoutInvalidExportDeclaration(source: string): string;
export function generateStockTypings(engine: Engine): void;
export function ensureStockTypings(engine: Engine): void;
