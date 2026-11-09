import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Text, TextInput, View, type TextInputHandle, type UIInputEvent, type UIKeyboardEvent } from 'godot-react-ui';
import { SearchChevronDown, SearchChevronUp, SearchClose } from '../../search-icons';

export interface CodeMatch {
  readonly from: number;
  readonly to: number;
}

export function findCodeMatches(
  docText: string,
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean },
): readonly CodeMatch[] {
  if (query === '') return [];
  const matches: CodeMatch[] = [];
  if (options.wholeWord) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, options.caseSensitive ? 'g' : 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(docText)) !== null) {
      matches.push({ from: m.index, to: m.index + m[0].length });
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  } else {
    const needle = options.caseSensitive ? query : query.toLowerCase();
    const haystack = options.caseSensitive ? docText : docText.toLowerCase();
    let index = 0;
    while ((index = haystack.indexOf(needle, index)) !== -1) {
      matches.push({ from: index, to: index + needle.length });
      index += needle.length;
    }
  }
  return matches;
}

export interface CodeSearchProps {
  readonly docText: string;
  readonly initialQuery?: string;
  readonly searchEpoch: number;
  readonly onFindMatch: (from: number, to: number) => void;
  readonly onClose: () => void;
}

export function CodeSearch({ docText, initialQuery, searchEpoch, onFindMatch, onClose }: CodeSearchProps) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<TextInputHandle | null>(null);

  // The matches follow the document, and the count with them. The editor's selection moves to a match only when the search moves: a new
  // query or option, Next or Previous, the bar opening on a query, or Find again on another selection. An edit (the user typing in the
  // editor) is not a search: it leaves the selection where the user put it.
  const matches = useMemo(
    () => findCodeMatches(docText, query, { caseSensitive, wholeWord }),
    [docText, query, caseSensitive, wholeWord],
  );
  const current = matches.length === 0 ? 0 : Math.min(matchIndex, matches.length - 1);

  const select = (found: readonly CodeMatch[], index: number) => {
    setMatchIndex(index);
    const match = found[index];
    if (match !== undefined) onFindMatch(match.from, match.to);
  };
  /** Search again with a changed query or option: the match it was on, or the last one if there are fewer now. */
  const research = (nextQuery: string, options: { caseSensitive: boolean; wholeWord: boolean }) => {
    const found = findCodeMatches(docText, nextQuery, options);
    select(found, found.length === 0 ? 0 : Math.min(current, found.length - 1));
  };

  // Runs when the bar opens and on every Find after: the render that brings a new epoch brings the selection's text with it. The ref is
  // `undefined` until the bar has opened (a bar opened on a query selects its match), and keeps a repeated run of one epoch from searching twice.
  const shownEpoch = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (searchEpoch === shownEpoch.current) return;
    const opening = shownEpoch.current === undefined;
    shownEpoch.current = searchEpoch;
    if (!opening) inputRef.current?.focus();
    if (initialQuery === undefined || initialQuery === '' || (!opening && initialQuery === query)) return;
    setQuery(initialQuery);
    research(initialQuery, { caseSensitive, wholeWord });
  }, [searchEpoch]);

  const findNext = () => {
    if (matches.length === 0) return;
    select(matches, (current + 1) % matches.length);
  };

  const findPrev = () => {
    if (matches.length === 0) return;
    select(matches, (current - 1 + matches.length) % matches.length);
  };

  const onKeyDown = (event: UIKeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) findPrev();
      else findNext();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if ((event.key === 'f' || event.key === 'F') && (event.ctrlKey || event.metaKey) && !event.altKey) {
      event.preventDefault();
      findNext();
    }
  };

  const countText = query === '' ? '' : matches.length === 0 ? '0 of 0' : `${current + 1} of ${matches.length}`;

  return (
    <View
      testID="code-search"
      className="absolute top-10 right-4 z-30 flex-row items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1.5 shadow-xl pointer-events-auto"
    >
      <TextInput
        ref={inputRef}
        testID="code-search-input"
        aria-label="Find in code"
        placeholder="Find"
        value={query}
        autoFocus
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 font-mono w-40 focus:border-indigo-500"
        onChange={(event: UIInputEvent) => {
          setQuery(event.value);
          research(event.value, { caseSensitive, wholeWord });
        }}
        onKeyDown={onKeyDown}
      />
      <Text testID="code-search-count" className="font-mono text-xs text-slate-400 min-w-[48px] text-center">
        {countText}
      </Text>
      <Button
        testID="code-search-match-case"
        aria-label="Match case"
        aria-pressed={caseSensitive}
        className={`rounded px-1.5 py-0.5 border ${caseSensitive ? 'border-indigo-500 bg-indigo-950' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => {
          setCaseSensitive(!caseSensitive);
          research(query, { caseSensitive: !caseSensitive, wholeWord });
        }}
      >
        <Text className={`font-mono text-xs ${caseSensitive ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>Aa</Text>
      </Button>
      <Button
        testID="code-search-whole-word"
        aria-label="Match whole word"
        aria-pressed={wholeWord}
        className={`rounded px-1.5 py-0.5 border ${wholeWord ? 'border-indigo-500 bg-indigo-950' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => {
          setWholeWord(!wholeWord);
          research(query, { caseSensitive, wholeWord: !wholeWord });
        }}
      >
        <Text className={`font-mono text-xs ${wholeWord ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>{'\\b'}</Text>
      </Button>
      <Button
        testID="code-search-previous"
        aria-label="Previous match"
        disabled={matches.length === 0}
        className="rounded px-2 py-1 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
        onClick={findPrev}
      >
        <SearchChevronUp className="border-slate-300" />
      </Button>
      <Button
        testID="code-search-next"
        aria-label="Next match"
        disabled={matches.length === 0}
        className="rounded px-2 py-1 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
        onClick={findNext}
      >
        <SearchChevronDown className="border-slate-300" />
      </Button>
      <Button
        testID="code-search-close"
        aria-label="Close search"
        className="rounded px-2 py-1 border border-transparent hover:bg-slate-800"
        onClick={onClose}
      >
        <SearchClose className="bg-slate-400" />
      </Button>
    </View>
  );
}
