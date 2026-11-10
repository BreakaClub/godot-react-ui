// Which Tailwind v3.4.17 utilities and variants this library compiles, measured rather than listed by hand.
//
//   node --import tsx scripts/tailwind-coverage.mjs --tailwind=<dir> [--json=<file>] [--plugin=<name>] [--missing]
//       [--markdown=<file> [--before=<json of an earlier run>]]
//
// `<dir>` is a directory whose `node_modules/tailwindcss` is tailwindcss 3.4.17 (for example `npm pack tailwindcss@3.4.17`,
// then `npm install` of that tarball into an empty directory). Every core plugin is run against a recording stand-in for
// Tailwind's plugin API, which enumerates the class names the default theme generates (the same source `tailwind build` uses).
// Each name is then handed to `compileStyle`: it counts as supported when it compiles and unsupported when it throws, so the
// coverage table is a measurement, and this script is how to refresh it after a merge.
//
// `--plugin=<name>` limits the run to one plugin, `--missing` lists every unsupported class of each plugin shown, and
// `--json=<file>` writes the full result (per plugin: all classes, the unsupported ones, the error of the first). `--markdown=<file>`
// writes the coverage table: one row per plugin and per variant with the measured counts, the owner of what is left
// (scripts/tailwind-coverage-notes.mjs) and, with `--before=<json>`, the counts of an earlier run beside them.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { PLUGIN_NOTES, VARIANT_NOTES } from './tailwind-coverage-notes.mjs';
// tsx loads the TypeScript module as CommonJS, whose named exports an ES module reads through the default.
import styles from '../src/styles.ts';

const { compileStyle } = styles;
rejectUnknownArguments(process.argv.slice(2), { prefixes: ['--tailwind=', '--json=', '--plugin=', '--markdown=', '--before='], flags: ['--missing'] });
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const tailwindDirectory = argument('tailwind');
if (tailwindDirectory === undefined) throw new Error('--tailwind=<directory containing node_modules/tailwindcss 3.4.17> is required');
const requireTailwind = createRequire(resolve(tailwindDirectory, 'package.json'));
const { corePlugins, variantPlugins } = requireTailwind('tailwindcss/lib/corePlugins.js');
const resolveConfig = requireTailwind('tailwindcss/resolveConfig');
const escapeClassName = requireTailwind('tailwindcss/lib/util/escapeClassName.js').default;
const version = requireTailwind('tailwindcss/package.json').version;
if (version !== '3.4.17') throw new Error(`tailwindcss ${version} found; the coverage table is for 3.4.17`);
const config = resolveConfig({ content: [] });

function get(object, path, fallback) {
  const value = String(path).split('.').reduce((current, key) => (current === undefined || current === null ? undefined : current[key]), object);
  return value === undefined ? fallback : value;
}

