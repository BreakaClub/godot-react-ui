import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Keep TypeScript files out of the Godot editor's script editor.
 *
 * Godot's script editor does not understand TypeScript, but it opens any script the project's saved layout lists
 * (`.godot/editor/editor_layout.cfg`, `[ScriptEditor] open_scripts`, restored by `ScriptEditor::set_window_layout`), and it
 * rewrites every script it has open when the editor saves: `text_editor/behavior/files/convert_indent_on_save` (on by
 * default, `text_editor/behavior/indent/type` = tabs) turned the 254 space-indented lines of `demo/src/main.ts` into tabs on a
 * headless `--generate-types`. The layout is a person's session, so only the TypeScript entries are taken out of it, before
 * any editor is launched (`scripts/import-demo.mjs`, `generate-types.mjs`, `typings.mjs`, `dev.mjs`): no window has to open
 * and close, and everything else in the layout stays as it was.
 *
 * What the scrub leaves alone, and why: `script_editor_cache.cfg` only keeps per-script view state (caret, folds, breakpoints)
 * for a script that is opened some other way, `project_metadata.cfg`'s recent files only fill the Open Recent menu, and the
 * editor setting `restore_scripts_on_load` belongs to the person's editor, not to this project.
 */
const LAYOUT = '.godot/editor/editor_layout.cfg';
const SECTION = 'ScriptEditor';
const TYPESCRIPT = /\.tsx?$/iu;
const SECTION_HEADER = /^\[[^\]\n]*\]\s*$/u;

/** The top-level elements of the array literal that starts at `text[start]` (a `[`), and the index just past its `]`. */
function splitArray(text, start) {
  const elements = [];
  let depth = 0;
  let quoted = false;
  let begin = start + 1;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '\\') index += 1;
      else if (character === '"') quoted = false;
    } else if (character === '"') {
      quoted = true;
    } else if (character === '[' || character === '{' || character === '(') {
      depth += 1;
    } else if (character === ']' || character === '}' || character === ')') {
      depth -= 1;
      if (depth === 0) {
        const last = text.slice(begin, index).trim();
        if (last !== '') elements.push(last);
        return { elements, end: index + 1 };
      }
    } else if (character === ',' && depth === 1) {
      elements.push(text.slice(begin, index).trim());
      begin = index + 1;
    }
  }
  throw new Error('the array in the editor layout is not closed');
}

/** The strings inside one element (a path, or a dictionary with a `path`). */
function stringsIn(element) {
  return [...element.matchAll(/"((?:[^"\\]|\\.)*)"/gu)].map(match => match[1]);
}

const isTypeScript = element => stringsIn(element).some(value => TYPESCRIPT.test(value));

/**
 * `text` (the content of an `editor_layout.cfg`) without the TypeScript entries of `[ScriptEditor] open_scripts`, and without a
 * TypeScript `selected_script`; every other byte is unchanged. Returns the new text and what was taken out.
 */
export function scrubLayoutText(text) {
  const removed = [];
  const lines = text.split(/(?<=\n)/u);
  const header = lines.findIndex(line => line.trim() === `[${SECTION}]`);
  if (header < 0) return { text, removed };
  let end = lines.findIndex((line, index) => index > header && SECTION_HEADER.test(line));
  if (end < 0) end = lines.length;
  let index = header + 1;
  while (index < end) {
    const line = lines[index];
    if (/^open_scripts\s*=/u.test(line)) {
      // The value may run over several lines: take the section's text from here and read the array out of it.
      const rest = lines.slice(index, end).join('');
      const { elements, end: stop } = splitArray(rest, rest.indexOf('['));
      const consumed = rest.slice(0, stop).split(/(?<=\n)/u).length;
      const kept = elements.filter(element => !isTypeScript(element));
      if (kept.length !== elements.length) {
        removed.push(...elements.filter(isTypeScript).flatMap(stringsIn).filter(value => TYPESCRIPT.test(value)));
        const newline = line.endsWith('\r\n') ? '\r\n' : '\n';
        lines.splice(index, consumed, `open_scripts=[${kept.join(', ')}]${newline}`);
        end -= consumed - 1;
      }
    } else if (/^selected_script\s*=/u.test(line)) {
      const value = stringsIn(line)[0];
      if (value !== undefined && TYPESCRIPT.test(value)) {
        removed.push(value);
        lines[index] = `selected_script=""${line.endsWith('\r\n') ? '\r\n' : line.endsWith('\n') ? '\n' : ''}`;
      }
    }
    index += 1;
  }
  return { text: lines.join(''), removed };
}

/**
 * Take the TypeScript scripts out of the project's saved editor layout, if it lists any. The file is replaced in one step, and
 * nothing is written when there is nothing to remove. Returns what was removed.
 */
export function scrubOpenScripts(project, { log = console.log } = {}) {
  const path = resolve(project, LAYOUT);
  if (!existsSync(path)) return [];
  const { text, removed } = scrubLayoutText(readFileSync(path, 'utf8'));
  if (removed.length === 0) return [];
  const staged = `${path}.${process.pid}.tmp`;
  writeFileSync(staged, text);
  renameSync(staged, path);
  log(`Editor layout ${path}: closed ${[...new Set(removed)].join(', ')} in the script editor (Godot would rewrite a TypeScript file it has open; open TypeScript in an external editor).`);
  return removed;
}
