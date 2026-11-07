import { compileStyle } from 'godot-react-ui';

/**
 * The library throws for a class it has no utility for, when a component renders (`compileStyle`: "a hover or resize cannot expose a
 * typo later"). While a person types `bg-emerald-100` the text passes through `bg-e`, and sent to the page that is a render that
 * throws, which React answers by dropping the page's state. So the classes written out in the text are tried first, with the library's
 * own compiler, and a text with one the library does not have is not sent: the page keeps what it has, the class is underlined, and
 * the status bar names it.
 *
 * Only classes written as string literals are looked at (`className="..."`, `contentClassName='...'`, `className={'...'}`, and a
 * template with no `${}`): a class that is computed is the page's to get right when it renders.
 */

export interface ClassProblem {
  /** Offsets of the class in the text. */
  readonly from: number;
  readonly to: number;
  readonly name: string;
}

const CLASS_ATTRIBUTE = /\b[A-Za-z]*[cC]lassName=(?:"([^"\n]*)"|'([^'\n]*)'|\{\s*"([^"\n]*)"\s*\}|\{\s*'([^'\n]*)'\s*\}|\{\s*`([^`$\n]*)`\s*\})/gu;
const CLASS_TOKEN = /\S+/gu;

function isSupported(name: string): boolean {
  try {
    compileStyle(name);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported utility class')) return false;
    throw error;
  }
}

/** The classes written in the literal `className`s of `text` that the library has no utility for, in the order of the text. */
export function findUnsupportedClasses(text: string): ClassProblem[] {
  const problems: ClassProblem[] = [];
  const known = new Map<string, boolean>();
  for (const attribute of text.matchAll(CLASS_ATTRIBUTE)) {
    const literal = attribute.slice(1).find(group => group !== undefined);
    if (literal === undefined) continue;
    const literalStart = attribute.index + attribute[0].indexOf(literal, attribute[0].indexOf('=') + 1);
    for (const token of literal.matchAll(CLASS_TOKEN)) {
      const supported = known.get(token[0]) ?? isSupported(token[0]);
      known.set(token[0], supported);
      if (!supported) problems.push({ from: literalStart + token.index, to: literalStart + token.index + token[0].length, name: token[0] });
    }
  }
  return problems;
}
