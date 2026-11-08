import React, { Component, createContext, Fragment, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useParams,
  type RouterHistory,
} from '@tanstack/react-router';
import { Button, Portal, ScrollView, Select, Text, TextField, View, type UIHandle, type UIInputEvent, type UIKeyboardEvent } from 'godot-react-ui';
import { LAB_GROUPS, LABS, filterLabs, labsInOrder, type Lab, type SceneLab, type WindowLab } from './labs';
import { ExpectedVisibleProvider } from './lab-parts';
import { CodeEditor } from './code-editor';
import { labCodeKey, openLabCode, releaseLabCode, type CodeSupport, type LabCode } from './editor/lab-code';

declare global {
  // eslint-disable-next-line no-var
  var scrollTo: ((x?: number, y?: number) => void) | undefined;
  // eslint-disable-next-line no-var
  var self: typeof globalThis | undefined;
}

if (typeof globalThis.scrollTo === 'undefined') {
  globalThis.scrollTo = () => {};
}
if (typeof globalThis.self === 'undefined') {
  globalThis.self = globalThis;
}

/**
 * The demo's shop window: every lab behind one navigation shell, built from the library's own kit and utility classes.
 *
 * From 1024 logical pixels wide (`lg:`) a sidebar lists the labs by group and the lab fills the rest; below that a top bar has
 * the kit's `Select` for the lab. The two are one tree with `hidden lg:flex` and `lg:hidden` on them, so a window crossing the
 * breakpoint restyles natively and React is not involved. The lab sits in a clipped, scrolling content area, inside an error
 * boundary keyed by the lab: leaving a lab unmounts it, and a lab that throws shows its error in place. A lab over the game
 * (`surface: 'game'`) needs every ancestor of its area to let pointers through, so the whole navigator does, and its own chrome
 * (the bar, the sidebar and the header) takes them back.
 *
 * Keyboard: Tab reaches the filter, the list (one tab stop, the current lab), the header buttons and the lab. In the list the
 * arrow keys, Home and End move between labs and Enter or Space opens one. Alt+Down and Alt+Up open the next and the previous lab
 * from anywhere in the shell (a lab that handles the chord itself keeps it; the kit's controls ignore Alt chords).
 */

export interface NavigatorProps {
  /** The labs to list: the demo's own by default. */
  labs?: readonly Lab[];
  /** The id the run asked to open (`--lab=`). One that names no lab is shown as an error, not replaced by another lab. */
  initialLab?: string;
  /** The user opened the lab with this id. */
  onLabChange?: (id: string) => void;
  /** Open a lab that is its own Godot scene. Without it the button says the host cannot. */
  onOpenScene?: (lab: SceneLab) => void;
  /** What the code panel needs to edit a lab live. Without it there is no Code button. */
  code?: CodeSupport;
  /** An optional router history (e.g. MemoryHistory in tests, HashHistory on web). */
  history?: RouterHistory;
}

const NEXT = 1;
const PREVIOUS = -1;
const FIRST_LAB = 0;
/** The playground's page padding (`App`): 24 pixels, 32 from 768. */
const PAGE_PADDING = 'p-6 md:p-8';
const HEADER_BUTTON = 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 focus:border-indigo-500';
const PRIMARY_BUTTON = 'rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 active:bg-indigo-800 focus:border-indigo-500';

/** The lab `delta` places from `from` in `list`, wrapping at both ends; from nothing, the first (forwards) or the last (backwards). */
function neighbour(list: readonly Lab[], from: string | undefined, delta: number): Lab | undefined {
  if (list.length === 0) return undefined;
  const at = list.findIndex(lab => lab.id === from);
  const target = at === -1 ? (delta > 0 ? FIRST_LAB : list.length - 1) : (at + delta + list.length) % list.length;
  return list[target];
}

