import { memo, Profiler } from 'react';
import { Text, View, type Style } from 'godot-react-ui';

export interface BenchmarkProps {
  /** Number of direct, keyed fixture cells. The total native node count is larger. */
  count: number;
  text: boolean;
  phase: number;
  /**
   * `hover` and `responsive` give every cell `hover:` and `md:` variant classes instead of inline paint,
   * for the baseline scenarios that sweep the mouse or resize across the `md` breakpoint.
   */
  mode: 'paint' | 'layout' | 'text' | 'hover' | 'responsive';
  /** `paint` mode only: just this cell changes colour; omitted, every cell does. */
  only?: number;
  /**
   * Render each cell through a memoized component whose props are primitives, as a real app keeps
   * list rows: a cell that did not change is not re-rendered, so what a commit costs is what changed.
   * The baseline fixture re-renders every cell on every update; that stays the default.
   */
  memoCells?: boolean;
  /**
   * `paint` mode with `only`: lay the cells out in memoized rows of this many cells under one column,
   * so no parent has more than `rowSize` (or `count / rowSize`) children. A one-cell change then
   * re-renders one row; what it costs follows the fan-out along its path, not the total cell count.
   */
  rowSize?: number;
}

interface CellProps {
  index: number;
  background: NonNullable<Style['backgroundColor']>;
  height: number;
  classes: string | undefined;
  padding: number;
  minHeight: number | undefined;
  label: string | undefined;
}

/** One fixture cell. Identical output to the inline cells below; only the render boundary differs. */
const MemoCell = memo(function MemoCell({ index, background, height, classes, padding, minHeight, label }: CellProps) {
  return (
    <View
      testID={`bench-cell-${index}`}
      className={classes}
      style={classes !== undefined ? { flexShrink: 0, height } : {
        backgroundColor: background,
        padding,
        flexShrink: 0,
        ...(minHeight !== undefined ? { minHeight } : { height }),
      }}
    >
      {label !== undefined && <Text className="text-xs text-slate-700">{label}</Text>}
    </View>
  );
});

interface RowProps {
  firstIndex: number;
  size: number;
  /** The one cell of this row that changes colour, if any; other rows receive `undefined` always. */
  updatedCell: number | undefined;
  height: number;
}

/** A memoized row of plain cells in a grid, for the bounded fan-out fixture. */
const MemoRow = memo(function MemoRow({ firstIndex, size, updatedCell, height }: RowProps) {
  return (
    <View
      testID={`bench-row-${firstIndex}`}
      style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: GRID_GAP, flexShrink: 0 }}
    >
      {Array.from({ length: size }, (_, offset) => {
        const index = firstIndex + offset;
        return (
          <MemoCell
            key={index}
            index={index}
            background={updatedCell === index ? UPDATED_COLOR : BASE_COLOR}
            height={height}
            classes={undefined}
            padding={CELL_PADDING}
            minHeight={undefined}
            label={undefined}
          />
        );
      })}
    </View>
  );
});

/** React commits of the fixture, for the baseline scenarios: a hover or a resize must cause none. */
const counters = { commits: 0 };
Reflect.set(globalThis, 'godotBenchmarkCounters', counters);

const GRID_COLUMNS = 10;
const GRID_GAP = 4;
const CELL_PADDING = 4;
const BASE_CELL_HEIGHT = 28;
const LAYOUT_HEIGHT_DELTA = 8;
const TEXT_CELL_MIN_HEIGHT = 48;
const UPDATE_PHASE_COUNT = 2;
const BASE_COLOR = '#e0e7ff';
const UPDATED_COLOR = '#d1fae5';
const HOVER_CELL_CLASSES = 'bg-indigo-100 hover:bg-emerald-100';
const RESPONSIVE_CELL_CLASSES = 'p-1 md:p-2 bg-indigo-100 md:bg-emerald-100';

/**
 * Synthetic, deliberately uniform fixture rather than a representative app.
 * Every cell is mounted through React and remains part of native layout. The
 * native viewport clips cells below the fold; no fixture cell is virtualized.
 * Each update targets all requested cells, retaining their keys and ownership.
 * `text` mode changes actual shaped copy; paint changes no layout property.
 */
