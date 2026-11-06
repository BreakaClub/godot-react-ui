export const WEB_URL_VARIABLE: string;
export interface ExportFile { name: string; bytes: number; sha256: string }
export function servedAssetProblems(base: string | URL, files: readonly ExportFile[], fetchAsset?: typeof fetch): Promise<string[]>;
export function startVerificationServer(
  engine: { name: string; root: string; artifactPath(...names: string[]): string; webMode(): string },
  options?: { env?: Record<string, string | undefined>; log?: (message: string) => void },
): Promise<{ url: string; own: boolean; close(): Promise<void> }>;
