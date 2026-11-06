/** `text` without the TypeScript scripts of `[ScriptEditor] open_scripts` and `selected_script`, and what was taken out. */
export function scrubLayoutText(text: string): { text: string; removed: string[] };
/** Take the TypeScript scripts out of the project's saved editor layout before an editor is launched; returns what was removed. */
export function scrubOpenScripts(project: string, options?: { log?: (message: string) => void }): string[];
