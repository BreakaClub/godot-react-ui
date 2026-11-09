import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Text, TextInput, View, type TextInputHandle, type UIInputEvent, type UIKeyboardEvent } from 'godot-react-ui';

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

  const prevEpoch = useRef(searchEpoch);
  useEffect(() => {
    if (searchEpoch !== prevEpoch.current) {
      prevEpoch.current = searchEpoch;
      if (initialQuery !== undefined && initialQuery !== '') {
        setQuery(initialQuery);
      }
      inputRef.current?.focus();
    }
  }, [searchEpoch, initialQuery]);

  const matches = useMemo(
    () => findCodeMatches(docText, query, { caseSensitive, wholeWord }),
    [docText, query, caseSensitive, wholeWord],
  );

  const prevMatches = useRef(matches);
  useEffect(() => {
    if (matches.length === 0) {
      setMatchIndex(0);
      return;
    }
    const idx = Math.min(matchIndex, matches.length - 1);
    setMatchIndex(idx);
    const m = matches[idx];
    if (m !== undefined && (prevMatches.current !== matches || query !== '')) {
      onFindMatch(m.from, m.to);
    }
    prevMatches.current = matches;
  }, [matches, matchIndex, onFindMatch, query]);

  const findNext = () => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    const m = matches[next];
    if (m) onFindMatch(m.from, m.to);
  };

  const findPrev = () => {
    if (matches.length === 0) return;
    const prev = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(prev);
    const m = matches[prev];
    if (m) onFindMatch(m.from, m.to);
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

  const countText = query === '' ? '' : matches.length === 0 ? '0 of 0' : `${matchIndex + 1} of ${matches.length}`;

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
        onChange={(event: UIInputEvent) => setQuery(event.value)}
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
        onClick={() => setCaseSensitive(c => !c)}
      >
        <Text className={`font-mono text-xs ${caseSensitive ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>Aa</Text>
      </Button>
      <Button
        testID="code-search-whole-word"
        aria-label="Match whole word"
        aria-pressed={wholeWord}
        className={`rounded px-1.5 py-0.5 border ${wholeWord ? 'border-indigo-500 bg-indigo-950' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
        onClick={() => setWholeWord(w => !w)}
      >
        <Text className={`font-mono text-xs ${wholeWord ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>\\b</Text>
      </Button>
      <Button
        testID="code-search-previous"
        aria-label="Previous match"
        disabled={matches.length === 0}
        className="rounded px-2 py-0.5 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
        onClick={findPrev}
      >
        <Text className="text-xs text-slate-300">↑</Text>
      </Button>
      <Button
        testID="code-search-next"
        aria-label="Next match"
        disabled={matches.length === 0}
        className="rounded px-2 py-0.5 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30"
        onClick={findNext}
      >
        <Text className="text-xs text-slate-300">↓</Text>
      </Button>
      <Button
        testID="code-search-close"
        aria-label="Close search"
        className="rounded px-2 py-0.5 border border-transparent hover:bg-slate-800"
        onClick={onClose}
      >
        <Text className="text-xs text-slate-400">✕</Text>
      </Button>
    </View>
  );
}
