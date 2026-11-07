// The edits of the `live-compile` section (demo/src/verify-live-compile.ts), as data, so that `scripts/live-compile-agreement.mjs` makes the
// same edits and asks `tsc` about them: the section checks the position Bun's checker reports against the anchor, and the agreement script
// checks that `tsc` reports that position too.
//
// Each edit replaces the first occurrence of `search` in `inputs-lab.tsx` with `replace`.

export const INPUTS_LAB_PATH = '/project/lab/inputs-lab.tsx';

/** @type {import('./live-compile-edits.d.mts').Edit[]} */
export const RECOLOUR = [
  { search: 'className="w-full h-full bg-slate-50 p-6 gap-3"', replace: 'className="w-full h-full bg-emerald-100 p-6 gap-3"' },
  { search: '<Text className="text-2xl text-slate-900">Inputs</Text>', replace: '<Text className="text-2xl text-slate-900">Inputs, live</Text>' },
];

/** Two classes the colour alternates between, for the latency loop. */
export const BACKGROUND_COLOURS = ['bg-emerald-100', 'bg-sky-100'];

/** The two state hooks swap places: the hook list differs, so React must not keep the state. */
export const HOOK_ORDER = [
  {
    search: '  const [state, setState] = useState<InputsState>(INITIAL_STATE);\n  const [reversed, setReversed] = useState(false);',
    replace: '  const [reversed, setReversed] = useState(false);\n  const [state, setState] = useState<InputsState>(INITIAL_STATE);',
  },
];

/** A syntax error at the end of the file: the position is the `;`. */
export const SYNTAX_ERROR = { search: '\nconst label = ', replace: '\nconst broken = ;\nconst label = ', anchor: 'const broken = ;' };

/** A render that throws. */
export const THROW_IN_RENDER = [
  {
    search: '  const sizes = reversed ? [...SIZES].reverse() : SIZES;',
    replace: "  const sizes = reversed ? [...SIZES].reverse() : SIZES;\n  if (nextClicks >= 0) throw new Error('live-compile-test-render');",
  },
];

/** A module that throws when it runs. */
export const THROW_IN_MODULE = [
  { search: '\nconst label = ', replace: "\nif (INITIAL_STATE.volume >= 0) throw new Error('live-compile-test-module');\nconst label = " },
];

/**
 * A type error: `label` is declared a number and given a string. TypeScript reports TS2322 at the name being declared, which is `anchor`
 * (the offset of its first character in the edited text).
 */
export const TYPE_ERROR = { search: "const label = 'text-sm text-slate-700';", replace: "const label: number = 'text-sm text-slate-700';", anchor: 'label: number', code: 2322 };

/** Applies edits to a text. Throws when one finds nothing to replace: a stale edit must fail, not do nothing. */
export function applyEdits(text, edits) {
  let edited = text;
  for (const edit of edits) {
    if (!edited.includes(edit.search)) throw new Error(`An edit of the live-compile section finds nothing to replace: ${edit.search}`);
    edited = edited.replace(edit.search, () => edit.replace);
  }
  return edited;
}

/** The UTF-16 offset in the edited text of an edit's anchor. */
export function anchorOffset(edited, anchor) {
  const offset = edited.indexOf(anchor);
  if (offset < 0) throw new Error(`The edited text has no ${anchor}`);
  return offset;
}
