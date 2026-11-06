export const WEB_URL_VARIABLE: string;
/** How long one file of a named server may take to arrive, headers and body. */
export const SERVED_ASSET_TIMEOUT_MS: number;
export interface ExportFile { name: string; bytes: number; sha256: string }
export function servedAssetProblems(base: string | URL, files: readonly ExportFile[], fetchAsset?: typeof fetch, timeoutMs?: number): Promise<string[]>;
export function startVerificationServer(
  engine: { name: string; root: string; artifactPath(...names: string[]): string; webMode(): string },
  options?: { env?: Record<string, string | undefined>; log?: (message: string) => void },
): Promise<{ url: string; own: boolean; close(): Promise<void> }>;

/** What a Web verifier collects: enough for the evidence and the pass line. */
export interface VerificationReport {
  passed: boolean;
  assertions: readonly unknown[];
  captures: readonly unknown[];
  console: ReadonlyArray<{ type: string; text: string }>;
  finishedAt?: string;
}
/** Write `report.json` (stamped with `finishedAt`) and `browser.log` into `output`. */
export function writeEvidence(output: string, report: VerificationReport, now?: () => Date): Promise<void>;
/** The pass line of a run that passed, or `undefined`. */
export function passedLine(marker: string, report: Pick<VerificationReport, 'passed' | 'assertions' | 'captures'>, output: string, details?: Record<string, unknown>): string | undefined;
