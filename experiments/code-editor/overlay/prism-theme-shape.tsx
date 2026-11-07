// Proves what prism-react-renderer's theme output looks like (inline style objects, class names) and which style keys
// and colour notations its 14 bundled themes use, against what our `Style` can express.
// Run: node_modules/.bin/tsx experiments/code-editor/overlay/prism-theme-shape.tsx
import { themes } from 'prism-react-renderer';

async function main() {
  const keys = new Map<string, Set<string>>();
  const colourForms = new Map<string, number>();
  for (const [name, theme] of Object.entries(themes)) {
    for (const entry of [{ style: theme.plain }, ...theme.styles]) {
      for (const [key, value] of Object.entries(entry.style as Record<string, unknown>)) {
        if (!keys.has(key)) keys.set(key, new Set());
        keys.get(key)?.add(String(value));
        if (key === 'color' || key === 'backgroundColor') {
          const form = /^#[0-9a-f]{3}$/i.test(String(value)) ? '#rgb'
            : /^#[0-9a-f]{6}$/i.test(String(value)) ? '#rrggbb'
            : /^#[0-9a-f]{8}$/i.test(String(value)) ? '#rrggbbaa'
            : /^rgba?\(/.test(String(value)) ? 'rgb()/rgba()'
            : /^hsla?\(/.test(String(value)) ? 'hsl()' : `other:${String(value)}`;
          colourForms.set(form, (colourForms.get(form) ?? 0) + 1);
        }
      }
    }
    void name;
  }
  console.log('themes:', Object.keys(themes).join(', '));
  console.log('style keys used across all themes (key: distinct values):');
  for (const [key, values] of keys) console.log('  ', key.padEnd(18), [...values].slice(0, 8).join(' | '), values.size > 8 ? `... (${values.size})` : '');
  console.log('colour notations:', Object.fromEntries(colourForms));
  console.log('vsDark.plain =', JSON.stringify(themes.vsDark.plain));
  console.log('vsDark.styles[0..2] =', JSON.stringify(themes.vsDark.styles.slice(0, 3)));
}
main();
