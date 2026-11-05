import { Profiler } from 'react';
import { Text, View } from 'godot-react-ui';

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
}

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
export function BenchmarkApp({ count, text, phase, mode, only }: BenchmarkProps) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Benchmark count must be a nonnegative safe integer');
  if (!Number.isSafeInteger(phase) || phase < 0) throw new Error('Benchmark phase must be a nonnegative safe integer');
  if (mode === 'text' && !text) throw new Error('Text benchmark updates require text cells');
  if ((mode === 'hover' || mode === 'responsive') && text) throw new Error('Variant benchmark cells are plain boxes');
  if (only !== undefined && (mode !== 'paint' || !Number.isSafeInteger(only) || only < 0 || only >= count)) {
    throw new Error('Benchmark `only` must name one cell and applies to paint mode');
  }
  const alternate = phase % UPDATE_PHASE_COUNT === 1;
  const height = BASE_CELL_HEIGHT + (mode === 'layout' && alternate ? LAYOUT_HEIGHT_DELTA : 0);
  const variantClasses = mode === 'hover' ? HOVER_CELL_CLASSES : mode === 'responsive' ? RESPONSIVE_CELL_CLASSES : undefined;
  const cellBackground = (index: number) =>
    mode === 'paint' && alternate && (only === undefined || only === index) ? UPDATED_COLOR : BASE_COLOR;

  return (
    <Profiler id="bench" onRender={() => { counters.commits += 1; }}>
      <View testID="bench-root" className="w-full bg-slate-50 p-4 gap-3 shrink-0">
        <Text testID="bench-status" className="text-sm text-slate-700">
          Benchmark fixture · {count} cells · {text ? 'shaped text' : 'plain boxes'} · {mode}
        </Text>
        <View testID="bench-grid" style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: GRID_GAP, flexShrink: 0 }}>
          {Array.from({ length: count }, (_, index) => (
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
