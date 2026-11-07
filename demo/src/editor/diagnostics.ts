import type { RangeAnnotation, PointAnnotation } from './annotations';

export type Severity = 'error' | 'warning' | 'suggestion' | 'message';

/** A problem in the text the editor shows: a range of the current text and what is wrong with it. */
export interface EditorDiagnostic extends RangeAnnotation {
  readonly severity: Severity;
  readonly message: string;
  /** TypeScript's code (`2322`), when the checker found it. */
  readonly code: number | undefined;
  readonly source: 'checker' | 'compiler';
}

/** A hint the editor draws in the text without it being there. */
export interface EditorInlay extends PointAnnotation {
  readonly kind: 'type' | 'parameter';
  readonly label: string;
}

/** `DiagnosticCategory` in TypeScript's API. */
const CATEGORY_SEVERITY: readonly Severity[] = ['warning', 'error', 'suggestion', 'message'];

export function severityOfCategory(category: number): Severity {
  const severity = CATEGORY_SEVERITY[category];
  if (severity === undefined) throw new Error(`The checker reported a diagnostic of category ${category}, which TypeScript does not have`);
  return severity;
}

const SEVERITY_RANK: Readonly<Record<Severity, number>> = { error: 3, warning: 2, suggestion: 1, message: 0 };

/** The graver of two severities. */
export function worse(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/** Whether a diagnostic is a problem the person should see underlined and listed. */
export function isProblem(diagnostic: EditorDiagnostic): boolean {
  return diagnostic.severity === 'error' || diagnostic.severity === 'warning';
}
