import { ChangeSet, EditorState, Transaction, type Extension, type Text, type TransactionSpec } from '@codemirror/state';
import { indentOnInput, indentUnit } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { history } from '@codemirror/commands';

/**
 * The editor's document: a CodeMirror 6 `EditorState` (text, selections, undo history, the TypeScript and JSX parse) with no
 * `EditorView`. JS owns the text; native only shows it (docs/tracks/code-editor-evaluation.md, section 6).
 *
 * Besides the state the model keeps what the asynchronous services need: a document version that grows with every change to
 * the text, and the changes that made each version, so a result computed for an older version (a type check, a hover, inlay
 * hints) can be mapped through the edits made since, or refused when they are no longer known.
 */

/** What an indent is: two spaces, the labs' own style. */
export const INDENT_UNIT = '  ';
export const TAB_SIZE = 2;

/** How many versions of changes the model remembers. A result for an older version cannot be mapped and is refused. */
const LOGGED_VERSIONS = 1000;

export function editorExtensions(readOnly = false): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    javascript({ jsx: true, typescript: true }),
    history(),
    EditorState.allowMultipleSelections.of(true),
    indentUnit.of(INDENT_UNIT),
    EditorState.tabSize.of(TAB_SIZE),
    indentOnInput(),
  ];
}

/** One applied transaction, as the model's listeners see it. */
export interface ModelUpdate {
  readonly transaction: Transaction;
  readonly previous: EditorState;
  readonly docChanged: boolean;
  readonly selectionChanged: boolean;
}

export type ModelListener = (update: ModelUpdate) => void;

/** Where a position in an older version of the text stands now. */
export type MappedPosition = { readonly kind: 'at'; readonly pos: number } | { readonly kind: 'unknown' };

export interface EditorModelOptions {
  /** The clock the history groups typing by, in milliseconds. A test supplies its own. */
  readonly now?: () => number;
  /** The text can be selected and copied but no command changes it. */
  readonly readOnly?: boolean;
}

export class EditorModel {
  private current: EditorState;
  private documentVersion = 0;
  /** `changeLog[i]` took the text from version `loggedFrom + i` to the next one. */
  private changeLog: ChangeSet[] = [];
  private loggedFrom = 0;
  private readonly listeners = new Set<ModelListener>();
  private readonly now: (() => number) | undefined;

  constructor(doc: string, options: EditorModelOptions = {}) {
    this.current = EditorState.create({ doc, extensions: editorExtensions(options.readOnly === true) });
    this.now = options.now;
  }

  get state(): EditorState {
    return this.current;
  }

  get doc(): Text {
    return this.current.doc;
  }

  get text(): string {
    return this.current.doc.toString();
  }

  /** Grows by one with each transaction that changes the text (undo and redo included); a selection move does not change it. */
  get version(): number {
    return this.documentVersion;
  }

  /**
   * Applies a transaction made from `state` (a command's, or one the model makes from a spec). A transaction made from any other
   * state is a bug in the caller: the model never merges.
   */
  dispatch(change: Transaction | TransactionSpec): Transaction {
    const transaction = this.transactionOf(change);
    if (transaction.startState !== this.current) {
      throw new Error('A transaction made from an older state was dispatched: the model applies one transaction at a time, in order');
    }
    const previous = this.current;
    this.current = transaction.state;
    if (transaction.docChanged) {
      this.documentVersion += 1;
      this.changeLog.push(transaction.changes);
      if (this.changeLog.length > LOGGED_VERSIONS) {
        this.changeLog.shift();
        this.loggedFrom += 1;
      }
    }
    const update: ModelUpdate = {
      transaction, previous, docChanged: transaction.docChanged, selectionChanged: transaction.selection !== undefined || transaction.docChanged,
    };
    for (const listener of [...this.listeners]) listener(update);
    return transaction;
  }

  subscribe(listener: ModelListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * The edits that took the text from `version` to now, as one change set over the old text; `undefined` when the model no longer
   * remembers that far back (or the version is not one it has had).
   */
  changesSince(version: number): ChangeSet | undefined {
    if (version > this.documentVersion || version < this.loggedFrom) return undefined;
    const first = version - this.loggedFrom;
    const changes = this.changeLog.slice(first);
    const [head, ...rest] = changes;
    if (head === undefined) return ChangeSet.empty(this.current.doc.length);
    return rest.reduce((composed, next) => composed.compose(next), head);
  }

  /**
   * Where the position `pos` of the text of `version` is now. `assoc` is which way a position that touches an insertion goes: 1
   * after it, -1 before it. A position inside text the edits replaced goes to the edge of what replaced it.
   */
  mapPosition(pos: number, version: number, assoc: -1 | 1 = 1): MappedPosition {
    const changes = this.changesSince(version);
    return changes === undefined ? { kind: 'unknown' } : { kind: 'at', pos: changes.mapPos(pos, assoc) };
  }

  private transactionOf(change: Transaction | TransactionSpec): Transaction {
    if ('startState' in change) return change;
    if (this.now === undefined || change.annotations !== undefined) return this.current.update(change);
    return this.current.update(change, { annotations: [Transaction.time.of(this.now())] });
  }
}
