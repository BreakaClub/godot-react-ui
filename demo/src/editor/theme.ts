import type { HexColor } from './highlight';

/** The code panel's colours. The syntax palette is in `highlight.ts`. */
export const THEME = {
  background: '#0f172a',
  gutterBackground: '#0f172a',
  gutterText: '#475569',
  gutterTextCurrent: '#cbd5e1',
  currentLine: '#1e293b',
  selection: '#2563eb77',
  /** A selection in an editor that does not have the focus. */
  selectionInactive: '#47556977',
  bracketMatch: '#64748b88',
  caret: '#60a5fa',
  error: '#f87171',
  warning: '#fbbf24',
  suggestion: '#94a3b8',
  message: '#94a3b8',
  inlayText: '#8aa0bd',
  inlayBackground: '#1e293bcc',
  preeditUnderline: '#e2e8f0',
} as const satisfies Record<string, HexColor>;
