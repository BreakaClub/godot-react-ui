export const FONT_SLICES_DIRECTORY: string;
export const FONT_SLICE_OBJECTS_DIRECTORY: string;
export const EXPORTED_FONT_FILES: string[];
export const FONT_SLICES_BUILD_COMMAND: string;
export function fontSlicesBuilt(directory?: string): boolean;
export function exportFontSlices(options: { output: string; release: boolean; directory?: string }): boolean;
export function exportedFontSliceProblems(output: string, directory?: string): string[];
