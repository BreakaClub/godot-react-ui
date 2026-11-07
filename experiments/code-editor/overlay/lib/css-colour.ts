// CSS colour string -> `#rrggbb[aa]`, the only notation `Style` accepts (src/types.ts HexColor). Prism themes use #rgb, #rrggbb,
// #rrggbbaa, rgb(), rgba(), hsl(), a bare `ffffffee`, a named colour and `#a6e22e !important`. Returns undefined for anything
// it cannot turn into one flat colour (linear-gradient(...)).
import type { HexColor } from '../../../../src/types';

const NAMED: Readonly<Record<string, string>> = { green: '#008000', white: '#ffffff', black: '#000000', red: '#ff0000', transparent: '#00000000' };
const BYTE_MAX = 255;

function byte(value: number): string {
  return Math.max(0, Math.min(BYTE_MAX, Math.round(value))).toString(16).padStart(2, '0');
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * BYTE_MAX, l * BYTE_MAX, l * BYTE_MAX];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t0: number) => {
    const t = (t0 + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * BYTE_MAX, channel(hue) * BYTE_MAX, channel(hue - 1 / 3) * BYTE_MAX];
}

export function toHex(css: string): HexColor | undefined {
  const text = css.replace(/!important/, '').trim().toLowerCase();
  if (NAMED[text] !== undefined) return NAMED[text] as HexColor;
  let match = /^#?([0-9a-f]{3})$/.exec(text);
  if (match && text.startsWith('#')) return `#${[...match[1]].map((c) => c + c).join('')}`;
  match = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (match) return `#${match[1]}`;
  match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/.exec(text);
  if (match) {
    const alpha = match[4] === undefined ? '' : byte((match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) * BYTE_MAX);
    return `#${byte(+match[1])}${byte(+match[2])}${byte(+match[3])}${alpha === 'ff' ? '' : alpha}` as HexColor;
  }
  match = /^hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:[,/\s]+([\d.]+%?))?\s*\)$/.exec(text);
  if (match) {
    const [r, g, b] = hslToRgb(+match[1], +match[2] / 100, +match[3] / 100);
    const alpha = match[4] === undefined ? '' : byte((match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) * BYTE_MAX);
    return `#${byte(r)}${byte(g)}${byte(b)}${alpha === 'ff' ? '' : alpha}` as HexColor;
  }
  return undefined;
}