/** The class names a rule selector carries: `.divide-x > :not([hidden]) ~ :not([hidden])` is `divide-x`. */
function classesOfSelector(selector) {
  const classes = [];
  for (const part of selector.split(',')) {
    const match = /^\s*\.((?:\\.|[^\s.:>~+[,])+)/.exec(part);
    if (match) classes.push(match[1].replace(/\\(.)/g, '$1'));
  }
  return classes;
}

/** Tailwind's `negateValue`: only a number with an optional unit (or a calc-like function) has a negative class; `auto` and `full` have none. */
function isNegatable(value) {
  const text = String(value);
  return text === '0' || /^[+-]?(\d+|\d*\.\d+)(e[+-]?\d+)?(%|\w+)?$/.test(text) || ['var', 'calc', 'min', 'max', 'clamp'].some(name => text.includes(`${name}(`));
}

function recordUtilities(into, utilities) {
  for (const entry of Array.isArray(utilities) ? utilities : [utilities]) {
    for (const [key, value] of Object.entries(entry)) {
      if (key.startsWith('@')) recordUtilities(into, value);
      else for (const name of classesOfSelector(key)) into.add(name);
    }
  }
}

function pluginApi(into) {
  const matchUtilities = (utilities, options = {}) => {
    const values = options.values ?? {};
    for (const key of Object.keys(utilities)) {
      for (const valueKey of Object.keys(values)) {
        const name = valueKey === 'DEFAULT' ? key : `${key}-${valueKey}`;
        into.add(name);
        if (options.supportsNegativeValues && valueKey !== 'DEFAULT' && isNegatable(values[valueKey])) into.add(`-${name}`);
      }
      // A bare utility with no values table, or values reached only as `[arbitrary]`, has no enumerable name.
    }
  };
  return {
    addBase() {}, addDefaults() {}, addVariant() {}, matchVariant() {},
    addComponents: components => recordUtilities(into, components),
    addUtilities: utilities => recordUtilities(into, utilities),
    matchUtilities,
    matchComponents: matchUtilities,
    theme: (path, fallback) => get(config.theme, path, fallback),
    config: (path, fallback) => (path === undefined ? config : get(config, path, fallback)),
    corePlugins: () => true,
    prefix: value => value,
    e: escapeClassName,
    variants: () => [],
  };
}

const wantedPlugin = argument('plugin');
const showMissing = process.argv.includes('--missing');
const results = [];
for (const [name, plugin] of Object.entries(corePlugins)) {
  if (name === 'preflight' || (wantedPlugin !== undefined && wantedPlugin !== name)) continue;
  const classes = new Set();
  plugin(pluginApi(classes));
  const supported = [];
  const unsupported = [];
  let firstError;
  for (const className of classes) {
    try {
      compileStyle(className);
      supported.push(className);
    } catch (error) {
      unsupported.push(className);
      firstError ??= error instanceof Error ? error.message : String(error);
    }
  }
  results.push({ plugin: name, total: classes.size, supported: supported.length, unsupported, firstError });
}

// Variants: each name is tried in front of one utility known to compile; `matchVariant` families get representative values.
const PROBE = 'p-1';
const variantProbes = [
  ...['*', 'first-letter', 'first-line', 'marker', 'selection', 'file', 'placeholder', 'backdrop', 'before', 'after'],
  ...['first', 'last', 'only', 'odd', 'even', 'first-of-type', 'last-of-type', 'only-of-type', 'visited', 'target', 'open', 'default',
    'checked', 'indeterminate', 'placeholder-shown', 'autofill', 'optional', 'required', 'valid', 'invalid', 'in-range', 'out-of-range',
    'read-only', 'empty', 'focus-within', 'hover', 'focus', 'focus-visible', 'active', 'enabled', 'disabled'],
  ...['group-hover', 'group-focus', 'group-active', 'group-disabled', 'group-focus-within', 'group-focus-visible', 'group-first', 'group-odd',
    'group-hover/name', 'peer-hover', 'peer-focus', 'peer-checked', 'peer-disabled', 'peer-focus-visible', 'peer-invalid', 'peer-hover/name'],
  ...['ltr', 'rtl', 'motion-safe', 'motion-reduce', 'dark', 'print', 'portrait', 'landscape', 'contrast-more', 'contrast-less', 'forced-colors'],
  ...['sm', 'md', 'lg', 'xl', '2xl', 'max-sm', 'max-md', 'max-lg', 'max-xl', 'max-2xl', 'min-[900px]', 'max-[900px]', 'min-[1200px]'],
  ...['supports-[display:grid]', 'has-[:checked]', 'group-has-[:checked]', 'peer-has-[:checked]',
    'aria-checked', 'aria-disabled', 'aria-expanded', 'aria-hidden', 'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected',
    'aria-[sort=ascending]', 'group-aria-expanded', 'peer-aria-checked', 'data-[state=open]', 'data-[active]', 'group-data-[state=open]', 'peer-data-[state=open]',
    '[&:nth-child(3)]', '[&>*]', '[@media(min-width:900px)]'],
];
const variants = variantProbes.map(variant => {
  try {
    compileStyle(`${variant}:${PROBE}`);
    return { variant, supported: true };
  } catch (error) {
    return { variant, supported: false, error: error instanceof Error ? error.message : String(error) };
  }
});

const total = results.reduce((sum, row) => sum + row.total, 0);
const supported = results.reduce((sum, row) => sum + row.supported, 0);
console.log(`tailwindcss ${version}: ${supported} of ${total} default-theme class names compile (${(100 * supported / total).toFixed(1)} %)`);
console.log('');
console.log('| plugin | classes | compile | unsupported |');
console.log('| --- | ---: | ---: | ---: |');
for (const row of results) console.log(`| ${row.plugin} | ${row.total} | ${row.supported} | ${row.total - row.supported} |`);
if (showMissing) {
  for (const row of results.filter(entry => entry.unsupported.length > 0)) {
    console.log(`\n${row.plugin} (${row.unsupported.length}): ${row.unsupported.join(' ')}`);
  }
}
console.log('');
console.log(`variants: ${variants.filter(entry => entry.supported).length} of ${variants.length} probes compile`);
for (const entry of variants) console.log(`${entry.supported ? 'yes' : 'no '} ${entry.variant}`);
const jsonPath = argument('json');
if (jsonPath !== undefined) await writeFile(resolve(jsonPath), JSON.stringify({ version, results, variants }, null, 2));

// ---- The coverage table ----

const TRACKS = { paint: 'utilities-paint', text: 'utilities-text', transforms: 'transforms', 'layout-motion': 'utilities-layout-motion' };
const MISSING_SHOWN = 8;

function pluginStatus(row) {
  const note = PLUGIN_NOTES[row.plugin];
  const [owner, reason] = note ?? ['absent', ''];
  if (row.supported === row.total) return 'supported';
  const rest = owner === 'absent' ? 'the rest is deliberately absent' : `\`${TRACKS[owner]}\` adds the rest`;
  const lead = row.supported === 0 ? (owner === 'absent' ? 'deliberately absent' : `added by \`${TRACKS[owner]}\``) : `partly (${rest})`;
  return reason === '' ? `${lead}: not yet decided` : `${lead}: ${reason}`;
}

/** The note of a variant: its own, or its family's (`group-*` and `peer-*`, `aria-*`, `data-*`, `max-*`, `min-[..]`). */
function variantNote(variant) {
  const direct = VARIANT_NOTES[variant];
  if (direct !== undefined) return direct;
  const base = variant.replace(/\/.*$/, '');
  const families = [
    [/^group-has|^peer-has|^has-/, 'has-[:checked]'], [/^group-aria|^peer-aria|^aria-/, 'aria-checked'], [/^group-data|^peer-data|^data-/, 'data-[state=open]'],
    [/^group-/, 'group-hover'], [/^peer-/, 'peer-hover'], [/^max-/, 'max-sm'], [/^min-\[/, 'min-[900px]'], [/^supports-/, 'supports-[display:grid]'],
    [/^\[@/, '[&:nth-child(3)]'], [/^\[&/, '[&:nth-child(3)]'],
  ];
  for (const [pattern, key] of families) if (pattern.test(base)) return VARIANT_NOTES[key];
  return undefined;
}

function markdownDocument(before) {
  const beforeBy = new Map((before?.results ?? []).map(row => [row.plugin, row]));
  const beforeSupported = before?.results.reduce((sum, row) => sum + row.supported, 0);
  const beforeTotal = before?.results.reduce((sum, row) => sum + row.total, 0);
  const variantsBefore = before?.variants;
  const lines = [];
  lines.push('# Tailwind v3.4.17 coverage', '');
  lines.push('Which of Tailwind v3.4.17\'s utilities and variants this library compiles, measured, not listed by hand. This is the list of missing');
  lines.push('utilities, with who adds each gap or why it stays one. Regenerate it after a merge:', '');
  lines.push('```', 'npm pack tailwindcss@3.4.17 && mkdir tw && (cd tw && npm init -y && npm install --ignore-scripts ../tailwindcss-3.4.17.tgz)',
    'node --import tsx scripts/tailwind-coverage.mjs --tailwind=tw --markdown=<file> [--before=<json>]', '```', '');
  lines.push('**Method.** Each of the 178 core plugins of `lib/corePlugins.js` (all but `preflight`) is run against a recording stand-in for Tailwind\'s');
  lines.push('plugin API with the default theme, which lists the class names `tailwind build` would generate (named values and the negative classes');
  lines.push('Tailwind\'s `negateValue` allows; arbitrary `[...]` values are not enumerable, and the tests in `tests/utilities-layout.test.ts` and');
  lines.push('`tests/styles.test.ts` cover the ones this library takes). Each class name is handed to `compileStyle`: it counts as compiled when it');
  lines.push('does not throw. A variant is tried in front of `p-1`. Colour classes and the per-side border classes dominate the counts, which is why');
  lines.push('the share is lower than the importance of what is missing. "Compiles" means the class is accepted and native honours it, not that it');
  lines.push('has been checked against a browser.', '');
  lines.push('Owners: `utilities-paint` (shadows, rings, outlines, per-side borders and radii, gradients), `utilities-text` (font and text utilities),');
  lines.push('`transforms`, and `utilities-layout-motion` (everything else that has a meaning here). A track\'s row says "added by" until its branch');
  lines.push('is merged; regenerating after the merge turns it into "supported". "Deliberately absent" always gives the reason.', '');
  const supported = results.reduce((sum, row) => sum + row.supported, 0);
  lines.push('## Summary', '');
  lines.push(`* Class names that compile: **${supported} of ${total}** (${(100 * supported / total).toFixed(1)} %)${before === undefined ? '' : `, up from ${beforeSupported} of ${beforeTotal} (${(100 * beforeSupported / beforeTotal).toFixed(1)} %) on main at d282fee, before this batch of tracks`}.`);
  const supportedVariants = variants.filter(entry => entry.supported).length;
  lines.push(`* Variants (of ${variants.length} probed, covering every family of v3.4.17): **${supportedVariants} compile**${variantsBefore === undefined ? '' : `, up from ${variantsBefore.filter(entry => entry.supported).length} before`}.`, '');
  lines.push('## Core plugins', '');
  lines.push('| plugin | classes | compile | before | status |', '| --- | ---: | ---: | ---: | --- |');
  for (const row of results) {
    const was = beforeBy.get(row.plugin);
    lines.push(`| \`${row.plugin}\` | ${row.total} | ${row.supported} | ${was === undefined ? '' : was.supported} | ${pluginStatus(row)} |`);
  }
  lines.push('', '## Variants', '');
  lines.push('| variant | status |', '| --- | --- |');
  for (const entry of variants) {
    if (entry.supported) {
      lines.push(`| \`${entry.variant}\` | supported |`);
    } else {
      const note = variantNote(entry.variant);
      lines.push(`| \`${entry.variant}\` | ${note === undefined ? 'not decided' : `deliberately absent: ${note[1]}`} |`);
    }
  }
  lines.push('', '## What is left, class by class', '');
  lines.push('The first few classes of each plugin that still do not compile (the plugin\'s full list is `--missing --plugin=<name>`):', '');
  for (const row of results.filter(entry => entry.unsupported.length > 0)) {
    const shown = row.unsupported.slice(0, MISSING_SHOWN).map(name => `\`${name}\``).join(' ');
    lines.push(`* \`${row.plugin}\` (${row.unsupported.length} of ${row.total}): ${shown}${row.unsupported.length > MISSING_SHOWN ? ' ...' : ''}`);
  }
  lines.push('');
  return lines.join('\n');
}

const markdownPath = argument('markdown');
if (markdownPath !== undefined) {
  const beforePath = argument('before');
  const before = beforePath === undefined ? undefined : JSON.parse(await readFile(resolve(beforePath), 'utf8'));
  await writeFile(resolve(markdownPath), markdownDocument(before));
}