/** Whether a key press carries a chord, which is a shortcut for the platform or the game and not a key of the control. */
function hasChord(event: UIKeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

/** A one pixel line across its parent. Borders are all four sides or none, so a divider is an element. */
function Rule() {
  return <View className="h-px shrink-0 bg-slate-200" />;
}

function BrandMark() {
  return (
    <View className="h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
      <View className="h-3 w-3 rounded-sm bg-white" />
    </View>
  );
}

/** What a lab is when it is not a plain page, for the list: a caption that says choosing it leaves the content area. */
function launchCaption(lab: Lab): string | undefined {
  if (lab.kind === 'window') return 'Full window';
  if (lab.kind === 'scene') return 'Scene';
  return undefined;
}

interface LabListProps {
  labs: readonly Lab[];
  selectedId: string | undefined;
  onChoose: (id: string) => void;
  /** The list's buttons by lab id, filled by the list: the navigator sends focus into it through these. */
  handles: MutableRefObject<Map<string, UIHandle>>;
}

/** The sidebar's list: a listbox of the labs by group, with one tab stop and the arrow keys between the labs. */
function LabList({ labs, selectedId, onChoose, handles }: LabListProps) {
  const tabStop = labs.some(lab => lab.id === selectedId) ? selectedId : labs[FIRST_LAB]?.id;
  // The current lab is in view when the list appears and whenever the lab changes, from anywhere (a key, a button, the start).
  useEffect(() => {
    if (selectedId !== undefined) handles.current.get(selectedId)?.scrollIntoView();
  }, [handles, selectedId]);

  const focusAt = (lab: Lab | undefined) => {
    if (lab !== undefined) handles.current.get(lab.id)?.focus();
  };
  const onKeyDown = (event: UIKeyboardEvent) => {
    if (hasChord(event)) return;
    const from = labs.findIndex(lab => handles.current.get(lab.id)?.id === event.target.id);
    if (event.key === 'ArrowDown') focusAt(labs[Math.min(from + 1, labs.length - 1)]);
    else if (event.key === 'ArrowUp') focusAt(labs[Math.max(from - 1, FIRST_LAB)]);
    else if (event.key === 'Home') focusAt(labs[FIRST_LAB]);
    else if (event.key === 'End') focusAt(labs[labs.length - 1]);
    else return;
    event.preventDefault();
  };

  if (labs.length === 0) {
    return <Text testID="lab-list-empty" className="px-3 py-2 text-sm text-slate-500">No lab matches that filter.</Text>;
  }
  return (
    <View testID="lab-list" role="listbox" aria-label="Labs" className="gap-4" onKeyDown={onKeyDown}>
      {LAB_GROUPS.map(group => {
        const members = labs.filter(lab => lab.group === group);
        if (members.length === 0) return null;
        return (
          <View key={group} role="group" aria-label={group} className="gap-0.5">
            <Text className="px-3 pb-1 text-xs text-slate-500">{group.toUpperCase()}</Text>
            {members.map(lab => {
              const selected = lab.id === selectedId;
              const caption = launchCaption(lab);
              return (
                <Button
                  key={lab.id}
                  ref={handle => {
                    if (handle === null) handles.current.delete(lab.id);
                    else handles.current.set(lab.id, handle);
                  }}
                  testID={`lab-item-${lab.id}`}
                  role="option"
                  aria-selected={selected}
                  tabIndex={lab.id === tabStop ? 0 : -1}
                  className={`flex-row items-center justify-between gap-2 text-left rounded-lg px-3 py-2 ${selected ? 'bg-indigo-50' : 'hover:bg-slate-100 active:bg-slate-200'}`}
                  onClick={() => onChoose(lab.id)}
                >
                  <Text className={`min-w-0 shrink text-sm ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{lab.title}</Text>
                  {caption === undefined ? null : <Text className="shrink-0 text-xs text-slate-400">{caption}</Text>}
                </Button>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

interface FilterFieldProps {
  testID: string;
  query: string;
  onQuery: (query: string) => void;
  /** Enter: open the first lab that matches. */
  onSubmit: () => void;
  /** Down arrow: go to the list, where there is one. */
  onEnterList?: () => void;
  className?: string;
}

function FilterField({ testID, query, onQuery, onSubmit, onEnterList, className }: FilterFieldProps) {
  return (
    <TextField
      testID={testID}
      className={className}
      aria-label="Filter labs"
      placeholder="Filter labs"
      value={query}
      inputClassName="py-1.5 text-sm"
      onChange={(event: UIInputEvent) => onQuery(event.value)}
      onSubmit={onSubmit}
      onKeyDown={(event: UIKeyboardEvent) => {
        if (hasChord(event)) return;
        if (event.key === 'ArrowDown' && onEnterList !== undefined) { event.preventDefault(); onEnterList(); }
        else if (event.key === 'Escape' && query !== '') { event.preventDefault(); onQuery(''); }
      }}
    />
  );
}

interface LabFailureProps {
  lab: Lab;
  error: Error;
  onRetry: () => void;
}

/** What a lab that threw shows in place of itself. The message and the stack can be selected and copied. */
function LabFailure({ lab, error, onRetry }: LabFailureProps) {
  return (
    <View testID="lab-error" role="region" aria-label={`${lab.title} failed`} className="w-full p-6">
      <View className="select-text gap-3 rounded-2xl border border-rose-200 bg-white p-6">
        <Text className="text-xs text-rose-600">THIS LAB FAILED</Text>
        <Text className="text-lg text-slate-900">{`${lab.title} threw while it was rendering.`}</Text>
        <Text testID="lab-error-message" className="select-text text-sm text-slate-700">{error.message}</Text>
        {error.stack === undefined ? null : <Text testID="lab-error-stack" className="select-text text-xs text-slate-500">{error.stack}</Text>}
        <Text className="text-sm text-slate-500">The rest of the demo is unaffected: choose another lab, or try this one again.</Text>
        <Button testID="lab-error-retry" className={`self-start ${HEADER_BUTTON}`} onClick={onRetry}>Try again</Button>
      </View>
    </View>
  );
}

interface LabBoundaryProps {
  lab: Lab;
  children?: ReactNode;
}

interface LabBoundaryState {
  error: Error | undefined;
  /** Counts retries: a retry mounts the lab again from nothing. */
  attempt: number;
}

/** Catches what a lab throws while it renders, so the navigator survives it. React reports the error to the console once. */
class LabBoundary extends Component<LabBoundaryProps, LabBoundaryState> {
  override state: LabBoundaryState = { error: undefined, attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<LabBoundaryState> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render(): ReactNode {
    const { error, attempt } = this.state;
    if (error !== undefined) {
      return <LabFailure lab={this.props.lab} error={error} onRetry={() => this.setState({ error: undefined, attempt: attempt + 1 })} />;
    }
    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}

/**
 * The page of a lab, inside its boundary. The boundary is keyed by the lab, so choosing another lab starts it afresh. `page` is the
 * component to render instead of the lab's own: the live session's, when the lab is being edited.
 */
function LabPage({ lab, page }: { lab: Lab; page?: ComponentType }) {
  if (lab.kind === 'scene') throw new Error(`${lab.title} is a scene, not a component`);
  const Page = page ?? lab.component;
  return <LabBoundary key={lab.id} lab={lab}><Page /></LabBoundary>;
}

/**
 * The code of the lab on the stage, once the person has asked for it: a live session of the lab and the editor of its files, kept
 * for as long as the lab stays selected (hiding the panel does not throw an edit away; choosing another lab does) and released when
 * the lab changes or the navigator goes. Opening is a layout effect, so the page the person sees is the live one in the commit
 * that follows the click.
 */
function useLabCode(lab: Lab | undefined, support: CodeSupport | undefined, wanted: boolean): LabCode | undefined {
  const [held, setHeld] = useState<{ readonly labId: string; readonly code: LabCode } | undefined>(undefined);
  const current = useRef(held);
  const editable = lab !== undefined && lab.kind === 'inline' ? lab : undefined;
  useLayoutEffect(() => { current.current = held; }, [held]);
  useLayoutEffect(() => {
    if (editable === undefined || support === undefined) {
      if (held !== undefined) setHeld(undefined);
      return;
    }
    if (wanted && held?.labId !== editable.id) {
      // The panel is there at once, editable, while the lab is compiled. If that fails the same files are shown read-only with the reason
      // (a lab that has been left since has no panel to give it to).
      const code = openLabCode(editable, support, readOnly => {
        if (current.current?.code === code) setHeld({ labId: editable.id, code: readOnly });
        else releaseLabCode(readOnly);
      });
      setHeld({ labId: editable.id, code });
    } else if (held !== undefined && held.labId !== editable.id) setHeld(undefined);
  }, [editable?.id, support, wanted, held]);
  useLayoutEffect(() => () => { if (held !== undefined) releaseLabCode(held.code); }, [held]);
  return held !== undefined && held.labId === editable?.id ? held.code : undefined;
}

interface LaunchCardProps {
  lab: WindowLab | SceneLab;
  onOpenWindow: () => void;
  onOpenScene: ((lab: SceneLab) => void) | undefined;
}

/** The content area of a lab that cannot sit in it: why, and the button that gives it the window or its scene. */
function LaunchCard({ lab, onOpenWindow, onOpenScene }: LaunchCardProps) {
  const scene = lab.kind === 'scene';
  const unavailable = scene && onOpenScene === undefined;
  return (
    <View testID="lab-launch" className="w-full max-w-md gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Text className="text-xs text-slate-500">{scene ? 'A SEPARATE SCENE' : 'NEEDS THE WHOLE WINDOW'}</Text>
      <Text className="text-lg text-slate-900">{lab.title}</Text>
      <Text className="text-sm text-slate-600">{lab.reason}</Text>
      <Button
        testID="lab-launch-open"
        disabled={unavailable}
        className={`self-start ${PRIMARY_BUTTON} disabled:opacity-50`}
        onClick={() => { if (lab.kind === 'scene') onOpenScene?.(lab); else onOpenWindow(); }}
      >
        {scene ? 'Open the scene' : 'Open in the full window'}
      </Button>
      <Text className="text-xs text-slate-400">
        {unavailable ? 'This host cannot change scene.'
          : scene ? 'A button in the corner of the scene brings you back to the labs.' : 'Escape, or the Labs button in the corner, brings you back.'}
      </Text>
    </View>
  );
}

/** The way back from a lab that has the whole window: in the overlay layer, so nothing the lab draws can cover it. */
function WindowBar({ lab, onBack }: { lab: Lab; onBack: () => void }) {
  // Events inside a Portal bubble through the overlay layer, not to the navigator, so the bar answers Escape itself.
  const onKeyDown = (event: UIKeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    onBack();
  };
  return (
    <Portal>
      <View testID="window-bar" className="fixed bottom-4 left-4 z-50 flex-row items-center gap-3 rounded-full bg-slate-900/90 py-1.5 pl-1.5 pr-4" onKeyDown={onKeyDown}>
        <Button
          testID="window-back"
          autoFocus
          className="rounded-full border border-transparent bg-white/20 px-3 py-1 text-sm text-white hover:bg-white/30 active:bg-white/40"
          onClick={onBack}
        >
          Labs
        </Button>
        <Text className="text-sm text-white">{lab.title}</Text>
      </View>
    </Portal>
  );
}

/** An unknown `--lab=` id: the error, and every id that would have worked. */
function MissingLab({ id, labs }: { id: string; labs: readonly Lab[] }) {
  return (
    <View testID="lab-missing" role="region" aria-label="Lab not found" className="w-full p-6">
      <View className="gap-3 rounded-2xl border border-rose-200 bg-white p-6">
        <Text className="text-xs text-rose-600">LAB NOT FOUND</Text>
        <Text testID="lab-missing-message" className="select-text text-lg text-slate-900">{`There is no lab called "${id}".`}</Text>
        <Text className="text-sm text-slate-600">Choose one from the list. The ids that can follow --lab= (or ?lab= on the Web) are:</Text>
        <Text testID="lab-missing-ids" className="select-text text-sm text-slate-700">{labs.map(lab => lab.id).join(', ')}</Text>
      </View>
    </View>
  );
}

interface HeaderProps {
  lab: Lab | undefined;
  missing: string | undefined;
  /** "3 of 21", or nothing. */
  position: string;
  onStep: (delta: number) => void;
  canEdit?: boolean;
  codeOpen?: boolean;
  onToggleCode?: () => void;
  showExpected?: boolean;
  onToggleExpected?: () => void;
}

function LabHeader({ lab, missing, position, onStep, canEdit, codeOpen, onToggleCode, showExpected, onToggleExpected }: HeaderProps) {
  const title = lab?.title ?? 'Lab not found';
  const description = lab?.description ?? `"${missing ?? ''}" is not one of the labs.`;
  return (
    <View testID="lab-header" className="bg-white pointer-events-auto">
      <View className="flex-row flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 py-4 md:px-6">
        <View className="min-w-[240px] flex-1 gap-1">
          <Text testID="lab-group" className="text-xs text-slate-500">{lab === undefined ? 'LABS' : lab.group.toUpperCase()}</Text>
          <Text testID="lab-title" className="text-xl text-slate-900">{title}</Text>
          <Text testID="lab-description" className="text-sm text-slate-500">{description}</Text>
        </View>
        <View className="shrink-0 flex-row items-center gap-2">
          <Text testID="lab-position" className="mr-1 text-xs text-slate-400">{position}</Text>
          <Button testID="lab-previous" aria-label="Previous lab" className={HEADER_BUTTON} onClick={() => onStep(PREVIOUS)}>Previous</Button>
          <Button testID="lab-next" aria-label="Next lab" className={HEADER_BUTTON} onClick={() => onStep(NEXT)}>Next</Button>
          {onToggleExpected !== undefined ? (
            <Button
              testID="toggle-expected"
              aria-label="Toggle expected text"
              aria-pressed={showExpected}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                showExpected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
              }`}
              onClick={onToggleExpected}
            >
              <Text className={showExpected ? 'text-indigo-700 font-semibold' : 'text-slate-700'}>
                {showExpected ? 'Hide Expected' : 'Show Expected'}
              </Text>
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              testID="toggle-code"
              aria-label="Toggle code editor"
              aria-pressed={codeOpen}
              className={`hidden md:flex rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                codeOpen
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
              }`}
              onClick={onToggleCode}
            >
              <Text className={codeOpen ? 'text-indigo-700 font-semibold' : 'text-slate-700'}>
                {codeOpen ? 'Hide Code' : '</> Code'}
              </Text>
            </Button>
          ) : null}
        </View>
      </View>
      <Rule />
    </View>
  );
}

interface NavigatorContextValue {
  labs: readonly Lab[];
  ordered: readonly Lab[];
  selectedId: string | undefined;
  selected: Lab | undefined;
  missing: string | undefined;
  query: string;
  setQuery: (q: string) => void;
  windowOpen: boolean;
  setWindowOpen: (open: boolean) => void;
  codeOpen: boolean;
  setCodeOpen: (action: boolean | ((open: boolean) => boolean)) => void;
  showExpected: boolean;
  setShowExpected: (action: boolean | ((open: boolean) => boolean)) => void;
  handles: MutableRefObject<Map<string, UIHandle>>;
  choose: (id: string) => void;
  step: (delta: number) => void;
  onOpenScene?: (lab: SceneLab) => void;
  codeSupport?: CodeSupport;
  livePage?: ComponentType;
  codePanel?: { lab: Lab; code: LabCode };
}

const NavigatorContext = createContext<NavigatorContextValue | null>(null);

function useNavigatorContext(): NavigatorContextValue {
  const ctx = useContext(NavigatorContext);
  if (ctx === null) throw new Error('useNavigatorContext must be used within Navigator');
  return ctx;
}

function StageOutlet() {
  const ctx = useNavigatorContext();
  const params = useParams({ strict: false });
  const labId = ctx.selectedId ?? params.labId;
  const lab = labId !== undefined ? ctx.ordered.find(l => l.id === labId) : undefined;

  if (lab === undefined) {
    return (
      <ScrollView testID="lab-scroll" className="absolute inset-0">
        <MissingLab id={ctx.missing ?? params.labId ?? ''} labs={ctx.ordered} />
      </ScrollView>
    );
  }

  if (lab.kind !== 'inline') {
    // The card is centred in the area and scrolls in a window too short for it.
    return (
      <ScrollView key={lab.id} testID="lab-scroll" className="absolute inset-0" contentClassName="items-center justify-center p-6">
        <LaunchCard lab={lab} onOpenWindow={() => ctx.setWindowOpen(true)} onOpenScene={ctx.onOpenScene} />
      </ScrollView>
    );
  }

  if (lab.surface === 'game') {
    return (
      <View key={lab.id} className="absolute inset-0">
        <LabPage lab={lab} page={ctx.livePage} />
      </View>
    );
  }

  return (
    <ScrollView key={lab.id} testID="lab-scroll" className="absolute inset-0" contentClassName={lab.padded === true ? PAGE_PADDING : undefined}>
      <LabPage lab={lab} page={ctx.livePage} />
    </ScrollView>
  );
}

function NavigatorShell() {
  const ctx = useNavigatorContext();
  const { selected, codePanel } = ctx;

  const visible = useMemo(() => filterLabs(ctx.ordered, ctx.query), [ctx.ordered, ctx.query]);
  const menuLabs = useMemo(() => ctx.ordered.filter(lab => lab.id === ctx.selectedId || visible.includes(lab)), [ctx.ordered, ctx.selectedId, visible]);
  const position = selected === undefined ? '' : `${ctx.ordered.indexOf(selected) + 1} of ${ctx.ordered.length}`;

  const focusFirst = () => {
    const first = visible[FIRST_LAB];
    if (first !== undefined) ctx.handles.current.get(first.id)?.focus();
  };
  const submitFilter = () => {
    const first = visible[FIRST_LAB];
    if (first !== undefined) ctx.choose(first.id);
  };
  const onKeyDown = (event: UIKeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && ctx.windowOpen) {
      event.preventDefault();
      ctx.setWindowOpen(false);
      return;
    }
    if (ctx.windowOpen || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); ctx.step(NEXT); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); ctx.step(PREVIOUS); }
  };

  // One lab owns the whole window: nothing of the shell is mounted behind it.
  if (ctx.windowOpen && selected !== undefined && selected.kind === 'window') {
    return (
      <View testID="navigator" tabIndex={-1} className="w-full h-full" onKeyDown={onKeyDown}>
        <ExpectedVisibleProvider value={ctx.showExpected}>
          <LabPage lab={selected} />
        </ExpectedVisibleProvider>
        <WindowBar lab={selected} onBack={() => ctx.setWindowOpen(false)} />
      </View>
    );
  }

  const game = selected !== undefined && selected.kind === 'inline' && selected.surface === 'game';

  return (
    <View testID="navigator" tabIndex={-1} className={`w-full h-full lg:flex-row ${game ? 'pointer-events-none' : ''}`} onKeyDown={onKeyDown}>
      {/* Narrow: a top bar with the lab menu and the filter. */}
      <View testID="navigator-bar" className="lg:hidden bg-white pointer-events-auto">
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <BrandMark />
          <Select.Root value={ctx.selectedId ?? null} onValueChange={ctx.choose}>
            <Select.Trigger testID="lab-menu" aria-label="Lab" className="min-w-[180px] flex-1">
              <Select.Value testID="lab-menu-value" placeholder="Choose a lab" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Content testID="lab-menu-list">
              {menuLabs.map(lab => (
                <Select.Item key={lab.id} value={lab.id} textValue={lab.title} testID={`lab-menu-item-${lab.id}`}>
                  <Select.ItemText>{lab.title}</Select.ItemText>
                  <Text className="text-xs text-slate-400">{lab.group}</Text>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <FilterField testID="lab-menu-filter" className="min-w-[160px] flex-1" query={ctx.query} onQuery={ctx.setQuery} onSubmit={submitFilter} />
        </View>
        <Rule />
      </View>

      {/* Wide: the sidebar and its edge. */}
      <View testID="navigator-sidebar" className="hidden lg:flex flex-row shrink-0 bg-white pointer-events-auto">
        <View className="w-64">
          <View className="gap-4 p-4">
            <View className="flex-row items-center gap-3">
              <BrandMark />
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-slate-900">Godot React UI</Text>
                <Text className="text-xs text-slate-500">Labs</Text>
              </View>
            </View>
            <FilterField testID="lab-filter" query={ctx.query} onQuery={ctx.setQuery} onSubmit={submitFilter} onEnterList={focusFirst} />
          </View>
          <ScrollView testID="lab-sidebar-scroll" focusable={false} className="min-h-0 flex-1" contentClassName="px-2 pb-4">
            <LabList labs={visible} selectedId={ctx.selectedId} onChoose={ctx.choose} handles={ctx.handles} />
          </ScrollView>
          <Rule />
          <View className="px-4 py-3">
            <Text className="text-xs text-slate-400">Alt + Up / Down switches labs.</Text>
          </View>
        </View>
        <View className="w-px shrink-0 bg-slate-200" />
      </View>

      <View className="min-h-0 min-w-0 flex-1">
        <LabHeader
          lab={selected}
          missing={ctx.missing}
          position={position}
          onStep={ctx.step}
          canEdit={ctx.codeSupport !== undefined && selected?.kind === 'inline' && selected.sources.length > 0}
          codeOpen={ctx.codeOpen}
          onToggleCode={() => ctx.setCodeOpen(open => !open)}
          showExpected={ctx.showExpected}
          onToggleExpected={() => ctx.setShowExpected(open => !open)}
        />
        {/* The stage keeps its place in the tree whether or not the code is beside it, so the lab on it keeps its state when the panel is shown or hidden. */}
        <View className={`relative min-h-0 flex-1 overflow-hidden ${codePanel ? 'flex-col xl:flex-row' : ''} ${game ? 'pointer-events-none' : ''}`}>
          <View
            testID="lab-stage"
            role="region"
            aria-label="Lab"
            className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${game ? 'pointer-events-none' : 'bg-slate-50'}`}
          >
            <ExpectedVisibleProvider value={ctx.showExpected}>
              <Outlet />
            </ExpectedVisibleProvider>
          </View>
          {codePanel ? (
            <>
              <View className="w-full h-px xl:w-px xl:h-full bg-slate-200 shrink-0 pointer-events-auto" />
              <View className="h-[45%] xl:h-full xl:w-[45%] min-w-0 min-h-0 shrink-0 pointer-events-auto">
                <CodeEditor key={labCodeKey(codePanel.code)} lab={codePanel.lab} code={codePanel.code} />
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function Navigator({ labs = LABS, initialLab, onLabChange, onOpenScene, code: codeSupport, history: historyProp }: NavigatorProps) {
  const ordered = useMemo(() => labsInOrder(labs), [labs]);
  const requested = initialLab === undefined ? undefined : ordered.find(lab => lab.id === initialLab);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialLab === undefined ? ordered[FIRST_LAB]?.id : requested?.id);
  const [missing, setMissing] = useState<string | undefined>(initialLab !== undefined && requested === undefined ? initialLab : undefined);
  const [query, setQuery] = useState('');
  const [windowOpen, setWindowOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [showExpected, setShowExpected] = useState(false);
  const handles = useRef(new Map<string, UIHandle>());

  const selected = ordered.find(lab => lab.id === selectedId);
  const labCode = useLabCode(selected, codeSupport, codeOpen);
  const livePage = labCode !== undefined && labCode.kind === 'live' ? labCode.session.Lab : undefined;
  const codePanel = codeOpen && selected !== undefined && labCode !== undefined ? { lab: selected, code: labCode } : undefined;

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: NavigatorShell,
    });
    const labRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/labs/$labId',
      component: StageOutlet,
    });
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: StageOutlet,
    });
    const routeTree = rootRoute.addChildren([indexRoute, labRoute]);

    const initialEntry = initialLab !== undefined
      ? `/labs/${initialLab}`
      : (ordered[FIRST_LAB] !== undefined ? `/labs/${ordered[FIRST_LAB].id}` : '/');

    const history = historyProp ?? createMemoryHistory({ initialEntries: [initialEntry] });

    const r = createRouter({
      routeTree,
      history,
      isServer: false,
      origin: 'http://localhost',
      scrollRestorationBehavior: 'manual',
    });

    const matches = r.matchRoutes(r.latestLocation);
    r.stores.setMatches(matches);
    return r;
  }, [ordered, initialLab, historyProp]);

  // Synchronize history navigation (back/forward or external) with local state
  useEffect(() => {
    return router.history.subscribe(() => {
      const loc = router.latestLocation;
      const match = loc.pathname.match(/^\/labs\/(.+)$/);
      if (match) {
        const id = match[1];
        const lab = ordered.find(l => l.id === id);
        if (lab) {
          setSelectedId(lab.id);
          setMissing(undefined);
        } else {
          setSelectedId(undefined);
          setMissing(id);
        }
        setWindowOpen(false);
      }
    });
  }, [router, ordered]);

  const choose = (id: string) => {
    setSelectedId(id);
    setMissing(undefined);
    setWindowOpen(false);
    const next = router.buildLocation({ to: '/labs/$labId', params: { labId: id } });
    router.stores.setMatches(router.matchRoutes(next));
    router.commitLocation(next);
    onLabChange?.(id);
  };

  const visible = useMemo(() => filterLabs(ordered, query), [ordered, query]);
  // Previous and next walk what the filter shows; with the filter matching nothing, every lab.
  const walk = visible.length > 0 ? visible : ordered;

  const step = (delta: number) => {
    const target = neighbour(walk, selectedId, delta);
    if (target !== undefined) choose(target.id);
  };

  const contextValue: NavigatorContextValue = {
    labs,
    ordered,
    selectedId,
    selected,
    missing,
    query,
    setQuery,
    windowOpen,
    setWindowOpen,
    codeOpen,
    setCodeOpen,
    showExpected,
    setShowExpected,
    handles,
    choose,
    step,
    onOpenScene,
    codeSupport,
    livePage,
    codePanel,
  };

  return (
    <NavigatorContext.Provider value={contextValue}>
      <RouterProvider router={router} />
    </NavigatorContext.Provider>
  );
}