export function BenchmarkApp({ count, text, phase, mode, only, memoCells = false, rowSize }: BenchmarkProps) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Benchmark count must be a nonnegative safe integer');
  if (!Number.isSafeInteger(phase) || phase < 0) throw new Error('Benchmark phase must be a nonnegative safe integer');
  if (mode === 'text' && !text) throw new Error('Text benchmark updates require text cells');
  if ((mode === 'hover' || mode === 'responsive') && text) throw new Error('Variant benchmark cells are plain boxes');
  if (only !== undefined && (mode !== 'paint' || !Number.isSafeInteger(only) || only < 0 || only >= count)) {
    throw new Error('Benchmark `only` must name one cell and applies to paint mode');
  }
  if (rowSize !== undefined && (!Number.isSafeInteger(rowSize) || rowSize < 1 || mode !== 'paint' || text || only === undefined)) {
    throw new Error('Benchmark `rowSize` is a positive integer and applies to plain paint mode with `only`');
  }
  const alternate = phase % UPDATE_PHASE_COUNT === 1;
  const height = BASE_CELL_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0);
  const variantClasses = mode === 'hover' ? HOVER_CELL_CLASSES : mode === 'responsive' ? RESPONSIVE_CELL_CLASSES : undefined;
  const cellBackground = (index: number) =>
    mode === 'paint' && alternate && (only === undefined || only === index) ? UPDATED_COLOR : BASE_COLOR;

  if (rowSize !== undefined) {
    const updated = alternate ? only : undefined;
    const rowCount = Math.ceil(count / rowSize);
    return (
      <Profiler id="bench" onRender={() => { counters.commits += 1; }}>
        <View testID="bench-root" className="w-full bg-slate-50 p-4 gap-3 shrink-0">
          <Text testID="bench-status" className="text-sm text-slate-700">
            Benchmark fixture · {count} cells · plain boxes · rows of {rowSize}
          </Text>
          <View testID="bench-grid" style={{ display: 'flex', flexDirection: 'column', gap: GRID_GAP, flexShrink: 0 }}>
            {Array.from({ length: rowCount }, (_, row) => {
              const firstIndex = row * rowSize;
              const size = Math.min(rowSize, count - firstIndex);
              const inRow = updated !== undefined && updated >= firstIndex && updated < firstIndex + size;
              return (
                <MemoRow key={row} firstIndex={firstIndex} size={size} updatedCell={inRow ? updated : undefined} height={height} />
              );
            })}
          </View>
        </View>
      </Profiler>
    );
  }

  return (
    <Profiler id="bench" onRender={() => { counters.commits += 1; }}>
      <View testID="bench-root" className="w-full bg-slate-50 p-4 gap-3 shrink-0">
        <Text testID="bench-status" className="text-sm text-slate-700">
          Benchmark fixture · {count} cells · {text ? 'shaped text' : 'plain boxes'} · {mode}
        </Text>
        <View testID="bench-grid" style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: GRID_GAP, flexShrink: 0 }}>
          {memoCells ? Array.from({ length: count }, (_, index) => (
            <MemoCell
              key={index}
              index={index}
              background={cellBackground(index)}
              height={height}
              classes={variantClasses}
              padding={CELL_PADDING}
              minHeight={text ? TEXT_CELL_MIN_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0) : undefined}
              label={text ? (mode === 'text' && alternate ? `Updated cell ${index}: native text wraps across its available width.` : `Cell ${index}: native text.`) : undefined}
            />
          )) : Array.from({ length: count }, (_, index) => (
            <View
              key={index}
              testID={`bench-cell-${index}`}
              className={variantClasses}
              style={variantClasses !== undefined ? { flexShrink: 0, height } : {
                backgroundColor: cellBackground(index),
                padding: CELL_PADDING,
                flexShrink: 0,
                ...(text ? { minHeight: TEXT_CELL_MIN_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0) } : { height }),
              }}
            >
              {text && (
                <Text className="text-xs text-slate-700">
                  {mode === 'text' && alternate ? `Updated cell ${index}: native text wraps across its available width.` : `Cell ${index}: native text.`}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </Profiler>
  );
}
